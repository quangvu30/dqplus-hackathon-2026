const { Router } = require('express');
const pool = require('../../config/db');

const router = Router();

/**
 * @openapi
 * /api/public/featured:
 *   get:
 *     summary: Featured profiles for the landing page (no auth)
 *     security: []
 *     tags: [public]
 */
router.get('/featured', async (req, res, next) => {
  try {
    const role = ['founder', 'investor'].includes(req.query.role) ? req.query.role : null;
    const limit = Math.min(12, Math.max(1, Number(req.query.limit) || 6));
    const params = [];
    let where = '';
    if (role) {
      params.push(role);
      where = `WHERE p.role = $1`;
    }
    // Featured first, then newest — the landing page always has content.
    const { rows } = await pool.query(
      `SELECT p.id AS profile_id, p.role, p.display_name, p.headline, p.country,
              p.sectors, p.stage, p.stages, p.investor_type, p.featured
       FROM profiles p
       ${where}
       ORDER BY p.featured DESC, p.created_at DESC
       LIMIT ${limit}`,
      params
    );
    res.json({
      items: rows.map((r) => ({
        profileId: r.profile_id,
        role: r.role,
        displayName: r.display_name,
        headline: r.headline,
        country: r.country,
        sectors: r.sectors || [],
        stage: r.stage,
        stages: r.stages || [],
        investorType: r.investor_type,
        featured: r.featured,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
