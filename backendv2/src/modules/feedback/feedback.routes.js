const { Router } = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const service = require('./feedback.service');

// Mounted at /api/meetings — provides POST /api/meetings/:id/feedback.
const router = Router();
router.use(authenticate);

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  wouldProceed: z.boolean().optional(),
  comment: z.string().max(2000).optional(),
});

/**
 * @openapi
 * /api/meetings/{id}/feedback:
 *   post:
 *     summary: Submit post-meeting feedback (feeds the matching feedback loop)
 *     tags: [feedback]
 */
router.post('/:id/feedback', validate(feedbackSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.submit(req.user.sub, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
