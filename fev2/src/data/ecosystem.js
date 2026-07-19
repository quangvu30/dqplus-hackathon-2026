export const SECTORS = [
  { id: 'ai', label: 'AI' }, { id: 'fintech', label: 'Fintech' }, { id: 'agritech', label: 'Agritech' },
  { id: 'healthtech', label: 'Healthtech' }, { id: 'cleantech', label: 'Cleantech' }, { id: 'energy', label: 'Energy' },
  { id: 'edtech', label: 'EdTech' }, { id: 'supply_chain', label: 'Logistics' }, { id: 'ecommerce', label: 'E-commerce' },
  { id: 'sustainability', label: 'Sustainability' },
];

export const STAGES = [
  { value: 'pre-seed', label: 'Pre-seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'growth', label: 'Growth' },
];

export const REGIONS = [
  { value: 'vietnam', label: 'Vietnam' },
  { value: 'sea', label: 'Southeast Asia' },
  { value: 'apac', label: 'APAC' },
  { value: 'us', label: 'US' },
  { value: 'eu', label: 'EU' },
  { value: 'global', label: 'Global' },
];

export const INVESTOR_TYPE_OPTIONS = [
  { value: 'vc', label: 'Venture Capital' },
  { value: 'angel', label: 'Angel' },
  { value: 'cvc', label: 'Corporate VC' },
  { value: 'pe', label: 'Private Equity' },
  { value: 'family-office', label: 'Family Office' },
];

export const BUSINESS_MODELS = [
  { value: 'b2b', label: 'B2B' },
  { value: 'b2c', label: 'B2C' },
  { value: 'b2b2c', label: 'B2B2C' },
  { value: 'marketplace', label: 'Marketplace' },
];

export const LOOKING_FOR = [
  { value: 'funding', label: 'Funding' },
  { value: 'strategic_partnership', label: 'Strategic partnership' },
  { value: 'market_access', label: 'Market access' },
  { value: 'talent', label: 'Talent' },
];

// Static fallback so the landing page never renders empty if the API is down.
export const FALLBACK_FEATURED = [
  { profileId: 'demo-1', role: 'investor', displayName: 'Mekong Ventures', headline: 'Seed fund for Vietnamese B2B tech', country: 'Vietnam', sectors: ['cleantech', 'agritech'], investorType: 'vc' },
  { profileId: 'demo-2', role: 'investor', displayName: 'Saigon Angels', headline: 'Angel syndicate for pre-seed founders', country: 'Vietnam', sectors: ['healthtech', 'fintech'], investorType: 'angel' },
  { profileId: 'demo-3', role: 'founder', displayName: 'GreenGrid', headline: 'Smart-grid analytics for industrial parks', country: 'Vietnam', sectors: ['cleantech', 'energy'], stage: 'seed' },
];
