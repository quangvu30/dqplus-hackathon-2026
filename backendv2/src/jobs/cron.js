/* Meeting completion sweep: every minute, flip overdue accepted meetings to
 * completed and ask both parties for feedback. Idempotent and restart-safe. */
const cron = require('node-cron');
const pool = require('../config/db');
const { notify } = require('../modules/notifications/notifications.service');

async function sweep() {
  const { rows } = await pool.query(
    `UPDATE meetings
     SET status = 'completed', feedback_requested_at = now(), updated_at = now()
     WHERE status = 'accepted'
       AND scheduled_at + (duration_min * interval '1 minute') < now()
     RETURNING id, requester_user_id, recipient_user_id`
  );
  for (const m of rows) {
    const payload = {
      type: 'feedback_requested',
      title: 'How was your meeting?',
      body: 'Your meeting has ended — a quick rating helps us improve your matches.',
      data: { meeting_id: m.id },
    };
    await notify(m.requester_user_id, payload);
    await notify(m.recipient_user_id, payload);
  }
  if (rows.length) console.log(`meeting sweep: completed ${rows.length} meeting(s)`);
}

function start() {
  const task = cron.schedule('* * * * *', () => {
    sweep().catch((err) => console.error('meeting sweep failed:', err.message));
  });
  console.log('meeting completion cron started (every minute)');
  return task;
}

module.exports = { start, sweep };
