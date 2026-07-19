const { Router } = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const authService = require('./auth.service');

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in with email + password
 *     security: []
 *     tags: [auth]
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    res.json(await authService.login(req.body));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Current user
 *     tags: [auth]
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    res.json(await authService.getMe(req.user.sub));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
