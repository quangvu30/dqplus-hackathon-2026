const pgvector = require('pgvector/pg');
const pool = require('../config/db');

async function upsertExtractedProfile({ userId, role, source, sourceUrl, rawInput, attributes, embeddingText, embedding }) {
  const { rows } = await pool.query(
    `INSERT INTO extracted_profiles
       (user_id, role, source, source_url, raw_input, attributes, embedding_text, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id) DO UPDATE SET
       role = EXCLUDED.role,
       source = EXCLUDED.source,
       source_url = EXCLUDED.source_url,
       raw_input = EXCLUDED.raw_input,
       attributes = EXCLUDED.attributes,
       embedding_text = EXCLUDED.embedding_text,
       embedding = EXCLUDED.embedding,
       updated_at = now()
     RETURNING id, user_id, role, source, source_url, attributes, embedding_text, created_at, updated_at`,
    [userId, role, source, sourceUrl || null, rawInput || null, attributes, embeddingText, pgvector.toSql(embedding)]
  );
  return rows[0];
}

async function getExtractedProfile(userId) {
  const { rows } = await pool.query(
    `SELECT id, user_id, role, source, source_url, attributes, embedding_text, created_at, updated_at
     FROM extracted_profiles WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

module.exports = { upsertExtractedProfile, getExtractedProfile };
