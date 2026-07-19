const pool = require('../../config/db');

async function submit(userId, meetingId, { rating, wouldProceed, comment }) {
  const { rows } = await pool.query('SELECT * FROM meetings WHERE id = $1', [meetingId]);
  if (!rows.length) {
    const err = new Error('Meeting not found');
    err.status = 404;
    throw err;
  }
  const meeting = rows[0];
  if (meeting.requester_user_id !== userId && meeting.recipient_user_id !== userId) {
    const err = new Error('Not a participant of this meeting');
    err.status = 403;
    throw err;
  }
  if (meeting.status !== 'completed') {
    const err = new Error('Feedback is only accepted for completed meetings');
    err.status = 409;
    throw err;
  }
  const aboutUserId = meeting.requester_user_id === userId
    ? meeting.recipient_user_id : meeting.requester_user_id;

  try {
    const { rows: fbRows } = await pool.query(
      `INSERT INTO feedback (meeting_id, from_user_id, about_user_id, rating, would_proceed, comment)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [meetingId, userId, aboutUserId, rating, wouldProceed ?? null, comment || null]
    );
    return { id: fbRows[0].id, createdAt: fbRows[0].created_at };
  } catch (err) {
    if (err.code === '23505') {
      const conflict = new Error('Feedback already submitted for this meeting');
      conflict.status = 409;
      throw conflict;
    }
    throw err;
  }
}

module.exports = { submit };
