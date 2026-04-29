'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system';
  read: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  return `${mins}m ago`;
}

const typeIcon = { order: '📦', promo: '🔥', system: '🔔' };
const typeBg  = { order: 'bg-blue-50',  promo: 'bg-orange-50',  system: 'bg-gray-50'  };
const typeDot = { order: 'bg-blue-500', promo: 'bg-orange-400', system: 'bg-gray-400' };

export default function NotificationBell() {
  const { data: session } = useSession();
  const { notifications: realtimeNotifications, isConnected, unreadCount, markAllAsRead, markAsRead } = useRealtimeNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session && realtimeNotifications.length > 0) {
      setNotifications(realtimeNotifications);
    }
  }, [session, realtimeNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentUnreadCount = unreadCount;
  const handleMarkAllRead = () => {
    markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  const handleMarkRead = (id: string) => {
    markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  if (!session) return null;

  // Detect RTL so we can anchor the panel correctly
  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        id="notification-bell"
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/15 transition-colors"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {currentUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none shadow">
            {currentUnreadCount > 9 ? '9+' : currentUnreadCount}
          </span>
        )}
        {isConnected && (
          <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Dropdown panel — anchors left in RTL, right in LTR */}
      {open && (
        <div
          className="absolute mt-3 z-[100] shadow-2xl rounded-2xl border border-gray-100 bg-white overflow-hidden"
          style={{
            width: 340,
            [isRtl ? 'left' : 'right']: 0,
            top: '100%',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-light))]">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">
                {isRtl ? 'الإشعارات' : 'Notifications'}
              </span>
              {currentUnreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                  {currentUnreadCount}
                </span>
              )}
            </div>
            {currentUnreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-3 py-1 rounded-full transition-all"
              >
                {isRtl ? 'تحديد الكل كمقروء' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-gray-400 text-sm">
                <div className="text-3xl mb-2">🔔</div>
                {isRtl ? 'لا توجد إشعارات' : 'No notifications yet'}
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3.5 transition-colors ${!n.read ? typeBg[n.type] : 'bg-white hover:bg-gray-50'}`}
                >
                  {/* Icon */}
                  <div className="shrink-0 w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-base mt-0.5">
                    {typeIcon[n.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {!n.read && (
                            <span className={`w-2 h-2 rounded-full shrink-0 ${typeDot[n.type]}`} />
                          )}
                          <p className="text-xs font-bold text-gray-900 truncate">{n.title}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5">{timeAgo(n.createdAt)}</p>
                      </div>

                      {/* Per-item mark as read */}
                      {!n.read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          title={isRtl ? 'تحديد كمقروء' : 'Mark as read'}
                          className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-all"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-[11px] text-gray-400">
              {notifications.length} {isRtl ? 'إشعارات' : 'notifications'}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
