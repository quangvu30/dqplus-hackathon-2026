const { Router } = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const service = require('./meetings.service');
const { draftMeetingMessage } = require('../ai/messageDraft.service');

const router = Router();
router.use(authenticate);

const draftMessageSchema = z.object({ recipientUserId: z.string().uuid() });

/**
 * @openapi
 * /api/meetings/draft-message:
 *   post:
 *     summary: AI-draft a formal meeting-request message grounded in both profiles
 *     tags: [meetings]
 */
router.post('/draft-message', validate(draftMessageSchema), async (req, res, next) => {
  try {
    res.json(await draftMeetingMessage(req.user.sub, req.body.recipientUserId));
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  recipientUserId: z.string().uuid(),
  message: z.string().max(2000).optional(),
  slots: z.array(z.object({
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
  })).min(1).max(5),
});

/**
 * @openapi
 * /api/meetings:
 *   post:
 *     summary: Request a meeting (with proposed time slots)
 *     tags: [meetings]
 */
router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.create(req.user.sub, req.body));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/meetings:
 *   get:
 *     summary: List my meetings (box=inbox|sent, status filter)
 *     tags: [meetings]
 */
router.get('/', async (req, res, next) => {
  try {
    res.json(await service.list(req.user.sub, { box: req.query.box, status: req.query.status }));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.json(await service.get(req.user.sub, req.params.id));
  } catch (err) {
    next(err);
  }
});

const acceptSchema = z.object({
  slotId: z.string().uuid(),
  meetingLink: z.string().url().optional(),
});

router.post('/:id/accept', validate(acceptSchema), async (req, res, next) => {
  try {
    res.json(await service.accept(req.user.sub, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

const declineSchema = z.object({ reason: z.string().max(1000).optional() });

router.post('/:id/decline', validate(declineSchema), async (req, res, next) => {
  try {
    res.json(await service.decline(req.user.sub, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    res.json(await service.cancel(req.user.sub, req.params.id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
