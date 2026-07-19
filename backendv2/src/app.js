require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const pool = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: err.message });
  }
});

app.use('/api/public', require('./modules/public/public.routes'));
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/onboarding', require('./modules/onboarding/onboarding.routes'));
app.use('/api/profiles', require('./modules/profiles/profiles.routes'));
app.use('/api/discover', require('./modules/discovery/discovery.routes'));
app.use('/api/documents', require('./modules/documents/documents.routes'));
app.use('/api/assessments', require('./modules/assessments/assessments.routes'));
app.use('/api/meetings', require('./modules/meetings/meetings.routes'));
app.use('/api/meetings', require('./modules/feedback/feedback.routes'));
app.use('/api/notifications', require('./modules/notifications/notifications.routes'));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
