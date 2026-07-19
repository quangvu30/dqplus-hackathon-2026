const pool = require('../../config/db');
const { sendEmail } = require('./email.service');

// Insert an in-app notification and (optionally) email the user. Email failure
// never fails the calling request — it only marks email_status.
async function notify(userId, { type, title, body = null, data = {}, email = true }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, type, title, body, JSON.stringify(data)]
  );
  const id = rows[0].id;

  if (email) {
    const { rows: userRows } = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userRows.length) {
      const status = await sendEmail(userRows[0].email, `VietNexus: ${title}`, body || title);
      await pool.query('UPDATE notifications SET email_status = $2 WHERE id = $1', [id, status]);
    }
  }
  return id;
}

async function list(userId, { unreadOnly = false, page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const cond = unreadOnly ? 'AND read_at IS NULL' : '';
  const { rows } = await pool.query(
    `SELECT id, type, title, body, data, read_at, created_at
     FROM notifications
     WHERE user_id = $1 ${cond}
     ORDER BY created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId]
  );
  const { rows: countRows } = await pool.query(
    'SELECT count(*)::int AS unread FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
  return { items: rows, unreadCount: countRows[0].unread };
}

async function markRead(userId, id) {
  await pool.query(
    'UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL',
    [id, userId]
  );
}

async function markAllRead(userId) {
  await pool.query(
    'UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
}

module.exports = { notify, list, markRead, markAllRead };
