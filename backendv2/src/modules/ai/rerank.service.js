/* LLM re-rank of the hybrid top-k — JS port of
 * ai-data-platform/spine/matcher/llm_judge.py (prompt framing + hallucination
 * guards), upgraded from fenced-JSON parsing to strict response_format. */
const { client, hasKey, CHAT_MODEL } = require('../../config/openai');
const rerankSchema = require('./schemas/rerank.schema');
const { trackedCompletion } = require('./usage.service');

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map(); // userId -> { at, key, result }

function buildPrompt(requesterView, candidateViews) {
  return `You are a match analyst for VietNexus, Vietnam's startup-investor matchmaking platform.

Rank how well each CANDIDATE fits this USER for an introduction. Judge fit on
sector/technology alignment, stage, geography, and check-size vs funding ask.

USER (${requesterView.role})
${JSON.stringify(requesterView, null, 2)}

CANDIDATES (already ranked by a hybrid vector+attribute score; hybrid_score included)
${JSON.stringify(candidateViews, null, 2)}

For each candidate produce:
- composite: integer 0-100 fit score (higher = stronger match)
- rationale_en: 2-3 sentences — what specifically aligns, the concrete value the
  connection could create, and one honest risk/concern. Under 80 words.

Ground every claim in the data above — do NOT invent facts, metrics, or history.
Include one object per candidate, sorted by composite descending.`;
}

function requesterViewOf(role, attributes) {
  return { role, ...attributes };
}

function candidateViewOf(m) {
  return {
    candidate_id: m.userId,
    name: m.displayName,
    headline: m.headline,
    sectors: m.sectors,
    stage: m.stage || undefined,
    stages: m.stages?.length ? m.stages : undefined,
    regions: m.regions,
    country: m.country,
    hybrid_score: m.score,
    attributes: m.attributes,
  };
}

// Returns matches decorated with { composite, rationaleEn }.
// On any LLM failure the hybrid order is returned untouched.
async function rerank({ userId, role, attributes, matches }) {
  if (!hasKey || !matches.length) return { matches, reranked: false };

  const key = matches.map((m) => m.userId).join(',');
  const hit = cache.get(userId);
  if (hit && hit.key === key && Date.now() - hit.at < CACHE_TTL_MS) {
    return { matches: hit.result, reranked: true, cached: true };
  }

  try {
    const completion = await trackedCompletion(client, {
      model: CHAT_MODEL,
      messages: [{ role: 'user', content: buildPrompt(requesterViewOf(role, attributes), matches.map(candidateViewOf)) }],
      response_format: { type: 'json_schema', json_schema: rerankSchema },
    }, { userId, feature: 'rerank' });

    const data = JSON.parse(completion.choices[0].message.content);
    const byId = new Map(matches.map((m) => [m.userId, m]));
    const seen = new Set();
    const ranked = [];

    for (const r of data.matches || []) {
      const m = byId.get(r.candidate_id);
      // Guard: ignore hallucinated / out-of-set ids and duplicates.
      if (!m || seen.has(r.candidate_id) || !r.rationale_en) continue;
      seen.add(r.candidate_id);
      ranked.push({
        ...m,
        composite: Math.max(0, Math.min(100, Math.round(Number(r.composite) || 0))),
        rationaleEn: r.rationale_en,
      });
    }
    // Candidates the LLM omitted keep their hybrid order, after the ranked ones.
    for (const m of matches) {
      if (!seen.has(m.userId)) ranked.push({ ...m, composite: null, rationaleEn: null });
    }
    ranked.sort((a, b) => (b.composite ?? -1) - (a.composite ?? -1));

    cache.set(userId, { at: Date.now(), key, result: ranked });
    return { matches: ranked, reranked: true };
  } catch (err) {
    console.error('rerank failed, falling back to hybrid order:', err.message);
    return { matches, reranked: false };
  }
}

module.exports = { rerank };
