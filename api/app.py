"""FastAPI read API + dashboard (spec §8, §13, Phase 3).

Read-only projections over Postgres for the dashboard, plus POST /runs to trigger
an outreach run. Endpoints (spec §8): /entities /matches /sagas /jobs /events
/workers /metrics /costs + POST /runs. The supervisor (python -m spine.supervisor
--drain) drains any jobs this enqueues; the API itself never touches agents.

Run: uv run uvicorn api.app:app --port 8000
"""
from __future__ import annotations

import json
import uuid
from contextlib import asynccontextmanager
from decimal import Decimal
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from spine import outreach, telemetry
from spine.store import Store

log = telemetry.get_logger("api")
_DASHBOARD = Path(__file__).resolve().parent.parent / "dashboard" / "index.html"

# Partner entity types (spec §5.1). Everything else is a startup.
PARTNER_TYPES = ["investor", "corporation", "university", "research_institution"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    telemetry.configure()
    app.state.store = await Store.connect(min_size=1, max_size=5)
    log.info("api_started")
    try:
        yield
    finally:
        await app.state.store.close()


app = FastAPI(title="Deal-flow Matchmaker", lifespan=lifespan)

# Permissive CORS: read-only API, no cookie auth — wildcard origin is safe only with
# allow_credentials=False (browsers reject "*" + credentials).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)


def _pool(app: FastAPI):
    return app.state.store.pool


def _jsonable(v: Any) -> Any:
    """Normalize asyncpg row values: Decimal -> float, jsonb text -> parsed."""
    if isinstance(v, Decimal):
        return float(v)
    return v


def _row(record) -> dict:
    return {k: _jsonable(v) for k, v in dict(record).items()}


def _parse_jsonb(d: dict, *fields: str) -> dict:
    for f in fields:
        if isinstance(d.get(f), str):
            try:
                d[f] = json.loads(d[f])
            except (json.JSONDecodeError, TypeError):
                pass
    return d


# --------------------------------------------------------------------------- #
# dashboard
# --------------------------------------------------------------------------- #

@app.get("/", include_in_schema=False)
async def dashboard():
    if not _DASHBOARD.exists():
        raise HTTPException(404, "dashboard not built")
    return FileResponse(_DASHBOARD)


# --------------------------------------------------------------------------- #
# entities
# --------------------------------------------------------------------------- #

@app.get("/entities")
async def entities(type: str | None = Query(None), status: str | None = Query(None)):
    clauses, args = [], []
    if type:
        args.append(type)
        clauses.append(f"type = ${len(args)}")
    if status:
        args.append(status)
        clauses.append(f"status = ${len(args)}")
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = await _pool(app).fetch(
        "SELECT e.id, e.type, e.name, e.status, "
        "(SELECT count(*) FROM matches m WHERE m.startup_id = e.id OR m.partner_id = e.id) "
        "AS match_count "
        f"FROM entities e {where} ORDER BY e.type, e.name",
        *args,
    )
    return [_row(r) for r in rows]


@app.get("/entities/{entity_id}")
async def entity(entity_id: str):
    pool = _pool(app)
    row = await pool.fetchrow(
        "SELECT id, type, name, status, profile, created_at, updated_at "
        "FROM entities WHERE id = $1",
        entity_id,
    )
    if row is None:
        raise HTTPException(404, "entity not found")
    # Relationship graph (§5.1 edges): outgoing from this entity + incoming resolved ones,
    # with the counterpart's display name when it has been onboarded.
    edge_rows = await pool.fetch(
        "SELECT e.src_id, e.dst_id, e.dst_name, e.dst_resolved, e.kind, e.source_url, "
        "s.name AS src_name, d.name AS dst_entity_name "
        "FROM edges e LEFT JOIN entities s ON s.id = e.src_id "
        "LEFT JOIN entities d ON d.id = e.dst_id AND e.dst_resolved "
        "WHERE e.src_id = $1 OR (e.dst_id = $1 AND e.dst_resolved) "
        "ORDER BY e.kind",
        entity_id,
    )
    out = _parse_jsonb(_row(row), "profile")
    out["edges"] = [
        {**_row(r), "direction": "out" if r["src_id"] == entity_id else "in"}
        for r in edge_rows
    ]
    return out


# --------------------------------------------------------------------------- #
# matches
# --------------------------------------------------------------------------- #

@app.get("/matches")
async def matches(startup_id: str | None = Query(None),
                  partner_id: str | None = Query(None),
                  status: str | None = Query(None)):
    """Ranked matches, composite-desc. Filter by startup_id for a startup's ranked partners,
    or by partner_id for the reverse view (startups that matched to a partner) — A4."""
    clauses, args = [], []
    if startup_id:
        args.append(startup_id)
        clauses.append(f"m.startup_id = ${len(args)}")
    if partner_id:
        args.append(partner_id)
        clauses.append(f"m.partner_id = ${len(args)}")
    if status:
        args.append(status)
        clauses.append(f"m.status = ${len(args)}")
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = await _pool(app).fetch(
        "SELECT m.id, m.startup_id, s.name AS startup_name, "
        "m.partner_id, p.name AS partner_name, p.type AS partner_type, "
        "m.composite, m.semantic, m.sector_overlap, m.rationale_en, m.rationale_vi, "
        "m.draft_en, m.draft_vi, m.status, m.created_at "
        "FROM matches m LEFT JOIN entities p ON p.id = m.partner_id "
        "LEFT JOIN entities s ON s.id = m.startup_id "
        f"{where} ORDER BY m.startup_id, m.composite DESC NULLS LAST",
        *args,
    )
    return [_row(r) for r in rows]


@app.get("/matches_v2")
async def matches_v2(startup_id: str | None = Query(None),
                     partner_id: str | None = Query(None),
                     status: str | None = Query(None)):
    """Dry-run matches from the FPT-hosted re-rank (matches_v2). Same shape as /matches
    plus a `model` column; no draft columns. Filter by startup_id or partner_id."""
    clauses, args = [], []
    if startup_id:
        args.append(startup_id)
        clauses.append(f"m.startup_id = ${len(args)}")
    if partner_id:
        args.append(partner_id)
        clauses.append(f"m.partner_id = ${len(args)}")
    if status:
        args.append(status)
        clauses.append(f"m.status = ${len(args)}")
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = await _pool(app).fetch(
        "SELECT m.id, m.startup_id, s.name AS startup_name, "
        "m.partner_id, p.name AS partner_name, p.type AS partner_type, "
        "m.composite, m.semantic, m.sector_overlap, m.rationale_en, m.rationale_vi, "
        "m.model, m.status, m.created_at "
        "FROM matches_v2 m LEFT JOIN entities p ON p.id = m.partner_id "
        "LEFT JOIN entities s ON s.id = m.startup_id "
        f"{where} ORDER BY m.startup_id, m.composite DESC NULLS LAST",
        *args,
    )
    return [_row(r) for r in rows]


# --------------------------------------------------------------------------- #
# sagas / jobs / events
# --------------------------------------------------------------------------- #

@app.get("/sagas")
async def sagas(type: str | None = Query(None)):
    clauses, args = [], []
    if type:
        args.append(type)
        clauses.append(f"type = ${len(args)}")
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = await _pool(app).fetch(
        "SELECT saga_id, type, subject_id, current_step, status, trace_id, updated_at "
        f"FROM saga_instances {where} ORDER BY updated_at DESC",
        *args,
    )
    return [_row(r) for r in rows]


@app.get("/jobs")
async def jobs(status: str | None = Query(None), saga_id: str | None = Query(None)):
    clauses, args = [], []
    if status:
        args.append(status)
        clauses.append(f"status = ${len(args)}")
    if saga_id:
        args.append(saga_id)
        clauses.append(f"saga_id = ${len(args)}")
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = await _pool(app).fetch(
        "SELECT id, saga_id, stage, target_id, agent, status, attempts, leased_by, "
        "lease_expires_at, queued_at, leased_at, done_at "
        f"FROM jobs {where} ORDER BY id DESC LIMIT 200",
        *args,
    )
    return [_row(r) for r in rows]


@app.get("/events")
async def events(saga_id: str | None = Query(None), limit: int = Query(50, le=500)):
    clauses, args = [], []
    if saga_id:
        args.append(saga_id)
        clauses.append(f"saga_id = ${len(args)}")
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    args.append(limit)
    rows = await _pool(app).fetch(
        "SELECT id, saga_id, seq, kind, trace_id, payload, created_at "
        f"FROM events {where} ORDER BY id DESC LIMIT ${len(args)}",
        *args,
    )
    return [_parse_jsonb(_row(r), "payload") for r in rows]


@app.get("/workers")
async def workers():
    rows = await _pool(app).fetch(
        "SELECT worker_id, agent_type, runtime, pid, status, current_job_id, "
        "jobs_since_reset, restart_count, started_at, last_heartbeat_at "
        "FROM workers ORDER BY started_at DESC LIMIT 100"
    )
    return [_row(r) for r in rows]


# --------------------------------------------------------------------------- #
# observability: /metrics (pool + queue health) and /costs (llm_usage aggregates)
# --------------------------------------------------------------------------- #

@app.get("/metrics")
async def metrics():
    """§13.3 — pool health (workers by status) + queue health (jobs by stage/status)."""
    pool = _pool(app)
    worker_rows = await pool.fetch(
        "SELECT status, count(*) AS n FROM workers GROUP BY status"
    )
    job_rows = await pool.fetch(
        "SELECT stage, status, count(*) AS n FROM jobs GROUP BY stage, status "
        "ORDER BY stage, status"
    )
    saga_rows = await pool.fetch(
        "SELECT type, status, count(*) AS n FROM saga_instances GROUP BY type, status"
    )
    dead = await pool.fetchval("SELECT count(*) FROM jobs WHERE status = 'dead'")
    ready = await pool.fetchval("SELECT count(*) FROM jobs WHERE status = 'ready'")
    leased = await pool.fetchval("SELECT count(*) FROM jobs WHERE status = 'leased'")
    return {
        "workers": {r["status"]: r["n"] for r in worker_rows},
        "jobs_by_stage_status": [_row(r) for r in job_rows],
        "queue": {"ready": ready, "leased": leased, "dead_letter": dead},
        "sagas": [_row(r) for r in saga_rows],
    }


@app.get("/costs")
async def costs():
    """§13.2 — running LLM cost total + per-agent/saga/model breakdown, and the two
    headline demo numbers: cost-per-onboarded-entity and cost-per-match."""
    pool = _pool(app)
    totals = await pool.fetchrow(
        "SELECT COALESCE(SUM(cost_usd),0) AS cost_usd, COALESCE(SUM(tokens_in),0) AS tokens_in, "
        "COALESCE(SUM(tokens_out),0) AS tokens_out, count(*) AS turns FROM llm_usage"
    )
    by_agent = await pool.fetch(
        "SELECT agent, runtime, COALESCE(SUM(cost_usd),0) AS cost_usd, "
        "COALESCE(SUM(tokens_in),0) AS tokens_in, COALESCE(SUM(tokens_out),0) AS tokens_out, "
        "count(*) AS turns FROM llm_usage GROUP BY agent, runtime ORDER BY cost_usd DESC"
    )
    by_model = await pool.fetch(
        "SELECT model, COALESCE(SUM(cost_usd),0) AS cost_usd, count(*) AS turns "
        "FROM llm_usage GROUP BY model ORDER BY cost_usd DESC"
    )
    by_saga = await pool.fetch(
        "SELECT saga_id, COALESCE(SUM(cost_usd),0) AS cost_usd, count(*) AS turns "
        "FROM llm_usage GROUP BY saga_id ORDER BY cost_usd DESC LIMIT 50"
    )
    ready_entities = await pool.fetchval(
        "SELECT count(*) FROM entities WHERE status = 'ready'"
    )
    match_count = await pool.fetchval("SELECT count(*) FROM matches")
    total_cost = float(totals["cost_usd"])
    return {
        "total": {
            "cost_usd": total_cost,
            "tokens_in": totals["tokens_in"],
            "tokens_out": totals["tokens_out"],
            "turns": totals["turns"],
        },
        "cost_per_ready_entity": round(total_cost / ready_entities, 6) if ready_entities else None,
        "cost_per_match": round(total_cost / match_count, 6) if match_count else None,
        "by_agent": [_row(r) for r in by_agent],
        "by_model": [_row(r) for r in by_model],
        "by_saga": [_row(r) for r in by_saga],
    }


# --------------------------------------------------------------------------- #
# POST /runs — trigger an outreach run (R4)
# --------------------------------------------------------------------------- #

@app.post("/runs")
async def create_run(body: dict | None = None):
    """Trigger outreach for one startup (`startup_id`) or every ready startup (`all`).
    Enqueues jobs; the running supervisor (--drain) advances them. Returns the trace_id
    and the sagas started. Idempotent on saga/job keys — re-triggering is safe."""
    body = body or {}
    store: Store = app.state.store
    pool = store.pool
    trace_id = "run:" + uuid.uuid4().hex[:12]

    if body.get("all"):
        rows = await pool.fetch(
            "SELECT id FROM entities WHERE type = 'startup' AND status = 'ready' ORDER BY id"
        )
        ids = [r["id"] for r in rows]
    elif body.get("startup_id"):
        ids = [body["startup_id"]]
    else:
        raise HTTPException(400, "pass {\"startup_id\": <id>} or {\"all\": true}")

    if not ids:
        raise HTTPException(409, "no ready startups to run")

    sagas_started = []
    for sid in ids:
        saga_id = await outreach.start(store, sid, trace_id=trace_id)
        sagas_started.append(saga_id)
    log.info("run_triggered", trace_id=trace_id, count=len(sagas_started))
    return JSONResponse(
        status_code=202,
        content={"trace_id": trace_id, "sagas": sagas_started, "count": len(sagas_started)},
    )
