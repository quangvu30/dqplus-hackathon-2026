const pool = require('../../config/db');

function fromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    headline: row.headline,
    country: row.country,
    sectors: row.sectors || [],
    regions: row.regions || [],
    website: row.website,
    avatarUrl: row.avatar_url,
    stage: row.stage,
    teamSize: row.team_size,
    arrUsd: row.arr_usd != null ? Number(row.arr_usd) : null,
    fundingAskUsd: row.funding_ask_usd != null ? Number(row.funding_ask_usd) : null,
    businessModel: row.business_model,
    investorType: row.investor_type,
    stages: row.stages || [],
    checkSizeMinUsd: row.check_size_min_usd != null ? Number(row.check_size_min_usd) : null,
    checkSizeMaxUsd: row.check_size_max_usd != null ? Number(row.check_size_max_usd) : null,
    details: row.details || {},
    insideInfo: row.inside_info || {},
    insideInfoVisibility: row.inside_info_visibility,
    featured: row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getByUserId(userId, client = pool) {
  const { rows } = await client.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

async function getById(id, client = pool) {
  const { rows } = await client.query('SELECT * FROM profiles WHERE id = $1', [id]);
  return rows[0] || null;
}

const COLUMNS = [
  'display_name', 'headline', 'country', 'sectors', 'regions', 'website', 'avatar_url',
  'stage', 'team_size', 'arr_usd', 'funding_ask_usd', 'business_model',
  'investor_type', 'stages', 'check_size_min_usd', 'check_size_max_usd',
  'details', 'inside_info', 'inside_info_visibility', 'onboarding_raw_text',
];

async function insert(client, userId, role, cols) {
  const keys = ['user_id', 'role', ...COLUMNS.filter((c) => cols[c] !== undefined)];
  const values = [userId, role, ...COLUMNS.filter((c) => cols[c] !== undefined).map((c) => cols[c])];
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  const { rows } = await client.query(
    `INSERT INTO profiles (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  );
  return rows[0];
}

async function updateByUserId(userId, cols, client = pool) {
  const present = COLUMNS.filter((c) => cols[c] !== undefined);
  if (!present.length) return getByUserId(userId, client);
  const sets = present.map((c, i) => `${c} = $${i + 2}`);
  const { rows } = await client.query(
    `UPDATE profiles SET ${sets.join(', ')}, updated_at = now() WHERE user_id = $1 RETURNING *`,
    [userId, ...present.map((c) => cols[c])]
  );
  return rows[0] || null;
}

module.exports = { fromDb, getByUserId, getById, insert, updateByUserId };
