const pgvector = require('pgvector');
const pool = require('../../config/db');
const { parsePagination } = require('../../lib/pagination');
const { canonSector, canonStage } = require('../../lib/sectors');
const matching = require('../matching/matching.service');
const { rerank } = require('../ai/rerank.service');
const { parseQuery } = require('../ai/nlfilter.service');
const { embed } = require('../ai/embedding.service');

function cardFromRow(r) {
  return {
    userId: r.user_id,
    profileId: r.profile_id,
    role: r.role,
    displayName: r.display_name,
    fullName: r.full_name,
    headline: r.headline,
    country: r.country,
    sectors: r.sectors || [],
    regions: r.regions || [],
    stage: r.stage,
    stages: r.stages || [],
    investorType: r.investor_type,
    fundingAskUsd: r.funding_ask_usd != null ? Number(r.funding_ask_usd) : null,
    checkSizeMinUsd: r.check_size_min_usd != null ? Number(r.check_size_min_usd) : null,
    checkSizeMaxUsd: r.check_size_max_usd != null ? Number(r.check_size_max_usd) : null,
  };
}

const CARD_SELECT = `
  SELECT p.user_id, p.id AS profile_id, p.role, p.display_name, u.full_name,
         p.headline, p.country, p.sectors, p.regions, p.stage, p.stages,
         p.investor_type, p.funding_ask_usd, p.check_size_min_usd, p.check_size_max_usd
  FROM profiles p JOIN users u ON u.id = p.user_id`;

// Full opposite-role listing with SQL facet filters.
async function browse(viewer, query) {
  const targetRole = viewer.role === 'founder' ? 'investor' : 'founder';
  const { page, pageSize, offset } = parsePagination(query);

  const conditions = ['p.role = $1', 'p.user_id <> $2'];
  const params = [targetRole, viewer.sub];

  if (query.sector) {
    params.push(canonSector(query.sector));
    conditions.push(`$${params.length} = ANY(p.sectors)`);
  }
  if (query.stage) {
    params.push(canonStage(query.stage));
    conditions.push(
      targetRole === 'investor' ? `$${params.length} = ANY(p.stages)` : `p.stage = $${params.length}`
    );
  }
  if (query.region) {
    params.push(String(query.region).toLowerCase());
    conditions.push(`$${params.length} = ANY(p.regions)`);
  }
  if (query.country) {
    params.push(String(query.country));
    conditions.push(`LOWER(p.country) = LOWER($${params.length})`);
  }
  if (query.check_min) {
    params.push(Number(query.check_min));
    conditions.push(
      targetRole === 'investor'
        ? `p.check_size_max_usd >= $${params.length}`
        : `p.funding_ask_usd >= $${params.length}`
    );
  }
  if (query.check_max) {
    params.push(Number(query.check_max));
    conditions.push(
      targetRole === 'investor'
        ? `p.check_size_min_usd <= $${params.length}`
        : `p.funding_ask_usd <= $${params.length}`
    );
  }
  if (query.q) {
    params.push(`%${query.q}%`);
    conditions.push(`(p.display_name ILIKE $${params.length} OR p.headline ILIKE $${params.length})`);
  }

  const where = conditions.join(' AND ');
  const { rows: countRows } = await pool.query(
    `SELECT count(*)::int AS total FROM profiles p WHERE ${where}`,
    params
  );
  const { rows } = await pool.query(
    `${CARD_SELECT} WHERE ${where} ORDER BY p.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );
  return { items: rows.map(cardFromRow), total: countRows[0].total, page, pageSize };
}

// Only the top slice gets an LLM rationale — reranking all `limit` candidates
// scales generation time linearly with limit for no benefit past the first
// screenful; the rest keep their hybrid order and score.
const RERANK_TOP_N = 6;

// Full-response cache so a repeat visit within the window skips both the SQL
// hybrid pass and the LLM rerank call, not just the rerank half (that one has
// its own shorter-lived cache inside rerank.service.js).
const RECOMMENDED_CACHE_TTL_MS = 10 * 60 * 1000;
const recommendedCache = new Map(); // `${userId}:${limit}:${useRerank}` -> { at, response }

// Algorithmic recommendations: hybrid matcher, optional LLM re-rank with rationale.
async function recommended(viewer, { limit = 10, useRerank = false }) {
  const cacheKey = `${viewer.sub}:${limit}:${useRerank}`;
  const hit = recommendedCache.get(cacheKey);
  if (hit && Date.now() - hit.at < RECOMMENDED_CACHE_TTL_MS) return hit.response;

  const result = await matching.findMatches({ userId: viewer.sub, limit });
  let response;
  if (!useRerank) {
    response = { mode: 'hybrid', matches: result.matches };
  } else {
    const toRerank = result.matches.slice(0, RERANK_TOP_N);
    const rest = result.matches.slice(RERANK_TOP_N);
    const rr = await rerank({
      userId: viewer.sub,
      role: result.role,
      attributes: result.attributes,
      matches: toRerank,
    });
    response = { mode: rr.reranked ? 'llm-rerank' : 'hybrid', matches: [...rr.matches, ...rest] };
  }

  recommendedCache.set(cacheKey, { at: Date.now(), response });
  return response;
}

// Advanced LLM filter: NL query -> facets + semantic ranking over the filtered set.
async function nlFilter(viewer, queryText) {
  const targetRole = viewer.role === 'founder' ? 'investor' : 'founder';
  const parsed = await parseQuery(queryText, { userId: viewer.sub });

  const conditions = ['p.role = $1', 'p.user_id <> $2'];
  const params = [targetRole, viewer.sub];

  if (parsed.sectors.length) {
    params.push(parsed.sectors);
    conditions.push(`p.sectors && $${params.length}`);
  }
  if (parsed.stages.length) {
    params.push(parsed.stages);
    conditions.push(targetRole === 'investor' ? `p.stages && $${params.length}` : `p.stage = ANY($${params.length})`);
  }
  if (parsed.regions.length) {
    params.push(parsed.regions);
    conditions.push(`p.regions && $${params.length}`);
  }
  if (parsed.countries.length) {
    params.push(parsed.countries);
    conditions.push(`LOWER(p.country) = ANY($${params.length})`);
  }
  if (parsed.check_size_min_usd != null) {
    params.push(parsed.check_size_min_usd);
    conditions.push(
      targetRole === 'investor'
        ? `p.check_size_max_usd >= $${params.length}`
        : `p.funding_ask_usd >= $${params.length}`
    );
  }
  if (parsed.check_size_max_usd != null) {
    params.push(parsed.check_size_max_usd);
    conditions.push(
      targetRole === 'investor'
        ? `p.check_size_min_usd <= $${params.length}`
        : `p.funding_ask_usd <= $${params.length}`
    );
  }
  if (parsed.arr_min_usd != null && targetRole === 'founder') {
    params.push(parsed.arr_min_usd);
    conditions.push(`p.arr_usd >= $${params.length}`);
  }
  if (parsed.team_size_min != null && targetRole === 'founder') {
    params.push(parsed.team_size_min);
    conditions.push(`p.team_size >= $${params.length}`);
  }
  if (parsed.business_model && targetRole === 'founder') {
    params.push(parsed.business_model);
    conditions.push(`p.business_model = $${params.length}`);
  }

  // Semantic ranking over the filtered set (falls back to recency if the viewer's
  // query can't be embedded for some reason).
  const { vector } = await embed(parsed.semantic_query, { userId: viewer.sub });
  params.push(pgvector.toSql(vector));
  const orderParam = params.length;

  const { rows } = await pool.query(
    `${CARD_SELECT}
     LEFT JOIN extracted_profiles ep ON ep.user_id = p.user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ep.embedding <=> $${orderParam} NULLS LAST, p.created_at DESC
     LIMIT 30`,
    params
  );

  return {
    interpretedFilters: {
      sectors: parsed.sectors,
      stages: parsed.stages,
      regions: parsed.regions,
      countries: parsed.countries,
      checkSizeMinUsd: parsed.check_size_min_usd,
      checkSizeMaxUsd: parsed.check_size_max_usd,
      arrMinUsd: parsed.arr_min_usd,
      teamSizeMin: parsed.team_size_min,
      businessModel: parsed.business_model,
      semanticQuery: parsed.semantic_query,
      usedLlm: parsed.llm,
    },
    items: rows.map(cardFromRow),
  };
}

module.exports = { browse, recommended, nlFilter };
