const pool = require('../../config/db');
const { assertTransition } = require('./transitions');
const { notify } = require('../notifications/notifications.service');

async function loadMeeting(client, id) {
  const { rows } = await client.query('SELECT * FROM meetings WHERE id = $1 FOR UPDATE', [id]);
  if (!rows.length) {
    const err = new Error('Meeting not found');
    err.status = 404;
    throw err;
  }
  return rows[0];
}

async function counterpartName(userId) {
  const { rows } = await pool.query(
    `SELECT u.full_name, p.display_name FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
    [userId]
  );
  return rows[0]?.display_name || rows[0]?.full_name || 'A member';
}

async function create(requesterId, { recipientUserId, message, slots = [] }) {
  if (recipientUserId === requesterId) {
    const err = new Error('Cannot request a meeting with yourself');
    err.status = 400;
    throw err;
  }
  const { rows: recipientRows } = await pool.query('SELECT id FROM users WHERE id = $1', [recipientUserId]);
  if (!recipientRows.length) {
    const err = new Error('Recipient not found');
    err.status = 404;
    throw err;
  }

  const client = await pool.connect();
  let meeting;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO meetings (requester_user_id, recipient_user_id, message)
       VALUES ($1, $2, $3) RETURNING *`,
      [requesterId, recipientUserId, message || null]
    );
    meeting = rows[0];
    for (const slot of slots) {
      await client.query(
        `INSERT INTO meeting_slots (meeting_id, proposed_by, starts_at, ends_at)
         VALUES ($1, $2, $3, $4)`,
        [meeting.id, requesterId, slot.startsAt, slot.endsAt]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const requesterName = await counterpartName(requesterId);
  await notify(recipientUserId, {
    type: 'meeting_requested',
    title: `${requesterName} requested a meeting`,
    body: message || 'Open your meeting requests to accept or decline.',
    data: { meeting_id: meeting.id },
  });
  return get(requesterId, meeting.id);
}

async function accept(userId, meetingId, { slotId, meetingLink }) {
  const client = await pool.connect();
  let meeting;
  try {
    await client.query('BEGIN');
    meeting = await loadMeeting(client, meetingId);
    assertTransition('accept', meeting, userId);

    const { rows: slotRows } = await client.query(
      'SELECT * FROM meeting_slots WHERE id = $1 AND meeting_id = $2',
      [slotId, meetingId]
    );
    if (!slotRows.length) {
      const err = new Error('Slot not found for this meeting');
      err.status = 404;
      throw err;
    }
    const slot = slotRows[0];
    const durationMin = Math.max(15, Math.round((new Date(slot.ends_at) - new Date(slot.starts_at)) / 60000));

    await client.query('UPDATE meeting_slots SET is_selected = true WHERE id = $1', [slotId]);
    await client.query(
      `UPDATE meetings SET status = 'accepted', scheduled_at = $2, duration_min = $3,
              meeting_link = $4, updated_at = now() WHERE id = $1`,
      [meetingId, slot.starts_at, durationMin, meetingLink || null]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const accepterName = await counterpartName(userId);
  await notify(meeting.requester_user_id, {
    type: 'meeting_accepted',
    title: `${accepterName} accepted your meeting request`,
    body: 'The meeting is scheduled. Check your upcoming meetings for the time.',
    data: { meeting_id: meetingId },
  });
  return get(userId, meetingId);
}

async function decline(userId, meetingId, { reason }) {
  const client = await pool.connect();
  let meeting;
  try {
    await client.query('BEGIN');
    meeting = await loadMeeting(client, meetingId);
    assertTransition('decline', meeting, userId);
    await client.query(
      `UPDATE meetings SET status = 'declined', decline_reason = $2, updated_at = now() WHERE id = $1`,
      [meetingId, reason || null]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const declinerName = await counterpartName(userId);
  await notify(meeting.requester_user_id, {
    type: 'meeting_declined',
    title: `${declinerName} declined your meeting request`,
    body: reason || null,
    data: { meeting_id: meetingId },
  });
  return get(userId, meetingId);
}

async function cancel(userId, meetingId) {
  const client = await pool.connect();
  let meeting;
  try {
    await client.query('BEGIN');
    meeting = await loadMeeting(client, meetingId);
    assertTransition('cancel', meeting, userId);
    await client.query(
      `UPDATE meetings SET status = 'cancelled', updated_at = now() WHERE id = $1`,
      [meetingId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const other = meeting.requester_user_id === userId ? meeting.recipient_user_id : meeting.requester_user_id;
  const cancellerName = await counterpartName(userId);
  await notify(other, {
    type: 'meeting_cancelled',
    title: `${cancellerName} cancelled your meeting`,
    data: { meeting_id: meetingId },
  });
  return get(userId, meetingId);
}

const MEETING_SELECT = `
  SELECT m.*,
         ru.full_name AS requester_name, rp.display_name AS requester_display, rp.id AS requester_profile_id,
         cu.full_name AS recipient_name, cp.display_name AS recipient_display, cp.id AS recipient_profile_id
  FROM meetings m
  JOIN users ru ON ru.id = m.requester_user_id
  JOIN users cu ON cu.id = m.recipient_user_id
  LEFT JOIN profiles rp ON rp.user_id = m.requester_user_id
  LEFT JOIN profiles cp ON cp.user_id = m.recipient_user_id`;

function shape(row, viewerId, slots, feedbackGiven) {
  const iAmRequester = row.requester_user_id === viewerId;
  return {
    id: row.id,
    status: row.status,
    message: row.message,
    scheduledAt: row.scheduled_at,
    durationMin: row.duration_min,
    meetingLink: row.meeting_link,
    declineReason: row.decline_reason,
    createdAt: row.created_at,
    iAmRequester,
    counterpart: {
      userId: iAmRequester ? row.recipient_user_id : row.requester_user_id,
      profileId: iAmRequester ? row.recipient_profile_id : row.requester_profile_id,
      name: iAmRequester
        ? (row.recipient_display || row.recipient_name)
        : (row.requester_display || row.requester_name),
    },
    slots: slots.map((s) => ({
      id: s.id,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      isSelected: s.is_selected,
    })),
    feedbackGiven,
  };
}

async function get(viewerId, meetingId) {
  const { rows } = await pool.query(`${MEETING_SELECT} WHERE m.id = $1`, [meetingId]);
  if (!rows.length) {
    const err = new Error('Meeting not found');
    err.status = 404;
    throw err;
  }
  const row = rows[0];
  if (row.requester_user_id !== viewerId && row.recipient_user_id !== viewerId) {
    const err = new Error('Not a participant of this meeting');
    err.status = 403;
    throw err;
  }
  const { rows: slots } = await pool.query(
    'SELECT * FROM meeting_slots WHERE meeting_id = $1 ORDER BY starts_at', [meetingId]
  );
  const { rows: fb } = await pool.query(
    'SELECT 1 FROM feedback WHERE meeting_id = $1 AND from_user_id = $2', [meetingId, viewerId]
  );
  return shape(row, viewerId, slots, fb.length > 0);
}

async function list(viewerId, { box, status } = {}) {
  const conditions = [];
  const params = [viewerId];
  if (box === 'inbox') conditions.push('m.recipient_user_id = $1');
  else if (box === 'sent') conditions.push('m.requester_user_id = $1');
  else conditions.push('(m.requester_user_id = $1 OR m.recipient_user_id = $1)');
  if (status) {
    params.push(status);
    conditions.push(`m.status = $${params.length}`);
  }
  const { rows } = await pool.query(
    `${MEETING_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY m.updated_at DESC LIMIT 100`,
    params
  );
  const ids = rows.map((r) => r.id);
  let slotsById = new Map();
  let feedbackSet = new Set();
  if (ids.length) {
    const { rows: allSlots } = await pool.query(
      'SELECT * FROM meeting_slots WHERE meeting_id = ANY($1) ORDER BY starts_at', [ids]
    );
    slotsById = allSlots.reduce((m, s) => {
      if (!m.has(s.meeting_id)) m.set(s.meeting_id, []);
      m.get(s.meeting_id).push(s);
      return m;
    }, new Map());
    const { rows: fb } = await pool.query(
      'SELECT meeting_id FROM feedback WHERE meeting_id = ANY($1) AND from_user_id = $2',
      [ids, viewerId]
    );
    feedbackSet = new Set(fb.map((f) => f.meeting_id));
  }
  return {
    items: rows.map((r) => shape(r, viewerId, slotsById.get(r.id) || [], feedbackSet.has(r.id))),
  };
}

module.exports = { create, accept, decline, cancel, get, list };
