import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { meetings as meetingsApi } from '../lib/api';
import { useApi, useMutation } from '../hooks/useApi';
import { useNotifications } from '../context/NotificationsContext';
import { Modal, EmptyState, useToast, Toast } from '../components/ui';
import { riseIn } from '../lib/anim';
import { dateTime } from '../lib/format';

function AcceptModal({ meeting, onClose, onDone }) {
  const [slotId, setSlotId] = useState(meeting.slots[0]?.id);
  const { run, busy, error } = useMutation(meetingsApi.accept);
  const submit = async (e) => {
    e.preventDefault();
    await run(meeting.id, { slotId });
    onDone();
  };
  return (
    <Modal title={`Accept meeting with ${meeting.counterpart.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="vn-meeting-slots">
          {meeting.slots.map((s) => (
            <label key={s.id} className={'chip' + (slotId === s.id ? ' on' : '')} style={{ cursor: 'pointer' }}>
              <input type="radio" name="slot" checked={slotId === s.id} onChange={() => setSlotId(s.id)} style={{ display: 'none' }} />
              {dateTime(s.startsAt)}
            </label>
          ))}
        </div>
        {error && <div className="field-error" style={{ marginTop: 10 }}>{error.message}</div>}
        <div className="vn-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !slotId}>{busy ? 'Accepting…' : 'Accept'}</button>
        </div>
      </form>
    </Modal>
  );
}

function FeedbackModal({ meeting, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [wouldProceed, setWouldProceed] = useState(true);
  const [comment, setComment] = useState('');
  const { run, busy, error } = useMutation(meetingsApi.feedback);
  const submit = async (e) => {
    e.preventDefault();
    await run(meeting.id, { rating, wouldProceed, comment: comment.trim() || undefined });
    onDone();
  };
  return (
    <Modal title={`How was your meeting with ${meeting.counterpart.name}?`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="vn-field">
          <label className="label">Rating</label>
          <div className="vn-rating-row">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={'chip' + (rating === n ? ' on' : '')} onClick={() => setRating(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="vn-field">
          <label className="label">Would you take this further?</label>
          <div className="seg">
            <button type="button" className={'seg-btn' + (wouldProceed ? ' active' : '')} onClick={() => setWouldProceed(true)}>Yes</button>
            <button type="button" className={'seg-btn' + (!wouldProceed ? ' active' : '')} onClick={() => setWouldProceed(false)}>No</button>
          </div>
        </div>
        <div className="vn-field">
          <label className="label">Comments (optional)</label>
          <textarea className="textarea" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        {error && <div className="field-error">{error.message}</div>}
        <div className="vn-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Skip</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send feedback'}</button>
        </div>
      </form>
    </Modal>
  );
}

function MeetingCard({ m, onAccept, onDecline, onCancel, onFeedback, busy }) {
  return (
    <div className="card vn-meeting-card rise">
      <div className="vn-meeting-head">
        <div>
          <Link to={`/app/p/${m.counterpart.profileId}`} className="vn-match-name" style={{ fontSize: 17, textDecoration: 'none', color: 'inherit' }}>
            {m.counterpart.name}
          </Link>
          {m.scheduledAt && <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{dateTime(m.scheduledAt)}</div>}
        </div>
        <span className={`vn-status-pill ${m.status}`}>{m.status}</span>
      </div>
      {m.message && <p className="vn-match-rationale">{m.message}</p>}
      {m.status === 'requested' && !m.iAmRequester && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" disabled={busy} onClick={() => onAccept(m)}>Accept</button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => onDecline(m)}>Decline</button>
        </div>
      )}
      {m.status === 'requested' && m.iAmRequester && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Waiting for response…</span>
          <button className="btn btn-danger" disabled={busy} onClick={() => onCancel(m)}>
            {busy ? 'Cancelling…' : 'Cancel request'}
          </button>
        </div>
      )}
      {m.status === 'accepted' && (
        <div>
          <button className="btn btn-danger" disabled={busy} onClick={() => onCancel(m)}>
            {busy ? 'Cancelling…' : 'Cancel meeting'}
          </button>
        </div>
      )}
      {m.status === 'completed' && !m.feedbackGiven && (
        <button className="btn btn-primary" onClick={() => onFeedback(m)}>Leave feedback</button>
      )}
      {m.status === 'completed' && m.feedbackGiven && (
        <div style={{ fontSize: 13, color: 'var(--accent)' }}>Feedback submitted — thank you.</div>
      )}
    </div>
  );
}

export default function Meetings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'requests';
  const scope = useRef(null);
  const { refresh } = useNotifications();
  const [toast, showToast] = useToast();
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const { status, data, error, retry } = useApi(() => meetingsApi.list({}), []);
  const declineMutation = useMutation(meetingsApi.decline);
  const cancelMutation = useMutation(meetingsApi.cancel);

  useEffect(() => {
    if (status === 'ready') riseIn(scope.current);
  }, [status, tab]);

  const setTab = (t) => setParams((p) => { p.set('tab', t); return p; }, { replace: true });

  const items = data?.items || [];
  const requests = items.filter((m) => m.status === 'requested' && !m.iAmRequester);
  const upcoming = items.filter((m) => m.status === 'accepted' || (m.status === 'requested' && m.iAmRequester));
  const past = items.filter((m) => ['completed', 'declined', 'cancelled'].includes(m.status));
  const shown = tab === 'requests' ? requests : tab === 'upcoming' ? upcoming : past;

  const decline = async (m) => {
    setBusyId(m.id);
    try {
      await declineMutation.run(m.id, {});
      retry();
    } finally {
      setBusyId(null);
    }
  };
  const cancel = async (m) => {
    setBusyId(m.id);
    try {
      await cancelMutation.run(m.id);
      retry();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="vn-page vn-page-narrow" ref={scope}>
      <div className="eyebrow rise">Meetings</div>
      <h1 className="serif-h1 rise" style={{ marginTop: 10 }}>Your conversations</h1>
      <div className="seg vn-match-tabs rise" style={{ marginTop: 20 }}>
        {[
          { id: 'requests', label: `Requests${requests.length ? ` (${requests.length})` : ''}` },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'past', label: 'Past' },
        ].map((t) => (
          <button key={t.id} className={'seg-btn' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {status === 'loading' && <div style={{ marginTop: 20, color: 'var(--muted)' }}>Loading…</div>}
      {status === 'error' && <EmptyState title="Couldn't load meetings" body={error.message} onRetry={retry} />}
      {status === 'ready' && shown.length === 0 && (
        <EmptyState title="Nothing here yet" body="Requested and scheduled meetings will show up in this tab." />
      )}
      {status === 'ready' && shown.map((m) => (
        <MeetingCard
          key={m.id}
          m={m}
          busy={busyId === m.id}
          onAccept={setAcceptTarget}
          onDecline={decline}
          onCancel={cancel}
          onFeedback={setFeedbackTarget}
        />
      ))}

      {acceptTarget && (
        <AcceptModal
          meeting={acceptTarget}
          onClose={() => setAcceptTarget(null)}
          onDone={() => { setAcceptTarget(null); retry(); refresh(); showToast('Meeting scheduled'); }}
        />
      )}
      {feedbackTarget && (
        <FeedbackModal
          meeting={feedbackTarget}
          onClose={() => setFeedbackTarget(null)}
          onDone={() => { setFeedbackTarget(null); retry(); showToast('Thanks for the feedback'); }}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}
