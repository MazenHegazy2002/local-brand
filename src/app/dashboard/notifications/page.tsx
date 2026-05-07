'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/notifications');
    }
  }, [status, router]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllRead' }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead: true }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER':
        return <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">📦</div>;
      case 'PROMO':
        return <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">🏷️</div>;
      case 'REVIEW':
        return <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">⭐</div>;
      case 'RETURN':
        return <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">↩️</div>;
      case 'SYSTEM':
        return <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center">⚙️</div>;
      default:
        return <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</div>;
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return <div className="db"><div className="main">Loading...</div></div>;
  }

  return (
    <div className="db">
      <div className="sidebar">
        <div className="logo">My<span>LB</span></div>
        
        <div className="nav-section">Personal</div>
        <Link href="/dashboard" className="nav-item">Overview</Link>
        <Link href="/dashboard/orders" className="nav-item">My Orders</Link>
        <Link href="/dashboard/wishlist" className="nav-item">Wishlist</Link>
        <Link href="/dashboard/notifications" className="nav-item active">Alerts</Link>
        
        <div className="nav-section">Finance</div>
        <Link href="/dashboard/wallet" className="nav-item">Wallet</Link>
        
        <div className="nav-section">System</div>
        <Link href="/dashboard/settings" className="nav-item">Settings</Link>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="page-title">System alerts</div>
          <button onClick={markAllAsRead} className="refresh-btn">Mark all read</button>
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'unread', 'read'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                filter === f 
                  ? 'bg-[#534AB7] text-white' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#534AB7]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-2 opacity-70">
                {f === 'all' ? notifications.length : f === 'unread' ? notifications.filter(n => !n.isRead).length : notifications.filter(n => n.isRead).length}
              </span>
            </button>
          ))}
        </div>

        <div className="card">
          {paginatedNotifications.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400">
              No notifications
            </div>
          ) : (
            paginatedNotifications.map(n => (
              <div 
                key={n.id} 
                className={`row-item ${!n.isRead ? 'bg-slate-50' : ''}`}
                onClick={() => !n.isRead && markAsRead(n.id)}
              >
                {getNotificationIcon(n.type)}
                <div style={{flex: 1}}>
                  <div className="flex items-center gap-2">
                    <div style={{fontSize: '13px', fontWeight: n.isRead ? 400 : 600}}>{n.title}</div>
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#534AB7]" />}
                  </div>
                  <div style={{fontSize: '11px', color: '#64748b'}}>{n.message}</div>
                </div>
                <div className="text-right">
                  <div style={{fontSize: '10px', color: '#94a3b8'}}>{getRelativeTime(n.createdAt)}</div>
                  {n.link && (
                    <Link href={n.link} className="text-xs text-[#534AB7] hover:underline">View →</Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        .db { display: flex; min-height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif; }
        .sidebar { width: 186px; flex-shrink: 0; background: #1a1a2e; padding: 16px 0; display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; }
        .logo { padding: 0 16px 20px; font-size: 15px; font-weight: 500; color: #fff; }
        .logo span { color: #7F77DD; }
        .nav-section { font-size: 10px; font-weight: 500; color: #64748b; letter-spacing: 0.08em; padding: 10px 16px 4px; text-transform: uppercase; }
        .nav-item { display: flex; align-items: center; gap: 9px; padding: 8px 16px; cursor: pointer; font-size: 12px; color: #888; transition: all 0.12s; }
        .nav-item:hover { background: rgba(255,255,255,0.05); color: #ccc; }
        .nav-item.active { background: rgba(127,119,221,0.15); color: #AFA9EC; }
        .main { flex: 1; min-width: 0; padding: 18px; overflow: auto; }
        .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .page-title { font-size: 17px; font-weight: 500; color: #1e293b; }
        .refresh-btn { padding: 6px 12px; border-radius: 6px; background: #534AB7; color: white; font-size: 11px; font-weight: 500; border: none; cursor: pointer; }
        .card { background: #fff; border-radius: 12px; border: 1px solid rgba(0,0,0,0.06); padding: 14px; }
        .row-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.04); cursor: pointer; }
        .row-item:last-child { border-bottom: none; }
      `}</style>
    </div>
  );
}