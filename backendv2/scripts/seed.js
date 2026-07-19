/* Demo seed: a few founders + investors (featured), run through the same
 * onboarding path so the extraction pipeline picks them up. Idempotent-ish:
 * skips emails that already exist. */
require('dotenv').config();
const pool = require('../src/config/db');
const { submit } = require('../src/modules/onboarding/onboarding.service');
const { tick } = require('../src/modules/pipeline/worker');

const FOUNDERS = [
  {
    email: 'linh@greengrid.vn', fullName: 'Linh Tran',
    profile: {
      displayName: 'GreenGrid', headline: 'Smart-grid analytics for industrial parks',
      country: 'Vietnam', sectors: ['cleantech', 'energy'], regions: ['vietnam', 'sea'],
      stage: 'seed', teamSize: 12, arrUsd: 180000, fundingAskUsd: 1200000,
      businessModel: 'b2b',
      bio: 'Ex-EVN engineer, 8 years in power systems.',
      experience: 'Led SCADA modernization projects across 3 provinces.',
      productDescription: 'IoT + ML platform that cuts industrial energy waste 15-20%.',
      traction: '9 industrial parks live, $15k MRR, 140% net revenue retention.',
      lookingFor: ['funding', 'strategic_partnership'],
      insideInfo: { grossMargin: '61%', churn: '2 logos in 24 months', pipeline: '$400k qualified' },
      insideInfoVisibility: 'members',
    },
  },
  {
    email: 'minh@medlink.vn', fullName: 'Minh Nguyen',
    profile: {
      displayName: 'MedLink', headline: 'Clinic-to-pharmacy e-prescription network',
      country: 'Vietnam', sectors: ['healthtech'], regions: ['vietnam'],
      stage: 'pre-seed', teamSize: 6, fundingAskUsd: 400000,
      businessModel: 'b2b2c',
      bio: 'Former hospital IT director; second-time founder.',
      productDescription: 'Digital prescriptions with insurer integration for 2,000+ clinics.',
      traction: '210 clinics onboarded, 30k prescriptions/month.',
      lookingFor: ['funding'],
      insideInfo: { burn: '$18k/month', runway: '7 months' },
      insideInfoVisibility: 'members',
    },
  },
  {
    email: 'thao@agrisense.vn', fullName: 'Thao Pham',
    profile: {
      displayName: 'AgriSense', headline: 'Satellite crop intelligence for rice exporters',
      country: 'Vietnam', sectors: ['agritech', 'ai'], regions: ['vietnam', 'sea'],
      stage: 'seed', teamSize: 15, arrUsd: 350000, fundingAskUsd: 2000000,
      businessModel: 'b2b',
      bio: 'Remote-sensing PhD, ex-World Bank consultant.',
      productDescription: 'Yield prediction and traceability for export-grade rice supply chains.',
      traction: '3 of the top-10 Vietnamese rice exporters under contract.',
      lookingFor: ['funding', 'market_access'],
      insideInfo: { grossMargin: '74%', keyRisk: 'single satellite data vendor' },
      insideInfoVisibility: 'members',
    },
  },
];

const INVESTORS = [
  {
    email: 'quan@mekongcapital.vn', fullName: 'Quan Le',
    profile: {
      displayName: 'Mekong Ventures', headline: 'Seed fund for Vietnamese B2B tech',
      country: 'Vietnam', sectors: ['cleantech', 'agritech', 'supply_chain'], regions: ['vietnam', 'sea'],
      investorType: 'vc', stages: ['seed', 'series-a'],
      checkSizeMinUsd: 500000, checkSizeMaxUsd: 3000000,
      bio: 'Partner, 12 years in SEA growth equity.',
      thesis: 'Vietnamese B2B companies digitizing traditional industries: energy, agriculture, logistics.',
      portfolioHighlights: ['KiotViet', 'LogiVan'],
    },
  },
  {
    email: 'ha@saigonangels.vn', fullName: 'Ha Vo',
    profile: {
      displayName: 'Saigon Angels', headline: 'Angel syndicate for pre-seed founders',
      country: 'Vietnam', sectors: ['healthtech', 'fintech', 'edtech'], regions: ['vietnam'],
      investorType: 'angel', stages: ['pre-seed', 'seed'],
      checkSizeMinUsd: 50000, checkSizeMaxUsd: 500000,
      bio: 'Exited fintech founder, 30+ angel checks.',
      thesis: 'Mission-driven Vietnamese founders fixing healthcare and financial access.',
      portfolioHighlights: ['Medici', 'Anfin'],
    },
  },
  {
    email: 'david@apacgrowth.com', fullName: 'David Kim',
    profile: {
      displayName: 'APAC Growth Partners', headline: 'Series A-B fund across APAC',
      country: 'Singapore', sectors: ['ai', 'cleantech', 'supply_chain'], regions: ['apac', 'sea', 'global'],
      investorType: 'vc', stages: ['series-a', 'series-b'],
      checkSizeMinUsd: 2000000, checkSizeMaxUsd: 10000000,
      bio: 'Former operator at Grab, now investing across APAC.',
      thesis: 'Category leaders in climate and AI infrastructure expanding beyond their home market.',
      portfolioHighlights: ['Ampotech', 'Osome'],
    },
  },
];

async function seedOne(role, { email, fullName, profile }) {
  const { rows } = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
  if (rows.length) {
    console.log(`skip (exists): ${email}`);
    return;
  }
  await submit({ email, password: 'demo-password-123', fullName, role, profile });
  console.log(`seeded ${role}: ${email}`);
}

async function main() {
  for (const f of FOUNDERS) await seedOne('founder', f);
  for (const i of INVESTORS) await seedOne('investor', i);

  await pool.query(`UPDATE profiles SET featured = true WHERE display_name IN
    ('GreenGrid', 'AgriSense', 'Mekong Ventures', 'APAC Growth Partners')`);

  console.log('running extraction pipeline...');
  await tick();
  console.log('seed complete');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
