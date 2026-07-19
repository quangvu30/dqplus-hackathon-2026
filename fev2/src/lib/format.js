export const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : s);

export function money(n) {
  if (n == null || n === '') return null;
  const v = Number(n);
  if (Number.isNaN(v)) return null;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v}`;
}

export function dateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const INVESTOR_TYPES = {
  vc: 'Venture Capital',
  angel: 'Angel Investor',
  cvc: 'Corporate VC',
  pe: 'Private Equity',
  'family-office': 'Family Office',
};
