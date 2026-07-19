-- multilingual-e5-large (FPT Cloud) natively outputs 1024-dim vectors; the
-- OpenAI "dimensions" truncation param used to force 1536 is not supported
-- by this endpoint and was rejected with a 400.
DROP INDEX IF EXISTS idx_extracted_embedding;
ALTER TABLE extracted_profiles ALTER COLUMN embedding TYPE vector(1024);
CREATE INDEX idx_extracted_embedding ON extracted_profiles
  USING hnsw (embedding vector_cosine_ops);
