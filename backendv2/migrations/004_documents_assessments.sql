CREATE TABLE financial_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename     TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   INT NOT NULL,
  storage_path TEXT NOT NULL,
  parsed_text  TEXT,
  status       TEXT NOT NULL DEFAULT 'uploaded'
               CHECK (status IN ('uploaded','parsed','assessed','failed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_findocs_profile ON financial_documents (profile_id, created_at DESC);

CREATE TABLE assessments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES financial_documents(id) ON DELETE SET NULL,
  summary_en  TEXT NOT NULL,
  summary_vi  TEXT NOT NULL,
  strengths   JSONB NOT NULL DEFAULT '[]',
  risks       JSONB NOT NULL DEFAULT '[]',
  key_metrics JSONB NOT NULL DEFAULT '{}',
  confidence  TEXT,
  model       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessments_profile ON assessments (profile_id, created_at DESC);
