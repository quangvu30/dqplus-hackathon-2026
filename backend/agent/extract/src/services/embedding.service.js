const { client, EMBEDDING_MODEL, EMBEDDING_DIM } = require('../config/openai');

const hasKey = Boolean(process.env.OPENAI_API_KEY);

if (!hasKey) {
  console.warn('OPENAI_API_KEY not set — using local feature-hash embeddings (lexical similarity, not semantic)');
}

// Keyless fallback: feature-hashed bag-of-words, L2-normalized. Cosine distance
// between these vectors measures term overlap instead of semantic similarity,
// which keeps the matching pipeline functional without an API key.
function localEmbed(text) {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const tokens = String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  for (const token of tokens) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h >>>= 0;
    vec[(h >>> 1) % EMBEDDING_DIM] += (h & 1) ? 1 : -1;
  }
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / norm);
}

async function embed(text) {
  if (!hasKey) return localEmbed(text);
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIM,
  });
  return res.data[0].embedding;
}

module.exports = { embed };
