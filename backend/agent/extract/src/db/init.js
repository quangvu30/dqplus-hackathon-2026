const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function initSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = initSchema;
