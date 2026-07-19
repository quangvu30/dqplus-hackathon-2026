/* Forward-only SQL migrator: applies migrations/*.sql in name order inside a tx,
 * tracked in schema_migrations. Creates the target database if it doesn't exist. */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'dqplus',
  password: process.env.DB_PASSWORD || '',
};
const dbName = process.env.DB_NAME || 'vietnexus';

async function ensureDatabase() {
  const admin = new Client({ ...cfg, database: 'postgres' });
  await admin.connect();
  const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!rows.length) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`created database ${dbName}`);
  }
  await admin.end();
}

async function migrate() {
  await ensureDatabase();
  const client = new Client({ ...cfg, database: dbName });
  await client.connect();
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())'
  );
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await client.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`applying ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      await client.end();
      console.error(`migration ${file} failed:`, err.message);
      process.exit(1);
    }
  }
  await client.end();
  console.log('migrations up to date');
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { migrate };
