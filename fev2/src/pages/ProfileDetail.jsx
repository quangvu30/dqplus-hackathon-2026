import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { profiles as profilesApi, meetings as meetingsApi } from '../lib/api';
import { useApi, useMutation } from '../hooks/useApi';
import { useLang } from '../context/LangContext';
import { ChipList, EmptyState, Modal, LangToggle, useToast, Toast } from '../components/ui';
import { riseIn } from '../lib/anim';
import { cap, money, INVESTOR_TYPES } from '../lib/format';

function RequestMeetingModal({ recipientUserId, onClose, onSent }) {
  const [message, setMessage] = useState('');
  const [slots, setSlots] = useState([{ date: '', time: '' }]);
  const { run, busy, error } = useMutation(meetingsApi.create);
  const draftMutation = useMutation(() => meetingsApi.draftMessage(recipientUserId));

  const setSlot = (i, patch) => setSlots((s) => s.map((slot, idx) => (idx === i ? { ...slot, ...patch } : slot)));
  const addSlot = () => setSlots((s) => (s.length < 3 ? [...s, { date: '', time: '' }] : s));

  const suggestMessage = async () => {
    try {
      const draft = await draftMutation.run();
      setMessage(draft.message);
    } catch {
      /* error surfaced via draftMutation.error */
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const built = slots
      .filter((s) => s.date && s.time)
      .map((s) => {
        const start = new Date(`${s.date}T${s.time}:00`);
        const end = new Date(start.getTime() + 45 * 60000);
        return { startsAt: start.toISOString(), endsAt: end.toISOString() };
      });
    if (!built.length) return;
    await run({ recipientUserId, message: message.trim() || undefined, slots: built });
    onSent();
  };

  return (
    <Modal title="Request a meeting" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="vn-field">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="label" style={{ marginBottom: 0 }}>Message (optional)</label>
            <button
              type="button"
              className={'vn-ai-suggest-btn' + (draftMutation.busy ? ' busy' : '')}
              disabled={draftMutation.busy}
              onClick={suggestMessage}
            >
              <span className="vn-ai-suggest-dot" />
              {draftMutation.busy ? 'Drafting…' : 'Suggest with AI'}
            </button>
          </div>
          <textarea className="textarea" style={{ marginTop: 8 }} value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Why you'd like to connect…" />
          {draftMutation.error && <div className="field-error">{draftMutation.error.message}</div>}
        </div>
        <div className="vn-field">
          <label className="label">Propose 1-3 time slots</label>
          {slots.map((s, i) => (
            <div key={i} className="vn-field-row" style={{ marginBottom: 8 }}>
              <input className="input" type="date" value={s.date} onChange={(e) => setSlot(i, { date: e.target.value })} required />
              <input className="input" type="time" value={s.time} onChange={(e) => setSlot(i, { time: e.target.value })} required />
            </div>
          ))}
          {slots.length < 3 && (
            <button type="button" className="vn-add-slot-btn" onClick={addSlot}>+ Add another slot</button>
          )}
        </div>
        {error && <div className="field-error">{error.message}</div>}
        <div className="vn-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProfileDetail() {
  const { profileId } = useParams();
  const { lang } = useLang();
  const scope = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, showToast] = useToast();

  const { status, data: profile, error, retry } = useApi(() => profilesApi.get(profileId), [profileId]);

  useEffect(() => {
    if (status === 'ready') riseIn(scope.current);
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="vn-detail-root" aria-hidden="true">
        <div className="vn-detail-header">
          <div style={{ width: '100%' }}>
            <span className="vn-match-skeleton-block" style={{ display: 'inline-block', width: 80, height: 10 }} />
            <span className="vn-match-skeleton-block" style={{ display: 'block', width: '55%', height: 30, marginTop: 12 }} />
            <span className="vn-match-skeleton-block" style={{ display: 'block', width: '75%', height: 14, marginTop: 12 }} />
          </div>
        </div>
        <div className="card vn-detail-section">
          <span className="vn-match-skeleton-block" style={{ display: 'block', width: '100%', height: 64 }} />
        </div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="vn-page vn-page-narrow">
        <EmptyState title="Couldn't load this profile" body={error.message} onRetry={retry} />
      </div>
    );
  }

  const a = profile.extractedAttributes || {};
  const isFounder = profile.role === 'founder';
  const facts = isFounder
    ? [
        profile.country && `Based in ${profile.country}`,
        profile.stage && `Stage: ${cap(profile.stage)}`,
        profile.teamSize && `${profile.teamSize} people`,
        profile.fundingAskUsd && `Raising ${money(profile.fundingAskUsd)}`,
        profile.arrUsd && `ARR ${money(profile.arrUsd)}`,
        profile.businessModel && cap(profile.businessModel),
      ].filter(Boolean)
    : [
        profile.country && `Based in ${profile.country}`,
        profile.investorType && INVESTOR_TYPES[profile.investorType],
        (profile.checkSizeMinUsd || profile.checkSizeMaxUsd) &&
          `Check size ${money(profile.checkSizeMinUsd) || '$0'}–${money(profile.checkSizeMaxUsd) || '∞'}`,
        profile.stages?.length && `Invests at ${profile.stages.map(cap).join(', ')}`,
      ].filter(Boolean);

  return (
    <div className="vn-detail-root" ref={scope}>
      <div className="vn-detail-header rise">
        <div>
          <div className="vn-detail-type">
            <span className="dot" style={{ background: isFounder ? '#3f8f6b' : '#b08636' }} />
            {isFounder ? 'Startup' : 'Investor'}
          </div>
          <h1 className="serif-h1 vn-detail-name">{profile.displayName}</h1>
          {profile.headline && <p className="lede" style={{ marginTop: 8 }}>{profile.headline}</p>}
          <ChipList items={profile.sectors?.map(cap)} />
        </div>
      </div>

      <div className="card vn-detail-section rise">
        <div className="card-label facts-label">Key facts</div>
        <div className="vn-detail-facts" style={{ marginTop: 14 }}>
          {facts.map((f) => (
            <div key={f} className="vn-detail-fact"><span className="vn-detail-fact-dot" />{f}</div>
          ))}
        </div>
      </div>

      {isFounder && a.product_description && (
        <div className="card vn-detail-section rise">
          <div className="card-label">Product</div>
          <p className="vn-detail-why-text">{a.product_description}</p>
          {a.traction_summary && <p className="vn-detail-why-text">{a.traction_summary}</p>}
        </div>
      )}

      {!isFounder && a.thesis && (
        <div className="card vn-detail-section rise">
          <div className="card-label">Investment thesis</div>
          <p className="vn-detail-why-text">{a.thesis}</p>
          {a.portfolio_highlights?.length > 0 && (
            <p className="vn-detail-why-text">Portfolio: {a.portfolio_highlights.join(', ')}</p>
          )}
        </div>
      )}

      {isFounder && profile.insideInfo && Object.keys(profile.insideInfo).length > 0 && (
        <div className="card vn-detail-section rise">
          <div className="card-label accent">Inside information — shared with verified members only</div>
          <div className="vn-detail-facts" style={{ marginTop: 14 }}>
            {Object.entries(profile.insideInfo).map(([k, v]) => (
              <div key={k} className="vn-detail-fact"><span className="vn-detail-fact-dot" />{cap(k)}: {String(v)}</div>
            ))}
          </div>
        </div>
      )}
      {isFounder && profile.insideInfo === null && (
        <div className="card vn-detail-section rise">
          <div className="vn-detail-empty">This founder has kept their inside information private.</div>
        </div>
      )}

      {isFounder && (
        <div className="card vn-detail-section rise">
          <div className="vn-detail-draft-head">
            <div className="card-label accent">AI financial assessment</div>
            {profile.assessment && <LangToggle />}
          </div>
          {profile.assessment ? (
            <>
              <p className="vn-detail-rationale" style={{ fontSize: 16 }}>
                {lang === 'vi' ? profile.assessment.summary_vi : profile.assessment.summary_en}
              </p>
              <div className="vn-detail-grid2">
                <div>
                  <div className="card-label">Strengths</div>
                  <div className="vn-detail-facts" style={{ marginTop: 10, gridTemplateColumns: '1fr' }}>
                    {(profile.assessment.strengths || []).map((s, i) => (
                      <div key={i} className="vn-detail-fact"><span className="vn-detail-fact-dot" />{s}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="card-label">Risks</div>
                  <div className="vn-detail-facts" style={{ marginTop: 10, gridTemplateColumns: '1fr' }}>
                    {(profile.assessment.risks || []).map((s, i) => (
                      <div key={i} className="vn-detail-fact"><span className="vn-detail-fact-dot" style={{ background: 'var(--err)' }} />{s}</div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="vn-detail-empty">No financial report uploaded / assessment not ready yet.</div>
          )}
        </div>
      )}

      <div className="vn-detail-copy-row rise" style={{ marginTop: 24 }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Request meeting</button>
      </div>

      {showModal && (
        <RequestMeetingModal
          recipientUserId={profile.userId}
          onClose={() => setShowModal(false)}
          onSent={() => {
            setShowModal(false);
            showToast('Meeting request sent');
          }}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}
