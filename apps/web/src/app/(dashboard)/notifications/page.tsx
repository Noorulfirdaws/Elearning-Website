'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

const TYPE_ICON: Record<string, string> = {
  ENROLLMENT: '📚', COMPLETION: '🎓', PAYMENT: '💳', ASSIGNMENT: '📝',
  QUIZ_RESULT: '✅', COMMENT: '💬', MENTION: '📣', CERTIFICATE: '🏆',
  LIVE_CLASS: '📡', ANNOUNCEMENT: '📢',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then((r) => {
      setNotifications(r.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && <p className="text-indigo-600 text-sm mt-1">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium">
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔔</div>
          <p className="text-gray-400 text-lg">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => { if (!n.isRead) markRead(n.id); if (n.link) window.location.href = n.link; }}
              className={`flex gap-4 p-4 rounded-2xl cursor-pointer transition-colors ${n.isRead ? 'bg-white border border-gray-100' : 'bg-indigo-50 border border-indigo-100'} hover:shadow-sm`}
            >
              <div className="text-2xl flex-shrink-0">{TYPE_ICON[n.type] || '🔔'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                  {!n.isRead && <span className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
