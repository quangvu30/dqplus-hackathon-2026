const { Router } = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const service = require('./onboarding.service');

const router = Router();

const submitSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1),
  role: z.enum(['founder', 'investor']),
  profile: z.object({
    displayName: z.string().min(1),
    headline: z.string().optional(),
    country: z.string().optional(),
    sectors: z.array(z.string()).default([]),
    regions: z.array(z.string()).default([]),
    website: z.string().optional(),
    bio: z.string().optional(),
    experience: z.string().optional(),
    // founder
    stage: z.string().optional(),
    teamSize: z.number().int().positive().optional(),
    arrUsd: z.number().nonnegative().optional(),
    fundingAskUsd: z.number().nonnegative().optional(),
    businessModel: z.string().optional(),
    productDescription: z.string().optional(),
    traction: z.string().optional(),
    lookingFor: z.array(z.string()).optional(),
    insideInfo: z.record(z.any()).optional(),
    insideInfoVisibility: z.enum(['private', 'members', 'public']).optional(),
    // investor
    investorType: z.string().optional(),
    stages: z.array(z.string()).optional(),
    checkSizeMinUsd: z.number().nonnegative().optional(),
    checkSizeMaxUsd: z.number().nonnegative().optional(),
    thesis: z.string().optional(),
    portfolioHighlights: z.array(z.string()).optional(),
  }),
});

/**
 * @openapi
 * /api/onboarding/submit:
 *   post:
 *     summary: Create account + profile, start the AI extraction pipeline
 *     security: []
 *     tags: [onboarding]
 */
router.post('/submit', validate(submitSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.submit(req.body));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/onboarding/status:
 *   get:
 *     summary: Extraction pipeline status for the current user (polled after signup)
 *     tags: [onboarding]
 */
router.get('/status', authenticate, async (req, res, next) => {
  try {
    res.json(await service.status(req.user.sub));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
