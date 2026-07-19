// Salvaged from backend/agent/extract/src/services/extraction.service.js,
// extended with key_advantages / looking_for / value_add and a keyless fallback.
const { client, hasKey, CHAT_MODEL } = require('../../config/openai');
const founderSchema = require('./schemas/founder.schema');
const investorSchema = require('./schemas/investor.schema');
const { trackedCompletion } = require('./usage.service');

const SYSTEM_PROMPT = `You extract structured data from text describing a startup founder/company or an investor.
Rules:
- Use only information present in the text. Use null for unknown scalars and [] for unknown arrays.
- Normalize sectors/industries to lowercase single words or hyphenated terms (e.g. "fintech", "health-tech", "e-commerce").
- Normalize stages to exactly: pre-seed, seed, series-a, series-b, growth.
- Normalize regions/geographies to lowercase (e.g. "vietnam", "sea", "apac", "us", "eu", "global").
- Monetary amounts are in USD numbers (e.g. "1.5M" -> 1500000).
- key_advantages: concrete differentiators/moats stated in the text (founders).
- looking_for: what the founder seeks, from: funding, strategic_partnership, market_access, talent.
- value_add: non-capital support the investor offers (network, go-to-market, hiring...).`;

async function extractAttributes(role, text, { userId = null } = {}) {
  const schema = role === 'investor' ? investorSchema : founderSchema;
  if (!hasKey) return fallbackAttributes(role, text);
  const completion = await trackedCompletion(client, {
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Extract the ${role} profile from this text:\n\n${text}` },
    ],
    response_format: { type: 'json_schema', json_schema: schema },
  }, { userId, feature: 'extraction' });
  return JSON.parse(completion.choices[0].message.content);
}

// Keyless fallback: empty-but-valid attributes; the onboarding service overlays the
// structured form fields afterwards, so matching still works offline.
function fallbackAttributes(role) {
  if (role === 'investor') {
    return {
      firm_name: null, investor_type: null, thesis: null, sectors: [], stages: [],
      geographies: [], check_size_min_usd: null, check_size_max_usd: null,
      portfolio_highlights: [], constraints: null, value_add: [],
    };
  }
  return {
    company_name: null, industry: [], stage: null, country: null, target_regions: [],
    team_size: null, arr_usd: null, funding_ask_usd: null, business_model: null,
    product_description: null, traction_summary: null, key_advantages: [], looking_for: [],
  };
}

function buildEmbeddingText(role, attrs) {
  const parts = [];
  if (role === 'founder') {
    if (attrs.company_name) parts.push(attrs.company_name);
    if (attrs.industry?.length) parts.push(`${attrs.industry.join(', ')} startup`);
    if (attrs.stage) parts.push(`at ${attrs.stage} stage`);
    if (attrs.country) parts.push(`based in ${attrs.country}`);
    if (attrs.target_regions?.length) parts.push(`targeting ${attrs.target_regions.join(', ')}`);
    if (attrs.business_model) parts.push(`business model: ${attrs.business_model}`);
    if (attrs.product_description) parts.push(attrs.product_description);
    if (attrs.traction_summary) parts.push(`Traction: ${attrs.traction_summary}`);
    if (attrs.key_advantages?.length) parts.push(`Advantages: ${attrs.key_advantages.join(', ')}`);
    if (attrs.looking_for?.length) parts.push(`Looking for: ${attrs.looking_for.join(', ')}`);
  } else {
    if (attrs.firm_name) parts.push(attrs.firm_name);
    if (attrs.investor_type) parts.push(`${attrs.investor_type} investor`);
    if (attrs.sectors?.length) parts.push(`investing in ${attrs.sectors.join(', ')}`);
    if (attrs.stages?.length) parts.push(`at ${attrs.stages.join(', ')} stages`);
    if (attrs.geographies?.length) parts.push(`in ${attrs.geographies.join(', ')}`);
    if (attrs.thesis) parts.push(`Thesis: ${attrs.thesis}`);
    if (attrs.value_add?.length) parts.push(`Value add: ${attrs.value_add.join(', ')}`);
    if (attrs.constraints) parts.push(`Avoids: ${attrs.constraints}`);
  }
  return parts.join('. ') || `${role} profile with no extracted details`;
}

module.exports = { extractAttributes, buildEmbeddingText, fallbackAttributes };
