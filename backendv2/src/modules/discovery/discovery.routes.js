const { Router } = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const service = require('./discovery.service');

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /api/discover:
 *   get:
 *     summary: Browse the full opposite-role list with facet filters
 *     tags: [discovery]
 */
router.get('/', async (req, res, next) => {
  try {
    res.json(await service.browse(req.user, req.query));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/discover/recommended:
 *   get:
 *     summary: Algorithmic recommendations (hybrid matching, optional LLM re-rank)
 *     tags: [discovery]
 */
router.get('/recommended', async (req, res, next) => {
  try {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
    const useRerank = String(req.query.rerank) === 'true';
    res.json(await service.recommended(req.user, { limit, useRerank }));
  } catch (err) {
    next(err);
  }
});

const nlSchema = z.object({ query: z.string().min(3).max(500) });

/**
 * @openapi
 * /api/discover/nl-filter:
 *   post:
 *     summary: Advanced LLM filter — natural-language query to filters + semantic ranking
 *     tags: [discovery]
 */
router.post('/nl-filter', validate(nlSchema), async (req, res, next) => {
  try {
    res.json(await service.nlFilter(req.user, req.body.query));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
