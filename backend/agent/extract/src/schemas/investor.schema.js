const investorSchema = {
  name: 'investor_profile',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      firm_name: { type: ['string', 'null'] },
      investor_type: {
        type: ['string', 'null'],
        enum: ['vc', 'angel', 'cvc', 'pe', 'family-office', null],
      },
      thesis: { type: ['string', 'null'] },
      sectors: { type: 'array', items: { type: 'string' } },
      stages: { type: 'array', items: { type: 'string' } },
      geographies: { type: 'array', items: { type: 'string' } },
      check_size_min_usd: { type: ['number', 'null'] },
      check_size_max_usd: { type: ['number', 'null'] },
      portfolio_highlights: { type: 'array', items: { type: 'string' } },
      constraints: { type: ['string', 'null'] },
    },
    required: [
      'firm_name',
      'investor_type',
      'thesis',
      'sectors',
      'stages',
      'geographies',
      'check_size_min_usd',
      'check_size_max_usd',
      'portfolio_highlights',
      'constraints',
    ],
  },
};

module.exports = investorSchema;
