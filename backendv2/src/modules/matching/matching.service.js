/* Hybrid matcher, ported from backend/matching-engine and extended with a
 * feedback-relevance stage:
 *   1) recall: pgvector HNSW cosine top-N opposite-role candidates (+ facet filters)
 *   2) hybrid: 0.7 * vector + 0.3 * attribute (explainable reasons[])
 *   3) feedback: quality prior from ratings + per-pair adjustment from meeting history */
const pool = require('../../config/db');
const { scoreMatch } = require('./scoring');

const VECTOR_WEIGHT = Number(process.env.MATCH_VECTOR_WEIGHT) || 0.7;
const ATTR_WEIGHT = Number(process.env.MATCH_ATTR_WEIGHT) || 0.3;
const CANDIDATE_POOL = Number(process.env.MATCH_CANDIDATE_POOL) || 50;

async function findMatches({ userId, limit = 10, filters = {} }) {
  const { rows: meRows } = await pool.query(
    'SELECT role, attributes FROM extracted_profiles WHERE user_id = $1',
    [userId]
  );
  if (!meRows.length) {
    const err = new Error('No extracted profile for user; extraction pipeline has not finished');
    err.status = 404;
    throw err;
  }
  const me = meRows[0];
  const targetRole = me.role === 'founder' ? 'investor' : 'founder';

  const conditions = ['ep.role = $2', 'ep.user_id <> $1'];
  const params = [userId, targetRole];

  if (filters.sector) {
    params.push(String(filters.sector).toLowerCase());
    conditions.push(`$${params.length} = ANY(p.sectors)`);
  }
  if (filters.stage) {
    params.push(String(filters.stage).toLowerCase());
    conditions.push(
      targetRole === 'investor' ? `$${params.length} = ANY(p.stages)` : `p.stage = $${params.length}`
    );
  }
  if (filters.region) {
    params.push(String(filters.region).toLowerCase());
    conditions.push(`$${params.length} = ANY(p.regions)`);
  }

  const { rows: candidates } = await pool.query(
    `WITH me AS (
       SELECT embedding FROM extracted_profiles WHERE user_id = $1
     )
     SELECT ep.user_id, ep.attributes,
            1 - (ep.embedding <=> me.embedding) AS vector_score,
            p.id AS profile_id, p.display_name, p.headline, p.country,
            p.sectors, p.regions, p.stage, p.stages,
            fq.avg_rating,
            pair.was_declined, pair.negative_feedback, pair.warm_pair
     FROM extracted_profiles ep
     JOIN profiles p ON p.user_id = ep.user_id
     CROSS JOIN me
     LEFT JOIN LATERAL (
       SELECT avg(rating)::float AS avg_rating
       FROM feedback WHERE about_user_id = ep.user_id
     ) fq ON true
     LEFT JOIN LATERAL (
       SELECT
         bool_or(m.status = 'declined') AS was_declined,
         bool_or(f.would_proceed = false) AS negative_feedback,
         bool_or(m.status = 'completed' AND f.rating >= 4) AS warm_pair
       FROM meetings m
       LEFT JOIN feedback f ON f.meeting_id = m.id
       WHERE (m.requester_user_id = $1 AND m.recipient_user_id = ep.user_id)
          OR (m.recipient_user_id = $1 AND m.requester_user_id = ep.user_id)
     ) pair ON true
     WHERE ${conditions.join(' AND ')}
     ORDER BY ep.embedding <=> me.embedding
     LIMIT ${CANDIDATE_POOL}`,
    params
  );

  const matches = candidates
    .map((c) => {
      const vectorScore = Number(c.vector_score);
      const { attributeScore, reasons } = scoreMatch(me.role, me.attributes, c.attributes);
      const hybrid = VECTOR_WEIGHT * vectorScore + ATTR_WEIGHT * attributeScore;

      // Stage 3: relevance-feedback adjustment.
      let adjustment = 0;
      if (c.avg_rating != null) adjustment += 0.05 * ((c.avg_rating - 3) / 2);
      if (c.was_declined || c.negative_feedback) {
        adjustment -= 0.15;
        reasons.push('previously declined or negative feedback between you');
      } else if (c.warm_pair) {
        adjustment += 0.1;
        reasons.push('you already had a well-rated meeting');
      }

      return {
        userId: c.user_id,
        profileId: c.profile_id,
        displayName: c.display_name,
        headline: c.headline,
        country: c.country,
        sectors: c.sectors || [],
        regions: c.regions || [],
        stage: c.stage,
        stages: c.stages || [],
        score: Number((hybrid + adjustment).toFixed(4)),
        vectorScore: Number(vectorScore.toFixed(4)),
        attributeScore: Number(attributeScore.toFixed(4)),
        feedbackAdjustment: Number(adjustment.toFixed(4)),
        attributes: c.attributes,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { userId, role: me.role, targetRole, attributes: me.attributes, matches };
}

module.exports = { findMatches };
