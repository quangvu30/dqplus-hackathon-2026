-- 002_orchestration.sql — jobs queue, event log, saga projection
-- Spec §5.1 + §14 refinements (R5 per-match job key + verify_feedback, R10 trace_id, §13.1 per-step timing).

-- commands (the queue)
CREATE TABLE IF NOT EXISTS jobs (
  id               BIGSERIAL PRIMARY KEY,
  saga_id          TEXT NOT NULL,
  stage            TEXT NOT NULL,               -- enrich | extract | link | filter | match | draft | verify
  target_id        TEXT NOT NULL DEFAULT '',    -- R5: entity id (onboarding) or partner_id (per-match draft/verify)
  agent            TEXT,                        -- agent name (null for pure code stages)
  input_ref        JSONB,
  status           TEXT NOT NULL DEFAULT 'ready', -- ready | leased | done | failed | dead
  attempts         INT NOT NULL DEFAULT 0,
  leased_by        TEXT,
  lease_expires_at TIMESTAMPTZ,
  verify_feedback  JSONB,                        -- R5: verify->draft retry feedback carried on the sub-job
  trace_id         TEXT,                         -- R10
  queued_at        TIMESTAMPTZ NOT NULL DEFAULT now(), -- §13.1 per-step timing
  leased_at        TIMESTAMPTZ,
  done_at          TIMESTAMPTZ,
  UNIQUE (saga_id, stage, target_id)             -- R5: per-match idempotency key
);
CREATE INDEX IF NOT EXISTS jobs_status_stage_idx ON jobs (status, stage);

-- append-only event log (source of truth)
CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  saga_id     TEXT NOT NULL,
  seq         INT NOT NULL,
  kind        TEXT NOT NULL,                    -- EntityReady | MatchesRanked | DraftReady | Verified | ...
  trace_id    TEXT,                             -- R10
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (saga_id, seq)
);

-- folded projection (fast queries; rebuildable from events)
CREATE TABLE IF NOT EXISTS saga_instances (
  saga_id       TEXT PRIMARY KEY,
  type          TEXT NOT NULL,                  -- onboarding | outreach
  subject_id    TEXT,                           -- entity/startup id
  current_step  TEXT,
  trace_id      TEXT,                           -- R10: top-level run correlation
  status        TEXT NOT NULL DEFAULT 'running', -- running | done | failed
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
