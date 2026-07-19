const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const { latestAssessment } = require('../profiles/profiles.service');

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /api/assessments/profile/{profileId}:
 *   get:
 *     summary: Latest AI financial assessment for a founder profile
 *     tags: [assessments]
 */
router.get('/profile/:profileId', async (req, res, next) => {
  try {
    const assessment = await latestAssessment(req.params.profileId);
    if (!assessment) return res.status(404).json({ error: 'No assessment yet' });
    res.json(assessment);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
