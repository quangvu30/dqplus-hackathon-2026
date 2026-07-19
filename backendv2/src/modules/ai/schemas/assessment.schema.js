const assessmentSchema = {
  name: 'financial_assessment',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary_en: { type: 'string' },
      summary_vi: { type: 'string' },
      strengths: { type: 'array', items: { type: 'string' } },
      risks: { type: 'array', items: { type: 'string' } },
      key_metrics: {
        type: 'object',
        additionalProperties: false,
        properties: {
          revenue_usd: { type: ['number', 'null'] },
          yoy_growth_pct: { type: ['number', 'null'] },
          burn_rate_usd: { type: ['number', 'null'] },
          runway_months: { type: ['number', 'null'] },
          gross_margin_pct: { type: ['number', 'null'] },
        },
        required: ['revenue_usd', 'yoy_growth_pct', 'burn_rate_usd', 'runway_months', 'gross_margin_pct'],
      },
      confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    },
    required: ['summary_en', 'summary_vi', 'strengths', 'risks', 'key_metrics', 'confidence'],
  },
};

module.exports = assessmentSchema;
