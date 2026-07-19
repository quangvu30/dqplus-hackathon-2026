CREATE TABLE extracted_profiles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role               TEXT NOT NULL CHECK (role IN ('founder','investor')),
  attributes         JSONB NOT NULL DEFAULT '{}',
  embedding_text     TEXT NOT NULL,
  embedding          vector(1536) NOT NULL,
  embedding_provider TEXT NOT NULL DEFAULT 'fpt',
  pipeline_version   INT NOT NULL DEFAULT 1,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_extracted_role ON extracted_profiles (role);
CREATE INDEX idx_extracted_embedding ON extracted_profiles
  USING hnsw (embedding vector_cosine_ops);
