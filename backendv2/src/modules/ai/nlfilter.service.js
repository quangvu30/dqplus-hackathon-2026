/* Advanced LLM filter: translate a natural-language query (VI or EN) into
 * structured facet filters + a semantic query string. Degrades to pure semantic
 * search (semantic_query = raw query, no facets) when the LLM is unavailable. */
const { client, hasKey, CHAT_MODEL } = require('../../config/openai');
const nlFilterSchema = require('./schemas/nlfilter.schema');
const { trackedCompletion } = require('./usage.service');
const { normalizeSectors, canonStages, normalizeRegions } = require('../../lib/sectors');

const SYSTEM_PROMPT = `You translate a user's natural-language search (Vietnamese or English) over a startup-investor platform into structured filters.
Rules:
- Only fill a filter when the query clearly implies it; otherwise [] / null.
- sectors: lowercase tags (fintech, agritech, healthtech, ai, cleantech, ...).
- stages: exactly from pre-seed, seed, series-a, series-b, growth.
- regions: lowercase (vietnam, sea, apac, us, eu, global). countries: lowercase names.
- Monetary amounts in USD numbers ("500k" -> 500000).
- semantic_query: a short English sentence capturing the intent, for embedding search.`;

async function parseQuery(query, { userId = null } = {}) {
  const fallback = {
    sectors: [], stages: [], regions: [], countries: [],
    check_size_min_usd: null, check_size_max_usd: null, arr_min_usd: null,
    team_size_min: null, business_model: null,
    semantic_query: query,
    llm: false,
  };
  if (!hasKey) return fallback;
  try {
    const completion = await trackedCompletion(client, {
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      response_format: { type: 'json_schema', json_schema: nlFilterSchema },
    }, { userId, feature: 'nl_filter' });
    const parsed = JSON.parse(completion.choices[0].message.content);
    return {
      ...parsed,
      sectors: normalizeSectors(parsed.sectors),
      stages: canonStages(parsed.stages),
      regions: normalizeRegions(parsed.regions),
      countries: (parsed.countries || []).map((c) => String(c).toLowerCase()),
      semantic_query: parsed.semantic_query || query,
      llm: true,
    };
  } catch (err) {
    console.error('nl-filter parse failed, falling back to semantic-only:', err.message);
    return fallback;
  }
}

module.exports = { parseQuery };
