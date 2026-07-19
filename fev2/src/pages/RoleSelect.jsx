import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { riseIn } from '../lib/anim';

const ROLES = [
  {
    id: 'founder',
    dot: '#3f8f6b',
    title: "I'm a founder",
    body: 'Raise capital and find strategic partners. Share your product, traction and financials — our AI pitches you to the right investors.',
    cta: 'Join as a founder',
  },
  {
    id: 'investor',
    dot: '#b08636',
    title: "I'm an investor",
    body: 'See ranked, explainable deal flow that fits your thesis, stages and check size — including inside metrics founders share with members.',
    cta: 'Join as an investor',
  },
];

export default function RoleSelect() {
  const navigate = useNavigate();
  const scope = useRef(null);
  useEffect(() => riseIn(scope.current), []);

  return (
    <div className="vn-page vn-page-narrow" ref={scope}>
      <div className="eyebrow rise">Join VietNexus</div>
      <h1 className="serif-h1 rise" style={{ marginTop: 10 }}>Which side of the table are you on?</h1>
      <p className="lede rise" style={{ marginTop: 12 }}>
        Your role shapes the questions we ask and who we match you with. You can refine
        everything later from your profile.
      </p>
      <div className="vn-role-cards">
        {ROLES.map((r) => (
          <button key={r.id} className="card vn-role-card rise" onClick={() => navigate(`/join/${r.id}`)}>
            <div className="vn-detail-type">
              <span className="dot" style={{ background: r.dot }} />
              {r.id}
            </div>
            <h2 className="vn-match-name" style={{ marginTop: 12 }}>{r.title}</h2>
            <p className="vn-match-rationale">{r.body}</p>
            <div style={{ marginTop: 16, color: 'var(--accent)', fontWeight: 600, fontSize: 13.5 }}>
              {r.cta} →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
