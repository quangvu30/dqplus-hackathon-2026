import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { prefersReduced } from '../lib/anim';
import { useLang } from '../context/LangContext';

// Circular fit score with count-up (from /frontend MatchDetail).
export function ScoreBadge({ score, size = 84, caption = 'fit score' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || prefersReduced()) return;
    gsap.from(ref.current, { textContent: 0, duration: 0.8, ease: 'power2.out', snap: { textContent: 1 } });
  }, [score]);
  return (
    <div className="vn-detail-score-wrap">
      <div className="vn-detail-score" style={{ width: size, height: size }}>
        <span ref={ref}>{score}</span>
      </div>
      <div className="vn-detail-score-caption">{caption}</div>
    </div>
  );
}

// Breakdown bars with scaleX animation (from /frontend MatchDetail).
export function FitBars({ rows }) {
  const scope = useRef(null);
  useEffect(() => {
    if (!scope.current || prefersReduced()) return;
    gsap.from(scope.current.querySelectorAll('.vn-detail-bar-fill'), {
      scaleX: 0, transformOrigin: 'left', duration: 0.7, ease: 'power2.out', stagger: 0.08,
    });
  }, []);
  return (
    <div ref={scope}>
      {rows.map((r) => (
        <div className="vn-detail-bar-row" key={r.label}>
          <span className="vn-detail-bar-label">{r.label}</span>
          <span className="vn-detail-bar-track">
            <span className="vn-detail-bar-fill" style={{ width: `${Math.max(0, Math.min(100, r.value))}%` }} />
          </span>
          <span className="vn-detail-bar-val">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ChipList({ items }) {
  if (!items?.length) return null;
  return (
    <div className="vn-detail-sectors">
      {items.map((s) => (
        <span key={s} className="chip vn-detail-sector-chip">{s}</span>
      ))}
    </div>
  );
}

export function EmptyState({ title, body, onRetry, retryLabel = 'Retry' }) {
  return (
    <div className="card vn-match-empty rise">
      <div style={{ fontWeight: 600, color: 'var(--label)' }}>{title}</div>
      {body && <div>{body}</div>}
      {onRetry && (
        <button className="btn btn-primary vn-detail-retry-btn" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="vn-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card vn-modal" role="dialog" aria-modal="true">
        {title && <h3 className="serif-h2 vn-modal-title">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return <div className="vn-toast">{message}</div>;
}

export function useToast() {
  const [message, setMessage] = useState(null);
  const timer = useRef(null);
  const show = (msg) => {
    setMessage(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2600);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return [message, show];
}

// VI/EN toggle for bilingual generated content (from /frontend MatchDetail).
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="seg vn-detail-lang-seg">
      {['vi', 'en'].map((l) => (
        <button
          key={l}
          className={'seg-btn' + (lang === l ? ' active' : '')}
          style={{ padding: '6px 14px', fontSize: 12 }}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
