const pool = require('../../config/db');

// Best-effort LLM usage ledger (never fails the caller).
async function logUsage({ userId = null, feature, model = null, tokensIn = null, tokensOut = null, latencyMs = null }) {
  try {
    await pool.query(
      `INSERT INTO llm_usage (user_id, feature, model, tokens_in, tokens_out, latency_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, feature, model, tokensIn, tokensOut, latencyMs]
    );
  } catch (err) {
    console.error('llm_usage insert failed:', err.message);
  }
}

// Wrap a chat.completions call with timing + usage logging.
async function trackedCompletion(client, params, { userId, feature }) {
  const started = Date.now();
  const completion = await client.chat.completions.create(params);
  logUsage({
    userId,
    feature,
    model: params.model,
    tokensIn: completion.usage?.prompt_tokens ?? null,
    tokensOut: completion.usage?.completion_tokens ?? null,
    latencyMs: Date.now() - started,
  });
  return completion;
}

module.exports = { logUsage, trackedCompletion };
