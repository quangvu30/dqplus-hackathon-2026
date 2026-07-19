import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications as notificationsApi } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useNotifications } from '../context/NotificationsContext';
import { EmptyState } from '../components/ui';
import { riseIn } from '../lib/anim';
import { timeAgo } from '../lib/format';

function targetFor(n) {
  if (n.data?.meeting_id) return '/app/meetings';
  if (n.data?.profile_id) return `/app/p/${n.data.profile_id}`;
  return null;
}

export default function Notifications() {
  const { status, data, error, retry } = useApi(() => notificationsApi.list({}), []);
  const { refresh } = useNotifications();
  const navigate = useNavigate();
  const scope = useRef(null);

  useEffect(() => {
    if (status === 'ready') riseIn(scope.current);
  }, [status]);

  const open = async (n) => {
    if (!n.read_at) {
      await notificationsApi.markRead(n.id).catch(() => {});
      refresh();
      retry();
    }
    const to = targetFor(n);
    if (to) navigate(to);
  };

  const markAll = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    refresh();
    retry();
  };

  return (
    <div className="vn-page vn-page-narrow" ref={scope}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="eyebrow rise">Inbox</div>
          <h1 className="serif-h1 rise" style={{ marginTop: 10 }}>Notifications</h1>
        </div>
        {data?.items?.some((n) => !n.read_at) && (
          <button className="link rise" style={{ fontSize: 13 }} onClick={markAll}>Mark all read</button>
        )}
      </div>

      {status === 'loading' && <div style={{ marginTop: 20, color: 'var(--muted)' }}>Loading…</div>}
      {status === 'error' && <EmptyState title="Couldn't load notifications" body={error.message} onRetry={retry} />}
      {status === 'ready' && data.items.length === 0 && (
        <EmptyState title="You're all caught up" body="Meeting requests and updates will show up here." />
      )}
      {status === 'ready' && data.items.map((n) => (
        <div key={n.id} className={'vn-notif-row rise' + (n.read_at ? '' : ' unread')} onClick={() => open(n)}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
            {n.body && <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{n.body}</div>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--faint)', whiteSpace: 'nowrap' }}>{timeAgo(n.created_at)}</div>
        </div>
      ))}
    </div>
  );
}
