-- 003_control_plane.sql — worker registry + LLM cost ledger
-- Spec §5.1 (workers) + §13.2 (llm_usage).

-- control plane: worker registry
CREATE TABLE IF NOT EXISTS workers (
  worker_id         TEXT PRIMARY KEY,
  agent_type        TEXT NOT NULL,
  runtime           TEXT NOT NULL,              -- pi | feynman
  pid               INT,
  boot_epoch        TEXT NOT NULL,              -- supervisor boot id (orphan detection)
  status            TEXT NOT NULL,              -- starting | idle | busy | draining | dead
  current_job_id    BIGINT,
  jobs_since_reset  INT NOT NULL DEFAULT 0,
  restart_count     INT NOT NULL DEFAULT 0,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMPTZ
);

-- LLM cost ledger (§13.2): one row per agent turn, captured from turn_end.message.usage
CREATE TABLE IF NOT EXISTS llm_usage (
  id           BIGSERIAL PRIMARY KEY,
  trace_id     TEXT,
  saga_id      TEXT,
  job_id       BIGINT,
  agent        TEXT NOT NULL,
  runtime      TEXT,
  model        TEXT,
  tokens_in    INT,
  tokens_out   INT,
  cache_read   INT,
  cache_write  INT,
  cost_usd     NUMERIC(12,6),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS llm_usage_saga_idx ON llm_usage (saga_id);
