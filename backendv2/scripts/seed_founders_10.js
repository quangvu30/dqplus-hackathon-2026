/* 10 sample founder accounts, same path as scripts/seed.js (users+profiles via
 * onboarding.submit, then run through the AI pipeline). Idempotent: skips
 * emails that already exist. */
require('dotenv').config();
const pool = require('../src/config/db');
const { submit } = require('../src/modules/onboarding/onboarding.service');
const { tick } = require('../src/modules/pipeline/worker');

const FOUNDERS = [
  {
    email: 'lan.vu@sample-founder.dev', fullName: 'Lan Vu',
    profile: {
      displayName: 'PayNhanh', headline: 'Instant payroll advances for factory workers',
      country: 'Vietnam', sectors: ['fintech'], regions: ['vietnam', 'sea'],
      stage: 'seed', teamSize: 9, arrUsd: 95000, fundingAskUsd: 800000,
      businessModel: 'b2b2c',
      bio: 'Ex-VNPay product lead, 6 years in payments infrastructure.',
      experience: 'Shipped QR payment rails used by 40k merchants.',
      productDescription: 'Earned-wage-access app that lets factory workers draw pay before payday, repaid via employer payroll integration.',
      traction: '3 industrial-zone employers live, 4,200 workers enrolled, 22% monthly active draw rate.',
      lookingFor: ['funding', 'strategic_partnership'],
      insideInfo: { defaultRate: '0.4%', takeRate: '3.5% per advance', pipeline: '2 more zones in due diligence' },
      insideInfoVisibility: 'members',
    },
  },
  {
    email: 'duc.tran@sample-founder.dev', fullName: 'Duc Tran',
    profile: {
      displayName: 'HocTot AI', headline: 'AI tutor for Vietnamese high-school exam prep',
      country: 'Vietnam', sectors: ['edtech', 'ai'], regions: ['vietnam'],
      stage: 'pre-seed', teamSize: 5, fundingAskUsd: 350000,
      businessModel: 'b2c',
      bio: 'Former Violympic coach, built ed-content for 200k students before founding.',
      productDescription: 'Adaptive practice + AI explanations for the THPT national exam, tuned on 10 years of past papers.',
      traction: '18,000 monthly active students, 6.5% paid conversion to premium tier.',
      lookingFor: ['funding', 'talent'],
      insideInfo: { churn: '11% monthly on free tier', cac: '$1.80 via TikTok' },
      insideInfoVisibility: 'members',
    },
  },
  {
    email: 'hai.nguyen@sample-founder.dev', fullName: 'Hai Nguyen',
    profile: {
      displayName: 'ChuyenPhat247', headline: 'Same-day last-mile delivery for HCMC e-commerce sellers',
      country: 'Vietnam', sectors: ['supply_chain'], regions: ['vietnam', 'sea'],
      stage: 'series-a', teamSize: 40, arrUsd: 1450000, fundingAskUsd: 4000000,
      businessModel: 'b2b',
      bio: 'Second-time founder, previously ran regional ops for a logistics unicorn.',
      productDescription: 'Route-optimized same-day delivery network for D2C sellers, with real-time COD reconciliation.',
      traction: '1,900 active merchant accounts, 98.2% on-time rate, expanding to Hanoi in Q3.',
      lookingFor: ['funding', 'market_access'],
      insideInfo: { grossMargin: '34%', keyRisk: 'fuel cost exposure', runway: '14 months' },
      insideInfoVisibility: 'members',
    },
  },
  {
    email: 'yen.pham@sample-founder.dev', fullName: 'Yen Pham',
    profile: {
      displayName: 'ChoNha', headline: 'Verified rental listings and digital lease signing',
      country: 'Vietnam', sectors: ['proptech'], regions: ['vietnam'],
      stage: 'seed', teamSize: 11, arrUsd: 210000, fundingAskUsd: 1000000,
      businessModel: 'marketplace',
      bio: 'Ex-Batdongsan.com engineering manager.',
      productDescription: 'Landlord-verified rental marketplace with e-signature leases and deposit escrow.',
      traction: '3,100 verified listings across HCMC and Da Nang, 60% of leases signed digitally.',
      lookingFor: ['funding'],
      insideInfo: { takeRate: '1 month rent per signed lease', churn: 'landlord churn 4%/quarter' },
      insideInfoVisibility: 'members',
    },
  },
  {
    email: 'khang.le@sample-founder.dev', fullName: 'Khang Le',
    profile: {
      displayName: 'TuoiSach Foods', headline: 'Cold-chain traceability for fresh produce exporters',
      country: 'Vietnam', sectors: ['agritech', 'supply_chain'], regions: ['vietnam', 'sea'],
      stage: 'seed', teamSize: 14, arrUsd: 260000, fundingAskUsd: 1500000,
      businessModel: 'b2b',
      bio: 'Food-safety engineer, 10 years auditing export cold chains.',
      productDescription: 'IoT temperature loggers plus a traceability ledger that exporters use to meet EU/Japan import requirements.',
      traction: '6 dragon-fruit and mango exporters onboarded, 1 EU retailer pilot underway.',
      lookingFor: ['funding', 'market_access'],
      insideInfo: { grossMargin: '52%', pipeline: '$180k in signed LOIs' },
      insideInfoVisibility: 'members',
    },
  },
  {
    email: 'chi.dang@sample-founder.dev', fullName: 'Chi Dang',
    profile: {
      displayName: 'CareGiver.vn', headline: 'On-demand vetted home care for elderly patients',
      country: 'Vietnam', sectors: ['healthtech'], regions: ['vietnam'],
      stage: 'pre-seed', teamSize: 7, fundingAskUsd: 450000,
      businessModel: 'marketplace',
      bio: 'Nurse-turned-founder, ran home-care staffing for a private hospital group.',
      productDescription: 'Marketplace matching background-checked caregivers with families, booked and paid through the app.',
      traction: '640 completed bookings in Hanoi pilot, 4.7/5 average family rating.',
      lookingFor: ['funding', 'talent'],
      insideInfo: { supplyChurn: '9% monthly caregiver churn', unitEconomics: '$14 contribution margin per booking' },
      insideInfoVisibility: 'members',
    },
  },
  {
    email: 'tam.bui@sample-founder.dev', fullName: 'Tam Bui',
    profile: {
      displayName: 'VanHanh OS', headline: 'AI copilot for manufacturing shift-floor scheduling',
      country: 'Vietnam', sectors: ['ai', 'digital_transformation'], regions: ['vietnam', 'sea'],
      stage: 'series-a', teamSize: 28, arrUsd: 980000, fundingAskUsd: 3500000,
      businessModel: 'b2b',
      bio: 'Ex-Bosch Vietnam plant manager, 12 years in manufacturing ops.',
      productDescription: 'Forecasts line throughput and auto-generates shift schedules from ERP + machine sensor data.',
      traction: '9 factories live across textiles and electronics, average 8% reduction in overtime cost.',
      lookingFor: ['funding', 'strategic_partnership'],
      insideInfo: { grossMargin: '68%', netRevenueRetention: '132%' },
      insideInfoVisibility: 'members',
    },
  },
  {
    email: 'phuong.hoang@sample-founder.dev', fullName: 'Phuong Hoang',
    profile: {
      displayName: 'MuaChung Local', headline: 'Group-buying app for Vietnamese wet-market vendors',
      country: 'Vietnam', sectors: ['ecommerce'], regions: ['vietnam'],
      stage: 'seed', teamSize: 16, arrUsd: 310000, fundingAskUsd: 1200000,
      businessModel: 'marketplace',
      bio: 'Grew up helping run her family\'s market stall before founding.',
      productDescription: 'Lets wet-market vendors pool orders directly from wholesalers, cutting out two layers of middlemen.',
      traction: '2,400 active vendors across 14 markets, average 18% cost savings per pooled order.',
      lookingFor: ['funding', 'market_access'],
      insideInfo: { takeRate: '4% of pooled order value', churn: 'vendor churn 6%/quarter' },
      insideInfoVisibility: 'members',
    },
  },
  {
    email: 'an.vo@sample-founder.dev', fullName: 'An Vo',
    profile: {
      displayName: 'MayXanh Energy', headline: 'Rooftop solar financing for SME factories',
      country: 'Vietnam', sectors: ['cleantech', 'energy'], regions: ['vietnam', 'sea'],
      stage: 'series-a', teamSize: 22, arrUsd: 1650000, fundingAskUsd: 5000000,
      businessModel: 'b2b',
      bio: 'Renewable-energy financier, ex-Mekong Capital investment team.',
      productDescription: 'Zero-capex rooftop solar leasing for SME factories, paid back through electricity-bill savings.',
      traction: '31 installed sites, 4.2MW cumulative capacity, average 22% electricity cost reduction for clients.',
      lookingFor: ['funding'],
      insideInfo: { paybackPeriod: '5.5 years per site', keyRisk: 'grid interconnection delays' },
      insideInfoVisibility: 'members',
    },
  },
  {
    email: 'ngoc.tran@sample-founder.dev', fullName: 'Ngoc Tran',
    profile: {
      displayName: 'KetNoi HR', headline: 'Blue-collar hiring marketplace with skills verification',
      country: 'Vietnam', sectors: ['hrtech'], regions: ['vietnam', 'sea'],
      stage: 'pre-seed', teamSize: 6, fundingAskUsd: 300000,
      businessModel: 'marketplace',
      bio: 'Built recruiting ops for a staffing agency placing 5,000+ factory workers a year.',
      productDescription: 'Video-verified skills profiles and same-week placement for factory and warehouse roles.',
      traction: '850 verified workers, 210 placements in first 4 months, 30-day fill rate under 9 days.',
      lookingFor: ['funding', 'talent'],
      insideInfo: { placementFee: '1 month salary per hire', noShowRate: '7%' },
      insideInfoVisibility: 'members',
    },
  },
];

async function seedOne(founder) {
  const { rows } = await pool.query('SELECT 1 FROM users WHERE email = $1', [founder.email]);
  if (rows.length) {
    console.log(`skip (exists): ${founder.email}`);
    return;
  }
  await submit({ email: founder.email, password: 'demo-password-123', fullName: founder.fullName, role: 'founder', profile: founder.profile });
  console.log(`seeded founder: ${founder.email} (${founder.profile.displayName})`);
}

async function main() {
  for (const f of FOUNDERS) await seedOne(f);

  console.log(`running extraction pipeline for up to ${FOUNDERS.length} jobs...`);
  await tick();
  console.log('seed complete');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
