"""Store unit tests against real Postgres (spec §5.3, R5, R6, R11).

  - lease acquire (SKIP LOCKED) / expiry / reclaim
  - job idempotency key UNIQUE(saga_id, stage, target_id)
  - artifact idempotency UNIQUE(saga_id, step, target_id) latest-wins
  - edges upsert idempotency UNIQUE(src_id, dst_id, kind)
"""
import uuid

import asyncpg
import pytest


async def test_lease_acquire_skip_locked(store, saga_id):
    # Unique stage isolates acquire_job (not saga-scoped) from leftover ready jobs.
    stage = "enrich_" + uuid.uuid4().hex[:8]
    jid = await store.enqueue_job(saga_id, stage, target_id="startup:acme")
    assert jid is not None

    job = await store.acquire_job("w1", [stage], lease_seconds=120)
    assert job is not None and job["id"] == jid
    assert job["status"] == "leased"
    assert job["leased_by"] == "w1"
    assert job["attempts"] == 1
    assert job["lease_expires_at"] is not None

    # a second worker cannot re-lease the same (now leased) job
    again = await store.acquire_job("w2", [stage], lease_seconds=120)
    assert again is None


async def test_lease_expiry_and_reclaim(store, saga_id):
    # Unique stage so acquire_job (not saga-scoped) only ever finds this test's job
    # on the shared DB — otherwise it grabs leftover ready jobs from prior runs.
    stage = "extract_" + uuid.uuid4().hex[:8]
    jid = await store.enqueue_job(saga_id, stage, target_id="startup:acme")
    # lease with an already-expired window
    job = await store.acquire_job("w1", [stage], lease_seconds=-1)
    assert job["id"] == jid and job["status"] == "leased"

    reclaimed = await store.reclaim_expired_leases()
    assert reclaimed >= 1

    row = await store.pool.fetchrow("SELECT status, leased_by FROM jobs WHERE id=$1", jid)
    assert row["status"] == "ready"
    assert row["leased_by"] is None

    # reclaimed job is leasable again (recovery)
    job2 = await store.acquire_job("w2", [stage], lease_seconds=120)
    assert job2["id"] == jid and job2["attempts"] == 2


async def test_job_idempotency_key(store, saga_id):
    first = await store.enqueue_job(saga_id, "draft", target_id="investor:mekong")
    dup = await store.enqueue_job(saga_id, "draft", target_id="investor:mekong")
    assert first is not None
    assert dup is None  # ON CONFLICT DO NOTHING

    # different target_id under same saga+stage is a distinct job (R5 per-match)
    other = await store.enqueue_job(saga_id, "draft", target_id="investor:dovc")
    assert other is not None and other != first

    n = await store.pool.fetchval(
        "SELECT count(*) FROM jobs WHERE saga_id=$1 AND stage='draft'", saga_id
    )
    assert n == 2


async def test_artifact_upsert_latest_wins(store, saga_id):
    await store.record_artifact(saga_id, "enrich", {"v": 1}, target_id="startup:acme")
    await store.record_artifact(saga_id, "enrich", {"v": 2}, target_id="startup:acme")

    rows = await store.pool.fetch(
        "SELECT payload FROM artifacts WHERE saga_id=$1 AND step='enrich' AND target_id=$2",
        saga_id, "startup:acme",
    )
    assert len(rows) == 1  # R6: no ambiguous forked rows
    import json
    assert json.loads(rows[0]["payload"])["v"] == 2  # latest wins


async def test_edges_upsert_idempotent(store):
    import uuid
    src = "startup:acme_" + uuid.uuid4().hex[:6]
    dst = "investor:mekong_" + uuid.uuid4().hex[:6]
    await store.upsert_edge(src, dst, "invested_in",
                            dst_name="Mekong Capital", source_url="http://a")
    await store.upsert_edge(src, dst, "invested_in",
                            dst_name="Mekong Capital", dst_resolved=True,
                            source_url="http://b")

    rows = await store.pool.fetch(
        "SELECT source_url, dst_resolved FROM edges WHERE src_id=$1 AND dst_id=$2 AND kind=$3",
        src, dst, "invested_in",
    )
    assert len(rows) == 1  # no duplicate relationship
    assert rows[0]["source_url"] == "http://b"  # updated
    assert rows[0]["dst_resolved"] is True


async def test_event_seq_unique(store, saga_id):
    await store.record_event(saga_id, 1, "EntityReady", {"ok": True})
    await store.record_event(saga_id, 1, "EntityReady", {"ok": False})  # dup seq ignored
    n = await store.pool.fetchval(
        "SELECT count(*) FROM events WHERE saga_id=$1 AND seq=1", saga_id
    )
    assert n == 1
