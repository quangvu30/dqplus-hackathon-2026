import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { notifications as notificationsApi } from '../lib/api';

const NotificationsContext = createContext({ unreadCount: 0, refresh: () => {} });

const POLL_MS = 15000;

export function NotificationsProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await notificationsApi.list({ unread: 'true' });
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      /* keep last known count on transient errors */
    }
  }, []);

  useEffect(() => {
    refresh();
    const tick = () => {
      if (!document.hidden) refresh();
    };
    timerRef.current = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refresh]);

  const value = useMemo(() => ({ unreadCount, refresh }), [unreadCount, refresh]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
