const pool = require('../../config/db');

const MAX_ATTEMPTS = 3;

async function enqueue(client, { userId = null, type, payload = {} }) {
  const { rows } = await client.query(
    `INSERT INTO pipeline_jobs (user_id, type, payload) VALUES ($1, $2, $3) RETURNING id`,
    [userId, type, JSON.stringify(payload)]
  );
  return rows[0].id;
}

// Atomically claim the oldest runnable job (FOR UPDATE SKIP LOCKED keeps this safe
// if more than one worker process ever runs).
async function claimNext() {
  const { rows } = await pool.query(
    `UPDATE pipeline_jobs SET status = 'running', attempts = attempts + 1, updated_at = now()
     WHERE id = (
       SELECT id FROM pipeline_jobs
       WHERE status = 'pending' AND run_after <= now()
       ORDER BY id
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING *`
  );
  return rows[0] || null;
}

async function markDone(id) {
  await pool.query(
    `UPDATE pipeline_jobs SET status = 'done', last_error = NULL, updated_at = now() WHERE id = $1`,
    [id]
  );
}

async function markFailed(job, error) {
  const message = String(error?.message || error).slice(0, 2000);
  if (job.attempts >= MAX_ATTEMPTS) {
    await pool.query(
      `UPDATE pipeline_jobs SET status = 'failed', last_error = $2, updated_at = now() WHERE id = $1`,
      [job.id, message]
    );
  } else {
    // exponential-ish backoff: 30s * attempts
    await pool.query(
      `UPDATE pipeline_jobs
       SET status = 'pending', last_error = $2, run_after = now() + ($3 * interval '1 second'), updated_at = now()
       WHERE id = $1`,
      [job.id, message, 30 * job.attempts]
    );
  }
}

async function latestForUser(userId, type) {
  const { rows } = await pool.query(
    `SELECT id, type, status, attempts, last_error, created_at, updated_at
     FROM pipeline_jobs WHERE user_id = $1 AND type = $2
     ORDER BY id DESC LIMIT 1`,
    [userId, type]
  );
  return rows[0] || null;
}

module.exports = { enqueue, claimNext, markDone, markFailed, latestForUser, MAX_ATTEMPTS };
