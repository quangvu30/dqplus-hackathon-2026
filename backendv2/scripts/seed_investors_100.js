/* Generates 100 varied investor sample accounts (same path as scripts/seed.js:
 * users+profiles created via onboarding.submit, then run through the AI
 * pipeline). Idempotent: skips emails that already exist. */
require('dotenv').config();
const pool = require('../src/config/db');
const { submit } = require('../src/modules/onboarding/onboarding.service');
const { tick } = require('../src/modules/pipeline/worker');

const COUNT = Number(process.argv[2]) || 100;

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260719);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickN = (arr, n) => {
  const pool = [...arr];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
};
const between = (lo, hi) => Math.round(lo + rand() * (hi - lo));
const roundMoney = (n) => Math.round(n / 1000) * 1000;

const FIRST_NAMES = [
  'Linh', 'Minh', 'Thao', 'Quan', 'Ha', 'Duc', 'Trang', 'Hieu', 'Mai', 'Tuan',
  'Anh', 'Phuong', 'Khoa', 'Van', 'Huy', 'Nga', 'Son', 'Dung', 'Lan', 'Kiet',
  'David', 'Sarah', 'James', 'Wei', 'Yuki', 'Siti', 'Arun', 'Grace', 'Michael', 'Priya',
];
const LAST_NAMES = [
  'Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vo', 'Vu', 'Dang', 'Bui', 'Do',
  'Kim', 'Lee', 'Tan', 'Wong', 'Lim', 'Sharma', 'Patel', 'Kumar', 'Suzuki', 'Park',
];
const FUND_SUFFIXES = [
  'Capital', 'Ventures', 'Partners', 'Fund', 'Growth Partners', 'Holdings',
  'Angels', 'Investment Group', 'Ventures Asia', 'Frontier Capital',
];
const COUNTRIES = ['Vietnam', 'Singapore', 'United States', 'Japan', 'South Korea', 'Indonesia', 'Thailand', 'Hong Kong', 'Malaysia', 'Australia'];
const INVESTOR_TYPES = ['vc', 'angel', 'corporate', 'family_office'];
const SECTOR_POOL = [
  'fintech', 'healthtech', 'edtech', 'agritech', 'cleantech', 'ai', 'ecommerce',
  'supply_chain', 'proptech', 'deeptech', 'gaming', 'mobility', 'insurtech',
  'cybersecurity', 'hrtech', 'energy', 'sustainability', 'digital_transformation',
];
const REGION_POOL = ['vietnam', 'sea', 'apac', 'global', 'us', 'eu'];
const STAGE_POOL = ['pre-seed', 'seed', 'series-a', 'series-b', 'growth'];
const PORTFOLIO_POOL = [
  'KiotViet', 'LogiVan', 'Medici', 'Anfin', 'Ampotech', 'Osome', 'Loship',
  'Homebase', 'Fundiin', 'Coolmate', 'Chợ Tốt', 'Trusting Social', 'BuyMed',
  'GoStream', 'Ecomobi', 'Wee Digital', 'Kilo', 'Kamereo', 'Beacon Fintech', 'MFast',
];
const THESIS_TEMPLATES = [
  (s, r) => `Backing category-defining ${s.join('/')} companies expanding across ${r.join(', ')}.`,
  (s, r) => `Early conviction bets on ${s.join(' and ')} founders solving structural problems in ${r.join('/')}.`,
  (s, r) => `We back operators, not just ideas: ${s.join(', ')} businesses with real unit economics in ${r.join(', ')}.`,
  (s, r) => `Thesis-driven investing in ${s.join('/')} at the intersection of technology and distribution across ${r.join(', ')}.`,
];
const CHECK_RANGES = {
  angel: [10000, 250000],
  vc: [250000, 5000000],
  corporate: [500000, 8000000],
  family_office: [200000, 4000000],
};

function buildInvestor(i) {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const fullName = `${first} ${last}`;
  const investorType = pick(INVESTOR_TYPES);
  const displayName = investorType === 'angel'
    ? `${first} ${last} Angel`
    : `${last} ${pick(FUND_SUFFIXES)}`;
  const country = pick(COUNTRIES);
  const sectors = pickN(SECTOR_POOL, between(2, 4));
  const regions = pickN(REGION_POOL, between(1, 3));
  const stages = pickN(STAGE_POOL, between(1, 3)).sort((a, b) => STAGE_POOL.indexOf(a) - STAGE_POOL.indexOf(b));
  const [lo, hi] = CHECK_RANGES[investorType];
  const checkSizeMinUsd = roundMoney(between(lo, lo + (hi - lo) * 0.4));
  const checkSizeMaxUsd = roundMoney(between(checkSizeMinUsd * 2, hi));
  const thesis = pick(THESIS_TEMPLATES)(sectors, regions);
  const portfolioHighlights = pickN(PORTFOLIO_POOL, between(1, 3));

  const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@sample-investor.dev`;

  return {
    email,
    fullName,
    profile: {
      displayName,
      headline: `${pick(['Seed', 'Early-stage', 'Growth-stage', 'Pre-seed'])} investor focused on ${sectors[0]}`,
      country,
      sectors,
      regions,
      investorType,
      stages,
      checkSizeMinUsd,
      checkSizeMaxUsd,
      bio: `${between(3, 20)} years in ${pick(['venture capital', 'operating roles', 'private equity', 'startup founding'])}.`,
      thesis,
      portfolioHighlights,
    },
  };
}

async function seedOne(investor) {
  const { rows } = await pool.query('SELECT 1 FROM users WHERE email = $1', [investor.email]);
  if (rows.length) {
    console.log(`skip (exists): ${investor.email}`);
    return;
  }
  await submit({ email: investor.email, password: 'demo-password-123', fullName: investor.fullName, role: 'investor', profile: investor.profile });
  console.log(`seeded investor: ${investor.email} (${investor.profile.displayName})`);
}

async function main() {
  for (let i = 0; i < COUNT; i++) {
    await seedOne(buildInvestor(i));
  }

  console.log(`running extraction pipeline for up to ${COUNT} jobs...`);
  await tick();
  console.log('seed complete');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
