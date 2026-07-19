CREATE TABLE llm_usage (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID,
  feature    TEXT NOT NULL,
  model      TEXT,
  tokens_in  INT,
  tokens_out INT,
  cost_usd   NUMERIC(12,6),
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_llm_usage_feature ON llm_usage (feature, created_at);
