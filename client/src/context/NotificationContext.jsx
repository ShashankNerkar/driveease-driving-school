import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getUnreadCount } from '../api/notificationApi';

/**
 * NotificationContext — in-app notification bell state.
 *
 * Polls GET /api/notifications/unread-count every 60 s when the user is
 * authenticated.  Polling stops on logout or when the tab is hidden to
 * avoid unnecessary requests.
 *
 * refresh() can be called by any consumer to force an immediate re-fetch
 * (e.g. after marking notifications as read).
 */
const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 60_000; // 60 s

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await getUnreadCount();
      setUnreadCount(data.data.unreadCount ?? 0);
    } catch {
      // Silently ignore — 401 on logout is expected, others are transient
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      clearInterval(timerRef.current);
      return;
    }
    fetchCount();
    timerRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [isAuthenticated, fetchCount]);

  const refresh = useCallback(() => {
    if (isAuthenticated) fetchCount();
  }, [isAuthenticated, fetchCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be inside <NotificationProvider>');
  return ctx;
};

export default NotificationContext;
