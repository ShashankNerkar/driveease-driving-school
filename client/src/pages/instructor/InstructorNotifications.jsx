import { useEffect, useState, useCallback } from 'react';
import { getNotifications, markRead, markAllRead } from '../../api/notificationApi';
import { useNotifications } from '../../context/NotificationContext';
import { LoadingState, ErrorState, EmptyState } from '../../components/public/PublicPageState';

const TYPE_ICON = {
  booking_received:    '📅',
  booking_cancelled:   '🚫',
  feedback_received:   '⭐',
  assessment_recorded: '📝',
  assessment_updated:  '📝',
  password_changed:    '🔒',
  system:              'ℹ️',
};

const InstructorNotifications = () => {
  const { refresh } = useNotifications();
  const [items, setItems]           = useState(null);
  const [unread, setUnread]         = useState(0);
  const [error, setError]           = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    setError('');
    getNotifications({ limit: 50 })
      .then(({ data }) => {
        setItems(data.data.notifications);
        setUnread(data.data.unreadCount);
      })
      .catch((e) => setError(e.response?.data?.message || 'Could not load notifications.'));
  }, []);

  useEffect(load, [load]);

  const handleMarkRead = async (id) => {
    try {
      await markRead(id);
      setItems((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
      setUnread((c) => Math.max(0, c - 1));
      refresh();
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
      refresh();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  if (!items && !error) return <LoadingState />;
  if (error && !items)  return <ErrorState message={error} />;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unread > 0 && <p className="mt-0.5 text-sm text-gray-500">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button type="button" onClick={handleMarkAllRead} disabled={markingAll} className="btn-ghost text-sm disabled:opacity-60">
            {markingAll ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {items && items.length === 0 && (
        <EmptyState title="No notifications yet" message="Booking requests, feedback, and other updates will appear here." />
      )}

      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n._id} className={`card flex items-start gap-4 ${n.isRead ? 'opacity-70' : 'border-l-4 border-l-primary-500'}`}>
              <span className="mt-0.5 text-xl" aria-hidden="true">{TYPE_ICON[n.type] || 'ℹ️'}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.isRead ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                <p className="mt-1 text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && (
                <button type="button" onClick={() => handleMarkRead(n._id)} className="shrink-0 text-xs font-medium text-primary-600 hover:underline">
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default InstructorNotifications;
