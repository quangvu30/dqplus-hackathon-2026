const pool = require('../../config/db');
const repo = require('./profiles.repo');
const { normalizeSectors, canonStage, canonStages, normalizeRegions } = require('../../lib/sectors');
const jobsRepo = require('../pipeline/jobs.repo');

// Map the onboarding/edit payload (camelCase) onto profiles columns, canonicalizing
// the facet fields so SQL filters and vector matching share one tag space.
function buildProfileColumns(role, p) {
  const cols = {
    display_name: p.displayName,
    headline: p.headline ?? null,
    country: p.country ?? null,
    sectors: normalizeSectors(p.sectors),
    regions: normalizeRegions(p.regions),
    website: p.website ?? null,
    avatar_url: p.avatarUrl ?? null,
    details: JSON.stringify({
      bio: p.bio ?? null,
      experience: p.experience ?? null,
      productDescription: p.productDescription ?? null,
      traction: p.traction ?? null,
      thesis: p.thesis ?? null,
      portfolioHighlights: p.portfolioHighlights ?? [],
      lookingFor: p.lookingFor ?? [],
    }),
  };
  if (role === 'founder') {
    cols.stage = canonStage(p.stage);
    cols.team_size = p.teamSize ?? null;
    cols.arr_usd = p.arrUsd ?? null;
    cols.funding_ask_usd = p.fundingAskUsd ?? null;
    cols.business_model = p.businessModel ?? null;
    cols.inside_info = JSON.stringify(p.insideInfo ?? {});
    cols.inside_info_visibility = p.insideInfoVisibility ?? 'members';
  } else {
    cols.investor_type = p.investorType ?? null;
    cols.stages = canonStages(p.stages);
    cols.check_size_min_usd = p.checkSizeMinUsd ?? null;
    cols.check_size_max_usd = p.checkSizeMaxUsd ?? null;
  }
  return cols;
}

// Compose the free-text document fed to LLM extraction. Inside info is included on
// purpose: extracted attributes are canonical and non-verbatim; the raw inside info
// itself stays behind its visibility rule.
function composeRawText(role, fullName, p) {
  const lines = [`Name: ${fullName}`];
  if (p.displayName) lines.push(role === 'founder' ? `Company: ${p.displayName}` : `Firm: ${p.displayName}`);
  if (p.headline) lines.push(`Headline: ${p.headline}`);
  if (p.country) lines.push(`Country: ${p.country}`);
  if (p.sectors?.length) lines.push(`Sectors: ${p.sectors.join(', ')}`);
  if (p.regions?.length) lines.push(`Regions: ${p.regions.join(', ')}`);
  if (p.bio) lines.push(`About: ${p.bio}`);
  if (p.experience) lines.push(`Experience: ${p.experience}`);
  if (role === 'founder') {
    if (p.stage) lines.push(`Stage: ${p.stage}`);
    if (p.teamSize != null) lines.push(`Team size: ${p.teamSize}`);
    if (p.arrUsd != null) lines.push(`ARR (USD): ${p.arrUsd}`);
    if (p.fundingAskUsd != null) lines.push(`Funding ask (USD): ${p.fundingAskUsd}`);
    if (p.businessModel) lines.push(`Business model: ${p.businessModel}`);
    if (p.productDescription) lines.push(`Product: ${p.productDescription}`);
    if (p.traction) lines.push(`Traction: ${p.traction}`);
    if (p.lookingFor?.length) lines.push(`Looking for: ${p.lookingFor.join(', ')}`);
    const inside = p.insideInfo || {};
    const insideParts = Object.entries(inside)
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => `${k}: ${v}`);
    if (insideParts.length) lines.push(`Inside information: ${insideParts.join('; ')}`);
  } else {
    if (p.investorType) lines.push(`Investor type: ${p.investorType}`);
    if (p.stages?.length) lines.push(`Invests at stages: ${p.stages.join(', ')}`);
    if (p.checkSizeMinUsd != null || p.checkSizeMaxUsd != null) {
      lines.push(`Check size (USD): ${p.checkSizeMinUsd ?? '?'} - ${p.checkSizeMaxUsd ?? '?'}`);
    }
    if (p.thesis) lines.push(`Investment thesis: ${p.thesis}`);
    if (p.portfolioHighlights?.length) lines.push(`Portfolio highlights: ${p.portfolioHighlights.join(', ')}`);
  }
  return lines.join('\n');
}

async function getMe(userId) {
  const row = await repo.getByUserId(userId);
  if (!row) {
    const err = new Error('Profile not found');
    err.status = 404;
    throw err;
  }
  return repo.fromDb(row);
}

async function updateMe(userId, role, fullName, payload) {
  const cols = buildProfileColumns(role, payload);
  cols.onboarding_raw_text = composeRawText(role, fullName, payload);
  const row = await repo.updateByUserId(userId, cols);
  if (!row) {
    const err = new Error('Profile not found');
    err.status = 404;
    throw err;
  }
  await jobsRepo.enqueue(pool, { userId, type: 'profile_extraction' });
  return repo.fromDb(row);
}

async function latestAssessment(profileId) {
  const { rows } = await pool.query(
    `SELECT id, profile_id, document_id, summary_en, summary_vi, strengths, risks,
            key_metrics, confidence, model, created_at
     FROM assessments WHERE profile_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [profileId]
  );
  return rows[0] || null;
}

// Public view of a profile with inside-info visibility gating. Viewer is always
// authenticated here; 'members' therefore passes, 'private' is owner-only.
async function getView(viewerUserId, profileId) {
  const row = await repo.getById(profileId);
  if (!row) {
    const err = new Error('Profile not found');
    err.status = 404;
    throw err;
  }
  const profile = repo.fromDb(row);
  const isOwner = profile.userId === viewerUserId;
  if (!isOwner && profile.insideInfoVisibility === 'private') {
    profile.insideInfo = null;
  }

  const { rows: userRows } = await pool.query(
    'SELECT full_name, email FROM users WHERE id = $1', [profile.userId]
  );
  profile.fullName = userRows[0]?.full_name || null;

  const { rows: extRows } = await pool.query(
    'SELECT attributes FROM extracted_profiles WHERE user_id = $1', [profile.userId]
  );
  profile.extractedAttributes = extRows[0]?.attributes || null;

  if (profile.role === 'founder') {
    profile.assessment = await latestAssessment(profile.id);
  }
  return profile;
}

module.exports = { buildProfileColumns, composeRawText, getMe, updateMe, getView, latestAssessment };
