'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system';
  read: boolean;
  createdAt: string;
}

export function useRealtimeNotifications() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;

    let eventSource: EventSource | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    function connect() {
      eventSource = new EventSource('/api/notifications/stream');

      eventSource.addEventListener('connected', () => {
        setIsConnected(true);
      });

      eventSource.addEventListener('notification', event => {
        try {
          const notification = JSON.parse(event.data) as Notification;
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        } catch (error) {
          console.error('Failed to parse notification:', error);
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
        }
        timeoutId = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (timeoutId) clearTimeout(timeoutId);
      setIsConnected(false);
    };
  }, [session]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    isConnected,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
