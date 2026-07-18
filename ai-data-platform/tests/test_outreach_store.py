"""Outreach store transitions against real Postgres (R5, R6).

  - upsert_match idempotency + draft/status updates
  - complete_and_fanout: job done + event + saga fold + per-match draft fan-out
  - reject_and_rearm: verify->draft retry re-arms the draft sub-job with feedback
  - dead_letter: sub-jobs marked dead once the retry budget exhausts
"""
import json


async def _ready_entity(store, eid, type_):
    await store.upsert_entity(eid, type_, eid, profile={}, status="ready")


async def test_upsert_match_and_draft_status(store, saga_id):
    su = f"startup:{saga_id}"
    pa = f"investor:{saga_id}"
    await _ready_entity(store, su, "startup")
    await _ready_entity(store, pa, "investor")

    await store.upsert_match(startup_id=su, partner_id=pa, composite=80.0, semantic=0.7,
                             sector_overlap=0.5, rationale_en="en", rationale_vi="vi",
                             trace_id="t", status="ranked")
    await store.upsert_match(startup_id=su, partner_id=pa, composite=88.0, semantic=0.8,
                             sector_overlap=0.6, rationale_en="en2", rationale_vi="vi2",
                             trace_id="t", status="ranked")
    m = await store.get_match(su, pa)
    assert m["composite"] == 88.0 and m["rationale_en"] == "en2"  # latest rank wins

    await store.set_match_draft(su, pa, "hello", "xin chào")
    await store.set_match_status(su, pa, "draft_ready")
    m = await store.get_match(su, pa)
    assert m["draft_en"] == "hello" and m["draft_vi"] == "xin chào"
    assert m["status"] == "draft_ready"

    n = await store.pool.fetchval(
        "SELECT count(*) FROM matches WHERE startup_id=$1 AND partner_id=$2", su, pa)
    assert n == 1  # UNIQUE(startup_id, partner_id)


async def test_complete_and_fanout_fans_out_drafts(store, saga_id):
    await store.create_saga(saga_id, "outreach", "startup:x", current_step="match")
    match_job = await store.enqueue_job(saga_id, "match", target_id="startup:x", agent="matcher")

    await store.complete_and_fanout(
        job_id=match_job, saga_id=saga_id, event_kind="MatchesRanked",
        event_payload={"partners": ["investor:a", "investor:b"]}, saga_step="draft",
        next_jobs=[{"stage": "draft", "target_id": "investor:a", "agent": "drafter"},
                   {"stage": "draft", "target_id": "investor:b", "agent": "drafter"}],
        trace_id="t",
    )
    mj = await store.pool.fetchrow("SELECT status FROM jobs WHERE id=$1", match_job)
    assert mj["status"] == "done"
    drafts = await store.pool.fetch(
        "SELECT target_id, status, agent FROM jobs WHERE saga_id=$1 AND stage='draft' ORDER BY target_id",
        saga_id)
    assert [d["target_id"] for d in drafts] == ["investor:a", "investor:b"]
    assert all(d["status"] == "ready" and d["agent"] == "drafter" for d in drafts)
    ev = await store.pool.fetchrow(
        "SELECT kind FROM events WHERE saga_id=$1 ORDER BY seq DESC LIMIT 1", saga_id)
    assert ev["kind"] == "MatchesRanked"
    saga = await store.get_saga(saga_id)
    assert saga["current_step"] == "draft"


async def test_reject_and_rearm_retry_edge(store, saga_id):
    await store.create_saga(saga_id, "outreach", "startup:x", current_step="verify")
    draft_job = await store.enqueue_job(saga_id, "draft", target_id="investor:a", agent="drafter")
    verify_job = await store.enqueue_job(saga_id, "verify", target_id="investor:a", agent="verifier")
    # simulate the verify job having been leased/run
    await store.acquire_job("w1", ["verify"], lease_seconds=120)

    feedback = {"issues": ["invented a meeting time"]}
    await store.reject_and_rearm(verify_job_id=verify_job, draft_job_id=draft_job,
                                 saga_id=saga_id, feedback=feedback, trace_id="t")

    dj = await store.pool.fetchrow("SELECT status, verify_feedback FROM jobs WHERE id=$1", draft_job)
    assert dj["status"] == "ready"                            # re-armed
    assert json.loads(dj["verify_feedback"])["issues"] == ["invented a meeting time"]
    vj = await store.pool.fetchrow("SELECT status FROM jobs WHERE id=$1", verify_job)
    assert vj["status"] == "done"                             # this verify attempt closed
    ev = await store.pool.fetchrow(
        "SELECT kind FROM events WHERE saga_id=$1 ORDER BY seq DESC LIMIT 1", saga_id)
    assert ev["kind"] == "VerifyRejected"

    # a re-armed draft that re-fans-out verify flips the done verify back to ready
    await store.complete_and_fanout(
        job_id=draft_job, saga_id=saga_id, event_kind="DraftReady", event_payload={},
        saga_step="verify",
        next_jobs=[{"stage": "verify", "target_id": "investor:a", "agent": "verifier"}],
        trace_id="t")
    vj = await store.pool.fetchrow("SELECT status FROM jobs WHERE id=$1", verify_job)
    assert vj["status"] == "ready"


async def test_dead_letter_marks_subjobs_dead(store, saga_id):
    await store.create_saga(saga_id, "outreach", "startup:x", current_step="verify")
    draft_job = await store.enqueue_job(saga_id, "draft", target_id="investor:a")
    verify_job = await store.enqueue_job(saga_id, "verify", target_id="investor:a")

    await store.dead_letter(job_ids=[draft_job, verify_job], saga_id=saga_id,
                            event_payload={"partner_id": "investor:a"}, trace_id="t")
    rows = await store.pool.fetch(
        "SELECT status FROM jobs WHERE id = ANY($1::bigint[])", [draft_job, verify_job])
    assert all(r["status"] == "dead" for r in rows)
    ev = await store.pool.fetchrow(
        "SELECT kind FROM events WHERE saga_id=$1 ORDER BY seq DESC LIMIT 1", saga_id)
    assert ev["kind"] == "DraftDeadLettered"


async def test_count_active_jobs_and_saga_done(store, saga_id):
    await store.create_saga(saga_id, "outreach", "startup:x", current_step="verify")
    await store.enqueue_job(saga_id, "verify", target_id="investor:a")
    assert await store.count_active_jobs(saga_id, ["filter", "match", "draft", "verify"]) == 1
    await store.pool.execute("UPDATE jobs SET status='done' WHERE saga_id=$1", saga_id)
    assert await store.count_active_jobs(saga_id, ["filter", "match", "draft", "verify"]) == 0
    await store.set_saga_status(saga_id, "done", current_step="verify")
    saga = await store.get_saga(saga_id)
    assert saga["status"] == "done"
