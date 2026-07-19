const rerankSchema = {
  name: 'match_rerank',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      matches: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            candidate_id: { type: 'string' },
            composite: { type: 'integer' },
            rationale_en: { type: 'string' },
          },
          required: ['candidate_id', 'composite', 'rationale_en'],
        },
      },
    },
    required: ['matches'],
  },
};

module.exports = rerankSchema;
