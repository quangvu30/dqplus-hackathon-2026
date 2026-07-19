require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'unset',
  baseURL: process.env.OPENAI_BASE_URL || 'https://mkp-api.fptcloud.com',
});

const hasKey = Boolean(process.env.OPENAI_API_KEY);
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gemma-4-31B-it';
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'multilingual-e5-large';
const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM) || 1024;

module.exports = { client, hasKey, CHAT_MODEL, EMBEDDING_MODEL, EMBEDDING_DIM };
