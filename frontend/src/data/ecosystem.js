export const SECTORS = [
  { id: 'ai', label: 'AI' }, { id: 'fintech', label: 'Fintech' }, { id: 'agritech', label: 'Agritech' },
  { id: 'healthtech', label: 'Healthtech' }, { id: 'cleantech', label: 'Cleantech' }, { id: 'deeptech', label: 'Deep Tech' },
  { id: 'edtech', label: 'EdTech' }, { id: 'logistics', label: 'Logistics' }, { id: 'saas', label: 'SaaS' },
];

// Only 'investors' is backed by the matching engine today; the other intents
// have no backend service yet and render an unavailable notice.
export const INTENTS = [
  { id: 'investors', tab: 'Investment Fund', title: 'Investment funds that fit your raise.', sub: 'Capital partners ranked by fit with {p}.', live: true },
  { id: 'customers', tab: 'Potential customers', title: 'Businesses that need what you build.', sub: 'Companies with demand in {p}’s sector, ranked by fit.', live: false },
  { id: 'partners', tab: 'Partners & mentors', title: 'Partners & mentors for your R&D.', sub: 'Research partners and mentors in {p}’s sector, ranked by fit.', live: false },
  { id: 'talent', tab: 'Talent', title: 'People who fit your team.', sub: 'Candidates in {p}’s sector, ranked by fit.', live: false },
];

export const STAGES = [
  { value: 'pre_seed', label: 'Pre-seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B+' },
  { value: 'growth', label: 'Growth' },
];
