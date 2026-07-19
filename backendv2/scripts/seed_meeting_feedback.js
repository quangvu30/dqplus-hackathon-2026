/* Creates one completed meeting between a given investor and a founder, then
 * submits feedback from the investor about that meeting. Runs through the
 * real service functions (create -> accept) so notifications/state machine
 * rules apply; only the accepted->completed flip is done directly since that
 * normally happens via the cron sweep (jobs/cron.js) once the scheduled time
 * has passed. Usage: node scripts/seed_meeting_feedback.js <investor-email> [founder-email] */
require('dotenv').config();
const pool = require('../src/config/db');
const meetings = require('../src/modules/meetings/meetings.service');
const feedback = require('../src/modules/feedback/feedback.service');

const INVESTOR_EMAIL = process.argv[2] || 'minh.kim8@sample-investor.dev';
const FOUNDER_EMAIL = process.argv[3] || null;

async function main() {
  const { rows: investorRows } = await pool.query(
    `SELECT u.id, p.display_name FROM users u JOIN profiles p ON p.user_id = u.id
     WHERE u.email = $1 AND p.role = 'investor'`,
    [INVESTOR_EMAIL]
  );
  if (!investorRows.length) throw new Error(`Investor not found: ${INVESTOR_EMAIL}`);
  const investor = investorRows[0];

  let founder;
  if (FOUNDER_EMAIL) {
    const { rows } = await pool.query(
      `SELECT u.id, p.display_name FROM users u JOIN profiles p ON p.user_id = u.id
       WHERE u.email = $1 AND p.role = 'founder'`,
      [FOUNDER_EMAIL]
    );
    if (!rows.length) throw new Error(`Founder not found: ${FOUNDER_EMAIL}`);
    founder = rows[0];
  } else {
    const { rows } = await pool.query(
      `SELECT u.id, p.display_name FROM users u JOIN profiles p ON p.user_id = u.id
       WHERE p.role = 'founder' AND NOT EXISTS (
         SELECT 1 FROM meetings m WHERE (m.requester_user_id = u.id OR m.recipient_user_id = u.id)
       )
       ORDER BY u.created_at DESC LIMIT 1`
    );
    if (!rows.length) throw new Error('No founder without an existing meeting found; pass one explicitly.');
    founder = rows[0];
  }

  console.log(`investor: ${investor.display_name} <${INVESTOR_EMAIL}>`);
  console.log(`founder:  ${founder.display_name}`);

  const startsAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  const endsAt = new Date(startsAt.getTime() + 45 * 60000);

  const created = await meetings.create(investor.id, {
    recipientUserId: founder.id,
    message: `Loved your traction numbers — would like to discuss a potential check for ${founder.display_name}.`,
    slots: [{ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }],
  });
  console.log('meeting created:', created.id);

  const slotId = created.slots[0].id;
  await meetings.accept(founder.id, created.id, { slotId, meetingLink: 'https://meet.vietnexus.dev/demo-room' });
  console.log('meeting accepted, scheduled at', startsAt.toISOString());

  // Normally flipped by jobs/cron.js once scheduled_at + duration has passed;
  // done directly here since the slot above is already in the past.
  await pool.query(
    `UPDATE meetings SET status = 'completed', feedback_requested_at = now(), updated_at = now() WHERE id = $1`,
    [created.id]
  );
  console.log('meeting marked completed');

  const fb = await feedback.submit(investor.id, created.id, {
    rating: 5,
    wouldProceed: true,
    comment: `Great conversation with ${founder.display_name} — clear metrics, strong founder-market fit. Moving to term sheet discussion.`,
  });
  console.log('feedback submitted:', fb.id);

  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
