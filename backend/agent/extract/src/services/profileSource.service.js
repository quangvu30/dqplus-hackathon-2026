const pool = require('../config/db');

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function loadUserProfile(userId) {
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.role, p.*
     FROM users u
     JOIN profiles p ON p.id = u.profile_id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0] || null;
}

function mapProfileToAttributes(row) {
  return {
    company_name: row.company_name || null,
    industry: row.industry ? [String(row.industry).toLowerCase()] : [],
    stage: row.stage ? String(row.stage).toLowerCase() : null,
    country: row.country || null,
    target_regions: row.target_region ? [String(row.target_region).toLowerCase()] : [],
    team_size: row.num_of_employees ?? null,
    arr_usd: row.arr !== null && row.arr !== undefined ? Number(row.arr) : null,
    funding_ask_usd: parseNumber(row.checks),
    business_model: null,
    product_description: row.description_product || null,
    traction_summary: null,
  };
}

module.exports = { loadUserProfile, mapProfileToAttributes };
