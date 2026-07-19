const path = require('path');
const fs = require('fs');
const { Router } = require('express');
const multer = require('multer');
const crypto = require('crypto');
const pool = require('../../config/db');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const jobsRepo = require('../pipeline/jobs.repo');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.pdf`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf'
      && path.extname(file.originalname).toLowerCase() === '.pdf';
    cb(isPdf ? null : Object.assign(new Error('Only PDF files are accepted'), { status: 400 }), isPdf);
  },
});

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /api/documents/financial-report:
 *   post:
 *     summary: Upload a financial report PDF (founder) — triggers AI assessment
 *     tags: [documents]
 */
router.post('/financial-report', authorize('founder'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing PDF file field "file"' });
    }
    const { rows: profRows } = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1', [req.user.sub]
    );
    if (!profRows.length) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const { rows } = await pool.query(
      `INSERT INTO financial_documents (profile_id, filename, mime_type, size_bytes, storage_path)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, status, created_at`,
      [profRows[0].id, req.file.originalname, req.file.mimetype, req.file.size, req.file.path]
    );
    const doc = rows[0];
    await jobsRepo.enqueue(pool, {
      userId: req.user.sub,
      type: 'financial_assessment',
      payload: { document_id: doc.id },
    });
    res.status(201).json({ id: doc.id, status: doc.status, createdAt: doc.created_at });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/documents/{id}:
 *   get:
 *     summary: Document processing status (owner only)
 *     tags: [documents]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT fd.id, fd.filename, fd.status, fd.created_at, p.user_id
       FROM financial_documents fd JOIN profiles p ON p.id = fd.profile_id
       WHERE fd.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Document not found' });
    if (rows[0].user_id !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
    const { user_id, ...doc } = rows[0];
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
