const { Router } = require('express');
const extractionService = require('../services/extraction.service');
const embeddingService = require('../services/embedding.service');
const storeService = require('../services/store.service');
const profileSourceService = require('../services/profileSource.service');

const ROLES = ['founder', 'investor'];
const router = Router();

async function runPipeline({ userId, role, source, sourceUrl, rawInput, attributes }) {
  const embeddingText = extractionService.buildEmbeddingText(role, attributes);
  const embedding = await embeddingService.embed(embeddingText);
  return storeService.upsertExtractedProfile({ userId, role, source, sourceUrl, rawInput, attributes, embeddingText, embedding });
}

router.post('/extract/text', async (req, res, next) => {
  try {
    const { userId, role, text } = req.body;
    if (!userId || !role || !text) {
      return res.status(400).json({ error: 'userId, role and text are required' });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
    }

    const attributes = await extractionService.extractAttributes(role, text);
    const record = await runPipeline({ userId, role, source: 'text', rawInput: text, attributes });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

router.post('/extract/crawl', async (req, res, next) => {
  try {
    const { userId, role, url, content, metadata } = req.body;
    if (!userId || !role || !url || !content) {
      return res.status(400).json({ error: 'userId, role, url and content are required' });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
    }

    const extracted = await extractionService.extractAttributes(role, content);
    const attributes = metadata && typeof metadata === 'object' ? { ...extracted, ...metadata } : extracted;
    const record = await runPipeline({ userId, role, source: 'crawler', sourceUrl: url, rawInput: content, attributes });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

router.post('/extract/profile', async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const row = await profileSourceService.loadUserProfile(userId);
    if (!row) {
      return res.status(404).json({ error: 'User has no profile' });
    }

    const attributes = profileSourceService.mapProfileToAttributes(row);
    const record = await runPipeline({ userId, role: row.role, source: 'profile', attributes });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

router.get('/extracted/:userId', async (req, res, next) => {
  try {
    const record = await storeService.getExtractedProfile(req.params.userId);
    if (!record) {
      return res.status(404).json({ error: 'No extracted profile for user' });
    }
    res.json(record);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
