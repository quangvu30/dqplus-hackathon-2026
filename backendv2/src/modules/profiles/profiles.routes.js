const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const service = require('./profiles.service');
const { getMe: getAuthMe } = require('../auth/auth.service');

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /api/profiles/me:
 *   get:
 *     summary: Current user's profile
 *     tags: [profiles]
 */
router.get('/me', async (req, res, next) => {
  try {
    res.json(await service.getMe(req.user.sub));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/profiles/me:
 *   put:
 *     summary: Update own profile (re-runs AI extraction)
 *     tags: [profiles]
 */
router.put('/me', async (req, res, next) => {
  try {
    const me = await getAuthMe(req.user.sub);
    res.json(await service.updateMe(req.user.sub, req.user.role, me.fullName, req.body || {}));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/profiles/{id}:
 *   get:
 *     summary: View a profile (inside info visibility-gated, assessment embedded)
 *     tags: [profiles]
 */
router.get('/:id', async (req, res, next) => {
  try {
    res.json(await service.getView(req.user.sub, req.params.id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
