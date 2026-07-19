/* In-process pipeline worker: polls pipeline_jobs and runs the AI pipeline.
 * profile_extraction: raw text -> LLM attributes -> canonicalize -> embed -> upsert.
 * financial_assessment: PDF -> pdf-parse -> LLM assessment -> assessments row. */
const fs = require('fs/promises');
const pgvector = require('pgvector');
const pool = require('../../config/db');
const jobsRepo = require('./jobs.repo');
const { extractAttributes, buildEmbeddingText } = require('../ai/extraction.service');
const { embed } = require('../ai/embedding.service');
const { assessFinancialReport } = require('../ai/assessment.service');
const { normalizeSectors, canonStage, canonStages, normalizeRegions } = require('../../lib/sectors');
const { notify } = require('../notifications/notifications.service');

const POLL_MS = Number(process.env.PIPELINE_POLL_MS) || 3000;

// Merge structured form values over LLM output: form wins when the LLM returned
// null/[] (also what keeps the keyless-fallback path fully functional).
function overlayFormAttributes(role, attrs, profile) {
  const merged = { ...attrs };
  if (role === 'founder') {
    merged.company_name = attrs.company_name || profile.display_name;
    merged.industry = attrs.industry?.length ? attrs.industry : profile.sectors || [];
    merged.stage = attrs.stage || profile.stage;
    merged.country = attrs.country || profile.country;
    merged.target_regions = attrs.target_regions?.length ? attrs.target_regions : profile.regions || [];
    merged.team_size = attrs.team_size ?? profile.team_size;
    merged.arr_usd = attrs.arr_usd ?? (profile.arr_usd != null ? Number(profile.arr_usd) : null);
    merged.funding_ask_usd = attrs.funding_ask_usd ?? (profile.funding_ask_usd != null ? Number(profile.funding_ask_usd) : null);
    merged.business_model = attrs.business_model || profile.business_model;
    merged.product_description = attrs.product_description || profile.details?.productDescription || null;
    merged.traction_summary = attrs.traction_summary || profile.details?.traction || null;
    merged.looking_for = attrs.looking_for?.length ? attrs.looking_for : profile.details?.lookingFor || [];
    merged.industry = normalizeSectors(merged.industry);
    merged.stage = canonStage(merged.stage);
    merged.target_regions = normalizeRegions(merged.target_regions);
  } else {
    merged.firm_name = attrs.firm_name || profile.display_name;
    merged.investor_type = attrs.investor_type || profile.investor_type;
    merged.sectors = attrs.sectors?.length ? attrs.sectors : profile.sectors || [];
    merged.stages = attrs.stages?.length ? attrs.stages : profile.stages || [];
    merged.geographies = attrs.geographies?.length ? attrs.geographies : profile.regions || [];
    merged.check_size_min_usd = attrs.check_size_min_usd ?? (profile.check_size_min_usd != null ? Number(profile.check_size_min_usd) : null);
    merged.check_size_max_usd = attrs.check_size_max_usd ?? (profile.check_size_max_usd != null ? Number(profile.check_size_max_usd) : null);
    merged.thesis = attrs.thesis || profile.details?.thesis || null;
    merged.portfolio_highlights = attrs.portfolio_highlights?.length
      ? attrs.portfolio_highlights : profile.details?.portfolioHighlights || [];
    merged.sectors = normalizeSectors(merged.sectors);
    merged.stages = canonStages(merged.stages);
    merged.geographies = normalizeRegions(merged.geographies);
  }
  return merged;
}

async function runProfileExtraction(job) {
  const { rows } = await pool.query(
    `SELECT u.role, u.full_name, p.*
     FROM users u JOIN profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [job.user_id]
  );
  if (!rows.length) throw new Error('profile not found for extraction');
  const profile = rows[0];
  const role = profile.role;
  const text = profile.onboarding_raw_text || `${profile.display_name} (${role})`;

  const rawAttrs = await extractAttributes(role, text, { userId: job.user_id });
  const attrs = overlayFormAttributes(role, rawAttrs, profile);

  // Write canonical facets back to profiles so browse filters agree with matching.
  if (role === 'founder') {
    await pool.query(
      `UPDATE profiles SET sectors = $2, regions = $3, stage = $4, updated_at = now() WHERE user_id = $1`,
      [job.user_id, attrs.industry, attrs.target_regions, attrs.stage]
    );
  } else {
    await pool.query(
      `UPDATE profiles SET sectors = $2, regions = $3, stages = $4, updated_at = now() WHERE user_id = $1`,
      [job.user_id, attrs.sectors, attrs.geographies, attrs.stages]
    );
  }

  const embeddingText = buildEmbeddingText(role, attrs);
  const { vector, provider } = await embed(embeddingText, { userId: job.user_id });

  await pool.query(
    `INSERT INTO extracted_profiles (user_id, role, attributes, embedding_text, embedding, embedding_provider)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       role = EXCLUDED.role,
       attributes = EXCLUDED.attributes,
       embedding_text = EXCLUDED.embedding_text,
       embedding = EXCLUDED.embedding,
       embedding_provider = EXCLUDED.embedding_provider,
       updated_at = now()`,
    [job.user_id, role, JSON.stringify(attrs), embeddingText, pgvector.toSql(vector), provider]
  );
}

async function runFinancialAssessment(job) {
  const documentId = job.payload?.document_id;
  const { rows } = await pool.query(
    `SELECT fd.*, p.user_id AS owner_user_id
     FROM financial_documents fd JOIN profiles p ON p.id = fd.profile_id
     WHERE fd.id = $1`,
    [documentId]
  );
  if (!rows.length) throw new Error('financial document not found');
  const doc = rows[0];

  try {
    let text = doc.parsed_text;
    if (!text) {
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const buffer = await fs.readFile(doc.storage_path);
      const parsed = await pdfParse(buffer);
      text = parsed.text || '';
      await pool.query(
        `UPDATE financial_documents SET parsed_text = $2, status = 'parsed' WHERE id = $1`,
        [doc.id, text]
      );
    }

    const assessment = await assessFinancialReport(text, { userId: doc.owner_user_id });
    await pool.query(
      `INSERT INTO assessments (profile_id, document_id, summary_en, summary_vi, strengths, risks, key_metrics, confidence, model)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        doc.profile_id, doc.id,
        assessment.summary_en, assessment.summary_vi,
        JSON.stringify(assessment.strengths), JSON.stringify(assessment.risks),
        JSON.stringify(assessment.key_metrics), assessment.confidence, assessment.model,
      ]
    );
    await pool.query(
      `UPDATE financial_documents SET status = 'assessed' WHERE id = $1`, [doc.id]
    );
    await notify(doc.owner_user_id, {
      type: 'assessment_ready',
      title: 'Your financial assessment is ready',
      body: 'The AI review of your uploaded financial report is now visible on your profile.',
      data: { profile_id: doc.profile_id, document_id: doc.id },
      email: false,
    });
  } catch (err) {
    await pool.query(`UPDATE financial_documents SET status = 'failed' WHERE id = $1`, [doc.id]);
    throw err;
  }
}

const HANDLERS = {
  profile_extraction: runProfileExtraction,
  financial_assessment: runFinancialAssessment,
};

let ticking = false;

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    // Drain all runnable jobs each tick.
    for (;;) {
      const job = await jobsRepo.claimNext();
      if (!job) break;
      try {
        await HANDLERS[job.type](job);
        await jobsRepo.markDone(job.id);
        console.log(`pipeline job ${job.id} (${job.type}) done`);
      } catch (err) {
        console.error(`pipeline job ${job.id} (${job.type}) failed:`, err.message);
        await jobsRepo.markFailed(job, err);
      }
    }
  } finally {
    ticking = false;
  }
}

function start() {
  const timer = setInterval(tick, POLL_MS);
  timer.unref();
  console.log(`pipeline worker polling every ${POLL_MS}ms`);
  return timer;
}

module.exports = { start, tick };
