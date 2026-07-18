const { client, EMBEDDING_MODEL, EMBEDDING_DIM } = require('../config/openai');

async function embed(text) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIM,
  });
  return res.data[0].embedding;
}

module.exports = { embed };
