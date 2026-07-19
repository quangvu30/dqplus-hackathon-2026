CREATE TABLE pipeline_jobs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('profile_extraction','financial_assessment')),
  payload     JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','running','done','failed')),
  attempts    INT NOT NULL DEFAULT 0,
  last_error  TEXT,
  run_after   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_claim ON pipeline_jobs (status, run_after);
CREATE INDEX idx_jobs_user ON pipeline_jobs (user_id, created_at DESC);
