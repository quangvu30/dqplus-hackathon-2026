require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://mkp-api.fptcloud.com',
});

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM) || 1536;

module.exports = { client, CHAT_MODEL, EMBEDDING_MODEL, EMBEDDING_DIM };
