'use client';
import { useState, useEffect } from 'react';

export function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const stored = localStorage.getItem('pushNotificationsDismissed');
    if (stored) return;
    if ('Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        setTimeout(() => setShow(true), 5000);
      }
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === 'granted' && 'serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js');
      }
    }
    setShow(false);
    localStorage.setItem('pushNotificationsDismissed', 'true');
  };

  if (!show || permission !== 'default') return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-xl shadow-lg p-4 z-50">
      <p className="text-sm font-medium mb-3">Enable notifications for order updates</p>
      <div className="flex gap-2">
        <button onClick={requestPermission} className="flex-1 bg-[#1e3b8a] text-white py-2 rounded-lg text-sm font-medium">
          Enable
        </button>
        <button onClick={() => { setShow(false); localStorage.setItem('pushNotificationsDismissed', 'true'); }} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm text-gray-600">
          Not now
        </button>
      </div>
    </div>
  );
}