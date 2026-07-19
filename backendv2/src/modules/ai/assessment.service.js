const { client, hasKey, CHAT_MODEL } = require('../../config/openai');
const assessmentSchema = require('./schemas/assessment.schema');
const { trackedCompletion } = require('./usage.service');

const SYSTEM_PROMPT = `You are a financial analyst reviewing a startup's financial report for an investor-matching platform.
Rules:
- Use ONLY figures and facts present in the document. Set metrics to null when absent.
- NEVER invent numbers, growth rates, or history.
- strengths/risks: 3-5 short bullet statements each, grounded in the document.
- summary_en: 3-4 sentences in English. summary_vi: the same summary in natural Vietnamese.
- confidence reflects how complete and reliable the document's data is.`;

// Keep head + tail of long documents so totals/summary pages survive truncation.
function clipText(text, max = 15000) {
  if (text.length <= max) return text;
  const head = text.slice(0, Math.floor(max * 0.7));
  const tail = text.slice(-Math.floor(max * 0.3));
  return `${head}\n...[truncated]...\n${tail}`;
}

async function assessFinancialReport(text, { userId = null } = {}) {
  if (!hasKey) {
    // Keyless fallback keeps the flow demoable without inventing analysis.
    return {
      summary_en: 'Automated assessment unavailable (no LLM key configured). The uploaded report is stored and can be reviewed manually.',
      summary_vi: 'Chưa thể đánh giá tự động (chưa cấu hình LLM key). Báo cáo đã được lưu và có thể xem thủ công.',
      strengths: [],
      risks: [],
      key_metrics: { revenue_usd: null, yoy_growth_pct: null, burn_rate_usd: null, runway_months: null, gross_margin_pct: null },
      confidence: 'low',
      model: null,
    };
  }
  const completion = await trackedCompletion(client, {
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Assess this financial report:\n\n${clipText(String(text || ''))}` },
    ],
    response_format: { type: 'json_schema', json_schema: assessmentSchema },
  }, { userId, feature: 'assessment' });
  const result = JSON.parse(completion.choices[0].message.content);
  result.model = CHAT_MODEL;
  return result;
}

module.exports = { assessFinancialReport };
