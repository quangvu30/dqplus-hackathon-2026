/* Bilingual sector/stage canonicalization, ported from
 * ai-data-platform/spine/matcher/__init__.py (_SECTOR_MAP). Keeps founder and
 * investor tags — English or Vietnamese — in one matching space. */

const SECTOR_MAP = {
  enterprise_ai: 'ai', ai_agents: 'ai', automation: 'ai', machine_learning: 'ai',
  ml: 'ai', genai: 'ai', llm: 'ai', ai_ml: 'ai', artificial_intelligence: 'ai',
  tri_tue_nhan_tao: 'ai',
  clean_energy: 'cleantech', cleantech: 'cleantech', renewable_energy: 'cleantech',
  renewables: 'cleantech', thermal_energy_storage: 'cleantech',
  nang_luong_sach: 'cleantech',
  energy: 'energy', smart_grid: 'energy', nang_luong: 'energy',
  agritech: 'agritech', agtech: 'agritech', agriculture: 'agritech',
  smart_agriculture: 'agritech', foodtech: 'agritech', food_tech: 'agritech',
  nong_nghiep: 'agritech',
  healthcare: 'healthtech', biotech: 'healthtech', healthtech: 'healthtech',
  medtech: 'healthtech', life_sciences: 'healthtech', health: 'healthtech',
  health_tech: 'healthtech', y_te: 'healthtech',
  supply_chain: 'supply_chain', logistics: 'supply_chain',
  chuoi_cung_ung: 'supply_chain',
  digital_transformation: 'digital_transformation',
  digital_infrastructure: 'digital_transformation',
  digitalization: 'digital_transformation', dx: 'digital_transformation',
  esg: 'sustainability', sustainability: 'sustainability',
  circular_economy: 'sustainability',
  fin_tech: 'fintech', financial_services: 'fintech', payments: 'fintech',
  tai_chinh: 'fintech',
  e_commerce: 'ecommerce', ecommerce: 'ecommerce', thuong_mai_dien_tu: 'ecommerce',
  edtech: 'edtech', education: 'edtech', giao_duc: 'edtech',
};

const STAGE_MAP = {
  preseed: 'pre-seed', pre_seed: 'pre-seed', 'pre-seed': 'pre-seed',
  seed: 'seed',
  series_a: 'series-a', 'series-a': 'series-a', seriesa: 'series-a',
  series_b: 'series-b', 'series-b': 'series-b', seriesb: 'series-b',
  growth: 'growth', series_c: 'growth', late_stage: 'growth',
};

// slugify: strip Vietnamese diacritics (đ + NFKD combining marks), lowercase,
// non-alphanumerics -> underscore.
function slug(value) {
  return String(value)
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function canonSector(tag) {
  const t = slug(tag);
  return SECTOR_MAP[t] || t;
}

function normalizeSectors(tags) {
  if (!tags) return [];
  const list = Array.isArray(tags) ? tags : [tags];
  return [...new Set(list.map(canonSector).filter(Boolean))];
}

function canonStage(stage) {
  if (!stage) return null;
  const t = slug(stage).replace(/_/g, '-');
  return STAGE_MAP[t] || STAGE_MAP[t.replace(/-/g, '_')] || t;
}

function canonStages(stages) {
  if (!stages) return [];
  const list = Array.isArray(stages) ? stages : [stages];
  return [...new Set(list.map(canonStage).filter(Boolean))];
}

function normalizeRegions(regions) {
  if (!regions) return [];
  const list = Array.isArray(regions) ? regions : [regions];
  return [...new Set(list.map((r) => slug(r).replace(/_/g, '-')).filter(Boolean))];
}

module.exports = { slug, canonSector, normalizeSectors, canonStage, canonStages, normalizeRegions };
