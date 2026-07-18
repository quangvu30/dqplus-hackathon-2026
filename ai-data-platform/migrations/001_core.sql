-- 001_core.sql — entities, relationship graph, artifacts, matches
-- Spec §5.1 + §14 refinements (R6 artifact uniqueness, R9 slug ids, R10 trace_id, R11 dst_name/dst_resolved).
-- pgvector NOT required for v1 (LlmJudgeMatcher); the embedding column lands with EmbeddingMatcher later.

-- unified startups + partners
CREATE TABLE IF NOT EXISTS entities (
  id          TEXT PRIMARY KEY,                 -- R9: deterministic slug {type}:{slug(name)}
  type        TEXT NOT NULL,                    -- startup | investor | corporation | university | research_institution
  name        TEXT NOT NULL,
  profile     JSONB NOT NULL DEFAULT '{}'::jsonb, -- provenance-tracked fields ({value, source_url, confidence})
  status      TEXT NOT NULL DEFAULT 'seeded',   -- seeded | enriching | ready
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- relationships graph (captured from enrichment output from day 1; v1 matcher ignores it,
-- GraphRagMatcher + connection-viz consume it later)
CREATE TABLE IF NOT EXISTS edges (
  id            BIGSERIAL PRIMARY KEY,
  src_id        TEXT NOT NULL,                  -- entity id
  dst_id        TEXT NOT NULL,                  -- resolved entity id (may equal a slug not yet onboarded)
  dst_name      TEXT,                           -- R11: raw target name before resolution
  dst_resolved  BOOLEAN NOT NULL DEFAULT FALSE, -- R11: true once dst_name maps to an onboarded entity id
  kind          TEXT NOT NULL,                  -- invested_in | founded_by_alumni_of | pilot_with | co_invested | same_sector
  source_url    TEXT,                           -- provenance (same discipline as profiles)
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (src_id, dst_id, kind)
);

-- raw agent outputs (blackboard cells / audit trail)
CREATE TABLE IF NOT EXISTS artifacts (
  id          BIGSERIAL PRIMARY KEY,
  saga_id     TEXT NOT NULL,
  step        TEXT NOT NULL,
  entity_id   TEXT,                             -- subject entity (informational)
  target_id   TEXT NOT NULL DEFAULT '',         -- R6: per-entity / per-match target; '' for whole-saga steps
  trace_id    TEXT,                             -- R10
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (saga_id, step, target_id)             -- R6: upsert latest-wins; reclaim/double-run cannot fork rows
);

-- domain results
CREATE TABLE IF NOT EXISTS matches (
  id             BIGSERIAL PRIMARY KEY,
  startup_id     TEXT REFERENCES entities(id),
  partner_id     TEXT REFERENCES entities(id),
  composite      REAL,
  semantic       REAL,
  sector_overlap REAL,
  rationale_en   TEXT,
  rationale_vi   TEXT,
  draft_en       TEXT,
  draft_vi       TEXT,
  trace_id       TEXT,                          -- R10
  status         TEXT NOT NULL DEFAULT 'ranked', -- ranked | draft_ready
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (startup_id, partner_id)
);
