const nlFilterSchema = {
  name: 'nl_filter',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      sectors: { type: 'array', items: { type: 'string' } },
      stages: { type: 'array', items: { type: 'string' } },
      regions: { type: 'array', items: { type: 'string' } },
      countries: { type: 'array', items: { type: 'string' } },
      check_size_min_usd: { type: ['number', 'null'] },
      check_size_max_usd: { type: ['number', 'null'] },
      arr_min_usd: { type: ['number', 'null'] },
      team_size_min: { type: ['integer', 'null'] },
      business_model: {
        type: ['string', 'null'],
        enum: ['b2b', 'b2c', 'b2b2c', 'marketplace', null],
      },
      semantic_query: { type: 'string' },
    },
    required: [
      'sectors', 'stages', 'regions', 'countries',
      'check_size_min_usd', 'check_size_max_usd', 'arr_min_usd',
      'team_size_min', 'business_model', 'semantic_query',
    ],
  },
};

module.exports = nlFilterSchema;
