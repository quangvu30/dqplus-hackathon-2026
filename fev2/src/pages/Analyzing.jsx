import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboarding } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const STAGES = [
  'Reading your profile…',
  'Extracting your key criteria…',
  'Building your match signals…',
  'Almost there…',
];

const POLL_MS = 2500;
const TIMEOUT_MS = 30000;

export default function Analyzing() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [stageIdx, setStageIdx] = useState(0);
  const startedRef = useRef(Date.now());

  useEffect(() => {
    if (!session) {
      navigate('/login', { replace: true });
      return;
    }
    const stageTimer = setInterval(
      () => setStageIdx((i) => Math.min(i + 1, STAGES.length - 1)),
      4000
    );
    const poll = setInterval(async () => {
      // Never trap the user here: fall through to the app on timeout or failure.
      const elapsed = Date.now() - startedRef.current;
      try {
        const s = await onboarding.status();
        if (s.status === 'done' || s.status === 'failed' || elapsed > TIMEOUT_MS) {
          navigate('/app/browse?mode=recommended', { replace: true });
        }
      } catch {
        if (elapsed > TIMEOUT_MS) navigate('/app/browse?mode=recommended', { replace: true });
      }
    }, POLL_MS);
    return () => {
      clearInterval(stageTimer);
      clearInterval(poll);
    };
  }, [session, navigate]);

  return (
    <div className="vn-page vn-page-narrow" style={{ textAlign: 'center', paddingTop: 110 }}>
      <div className="vn-detail-score" style={{ margin: '0 auto', animation: 'pulse 1.6s ease-in-out infinite' }}>
        AI
      </div>
      <style>{'@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .55 } }'}</style>
      <h1 className="serif-h1" style={{ marginTop: 28 }}>Your profile is being analyzed</h1>
      <p className="lede" style={{ margin: '14px auto 0' }}>{STAGES[stageIdx]}</p>
      <p style={{ marginTop: 26, fontSize: 13, color: 'var(--muted)' }}>
        We extract your criteria with a language model and build embedding signals for matching.
        This usually takes under half a minute.
      </p>
    </div>
  );
}
