/* Table-driven meeting state machine.
 *
 * requested -accept(recipient)-> accepted -cron-> completed
 *     |-decline(recipient)-> declined
 *     |-cancel(either)----> cancelled     accepted -cancel(either, pre-start)-> cancelled
 */
const TRANSITIONS = {
  accept: { from: ['requested'], to: 'accepted', by: 'recipient' },
  decline: { from: ['requested'], to: 'declined', by: 'recipient' },
  cancel: { from: ['requested', 'accepted'], to: 'cancelled', by: 'either' },
};

function assertTransition(action, meeting, userId) {
  const rule = TRANSITIONS[action];
  if (!rule) {
    const err = new Error(`Unknown action: ${action}`);
    err.status = 400;
    throw err;
  }
  if (!rule.from.includes(meeting.status)) {
    const err = new Error(`Cannot ${action} a meeting in status '${meeting.status}'`);
    err.status = 409;
    throw err;
  }
  const isRequester = meeting.requester_user_id === userId;
  const isRecipient = meeting.recipient_user_id === userId;
  if (!isRequester && !isRecipient) {
    const err = new Error('Not a participant of this meeting');
    err.status = 403;
    throw err;
  }
  if (rule.by === 'recipient' && !isRecipient) {
    const err = new Error(`Only the recipient can ${action}`);
    err.status = 403;
    throw err;
  }
  if (action === 'cancel' && meeting.status === 'accepted'
      && meeting.scheduled_at && new Date(meeting.scheduled_at) <= new Date()) {
    const err = new Error('Cannot cancel a meeting that already started');
    err.status = 409;
    throw err;
  }
  return rule.to;
}

module.exports = { TRANSITIONS, assertTransition };
