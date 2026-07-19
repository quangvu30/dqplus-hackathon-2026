require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'dqplus',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vietnexus',
  max: 10,
});

pool.on('error', (err) => {
  console.error('unexpected pg pool error', err);
});

module.exports = pool;
