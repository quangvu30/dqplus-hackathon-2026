const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const service = require('./notifications.service');

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: Notification inbox (+ unread count)
 *     tags: [notifications]
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    res.json(await service.list(req.user.sub, {
      unreadOnly: String(req.query.unread) === 'true',
      page,
    }));
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    await service.markAllRead(req.user.sub);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    await service.markRead(req.user.sub, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
