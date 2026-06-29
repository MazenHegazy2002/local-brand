'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDashboardStats, toggleWishlist, updateProfile } from '../actions/seller';
import { cancelOrder, requestReturn } from '../actions/orders';
import Link from 'next/link';
import { User, Order, OrderItem, WishlistItem, Notification, SessionUser, Product } from '@/types';
import { useCartStore } from '@/lib/cartStore';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';

const VALID_TABS = [
  'overview',
  'orders',
  'wishlist',
  'notifications',
  'wallet',
  'settings',
] as const;
type DashboardTab = (typeof VALID_TABS)[number];

interface DashboardData {
  user: User;
  myOrders: Order[];
  wishlist: (WishlistItem & { product: Product })[]; // product is included in wishlist
  notifications: Notification[];
}

export default function CustomerDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-[#1e3b8a] font-medium">
          Loading dashboard…
        </div>
      }
    >
      <CustomerDashboard />
    </Suspense>
  );
}

function CustomerDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const addItem = useCartStore(s => s.addItem);
  const initialTab = (() => {
    const t = searchParams.get('tab');
    return (VALID_TABS as readonly string[]).includes(t || '') ? (t as DashboardTab) : 'overview';
  })();
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);

  // Keep tab in sync if the URL changes (e.g. via the bottom nav).
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && (VALID_TABS as readonly string[]).includes(t)) {
      setActiveTab(t as DashboardTab);
    }
  }, [searchParams]);
  const { confirm, alert, prompt } = useConfirm();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);

  // Access control - redirect admins/sellers to their dashboards
  useEffect(() => {
    const role = (session?.user as SessionUser | undefined)?.role;
    if (session && role === 'ADMIN') {
      router.push('/admin');
    } else if (session && role === 'SELLER') {
      router.push('/seller-hub');
    }
  }, [session, router]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = (await getDashboardStats()) as unknown as DashboardData & {
        isAffiliate?: boolean;
      };
      if (res?.isAffiliate) setIsAffiliate(true);
      setData(res);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Unauthorized');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWishlist = async (id: string) => {
    try {
      await toggleWishlist(id);
      await refreshData();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ variant: 'error', title: 'Error', description: error.message });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const payload = Object.fromEntries(formData);
    try {
      await updateProfile(payload);
      toast({ variant: 'success', title: 'Success', description: 'Profile updated successfully!' });
      await refreshData();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ variant: 'error', title: 'Update Failed', description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const confirmed = await confirm({
      title: 'Cancel Order',
      message: 'Cancel this order? This cannot be undone.',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await cancelOrder(orderId);
      if (res.error) {
        toast({ variant: 'error', title: 'Cancellation Failed', description: res.error });
        return;
      }
      toast({
        variant: 'success',
        title: 'Order Cancelled',
        description: 'Order cancelled successfully.',
      });
      await refreshData();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ variant: 'error', title: 'Error', description: error.message });
    }
  };

  const handleRequestReturn = async (orderItemId: string) => {
    const reason = await prompt({
      title: 'Request Return',
      message: 'Reason for return (e.g. Damaged, Wrong size):',
      placeholder: 'Reason',
    });
    if (!reason) return;
    const details =
      (await prompt({
        title: 'Request Return',
        message: 'Additional details (optional):',
        placeholder: 'Details (optional)',
      })) || undefined;
    try {
      const res = await requestReturn(orderItemId, reason, details);
      if (res.error) {
        toast({ variant: 'error', title: 'Request Failed', description: res.error });
        return;
      }
      toast({
        variant: 'success',
        title: 'Return Requested',
        description: 'Return requested. Our team will review it shortly.',
      });
      await refreshData();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ variant: 'error', title: 'Error', description: error.message });
    }
  };

  const handleReorder = async (order: Order) => {
    if (!order.items?.length) return;
    try {
      for (const item of order.items) {
        const price = Number(item.priceAtPurchase) || Number(item.variant?.price) || 0;
        const image =
          item.variant?.product?.images?.find(
            (img: { isPrimary?: boolean; url: string }) => img.isPrimary
          )?.url ||
          item.variant?.product?.images?.[0]?.url ||
          '';

        // 1. Add to the Zustand cart store — this is what checkout reads
        addItem({
          id: item.variantId,
          name: item.productTitleSnapshot,
          price,
          qty: item.quantity,
          image,
        });

        // 2. Persist to DB for cross-device / session continuity (fire-and-forget; non-fatal)
        fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variantId: item.variantId,
            quantity: item.quantity,
            savedPrice: price,
          }),
        }).catch(err => console.warn('[reorder] DB sync failed:', err));
      }

      router.push('/checkout');
    } catch (err: unknown) {
      const error = err as Error;
      toast({ variant: 'error', title: 'Reorder Failed', description: error.message });
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (loading && !data)
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-[#1a1a2e] font-medium">
        Initializing Dashboard...
      </div>
    );
  if (error)
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-red-600 font-bold">
        {error}
      </div>
    );

  const myOrders = data?.myOrders || [];
  const wishlist = data?.wishlist || [];
  const notifications = data?.notifications || [];

  return (
    <div className="db">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo" title={data?.user?.name || 'My Account'}>
          {data?.user?.name?.split(' ')[0] || 'My'}
          <span> {data?.user?.name?.split(' ').slice(1).join(' ') || 'Account'}</span>
        </div>
        <Link href="/" className="home-link">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Back to Shop
        </Link>

        <div className="nav-section">Personal</div>
        <NavItem
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          label="Overview"
          icon={<OverviewIcon />}
        />
        <NavItem
          active={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
          label="My Orders"
          icon={<OrdersIcon />}
        />
        <NavItem
          active={activeTab === 'wishlist'}
          onClick={() => setActiveTab('wishlist')}
          label="Wishlist"
          icon={<WishlistIcon />}
        />
        <NavItem
          active={activeTab === 'notifications'}
          onClick={() => setActiveTab('notifications')}
          label="Alerts"
          icon={<ModerationIcon />}
        />

        <div className="nav-section">Finance</div>
        <NavItem
          active={activeTab === 'wallet'}
          onClick={() => setActiveTab('wallet')}
          label="Wallet"
          icon={<PayoutsIcon />}
        />

        <div className="nav-section">System</div>
        <NavItem
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
          label="Settings"
          icon={<SettingsIcon />}
        />

        <div className="mt-auto px-4 pb-4">
          <div className="user-label">{data?.user?.name}</div>
          <button
            onClick={() => (window.location.href = '/api/auth/signout')}
            className="signout-btn"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main">
        <div className="topbar">
          <div className="page-title">{TITLES[activeTab] || 'Dashboard'}</div>
          <div className="top-actions">
            <div className="tier-badge">
              Member Tier:{' '}
              <span className="badge b-new">
                {(data?.user?.loyaltyPoints || 0) >= 5000
                  ? 'GOLD'
                  : (data?.user?.loyaltyPoints || 0) >= 1000
                    ? 'SILVER'
                    : 'BRONZE'}
              </span>
            </div>
            <div onClick={refreshData} className="refresh-btn">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className={loading ? 'animate-spin' : ''}
              >
                <path
                  d="M8 1.5A4.5 4.5 0 003.5 6c0 1.5-.5 3-1.5 4h12c-1-1-1.5-2.5-1.5-4A4.5 4.5 0 008 1.5z"
                  fill="#1e3b8a"
                  opacity=".8"
                />
                <path
                  d="M6.5 13.5a1.5 1.5 0 003 0"
                  stroke="#1e3b8a"
                  strokeWidth="1.2"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="tab-content animate-fadeIn" key={activeTab}>
          {activeTab === 'overview' && (
            <>
              {isAffiliate && (
                <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-4 shadow-sm">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-0.5">
                      Affiliate Program
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      You have an active affiliate account — track your commissions and referral
                      earnings.
                    </p>
                  </div>
                  <Link
                    href="/affiliate/dashboard"
                    className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow"
                  >
                    Affiliate Portal →
                  </Link>
                </div>
              )}
              <OverviewTab data={data} wishlist={wishlist} myOrders={myOrders} />
            </>
          )}
          {activeTab === 'orders' && (
            <OrdersTab
              orders={myOrders}
              onCancel={handleCancelOrder}
              onReturn={handleRequestReturn}
              onReorder={handleReorder}
            />
          )}
          {activeTab === 'wishlist' && (
            <WishlistTab items={wishlist} onToggle={handleToggleWishlist} />
          )}
          {activeTab === 'notifications' && <NotificationsTab items={notifications} />}
          {activeTab === 'wallet' && <WalletTab user={data?.user} />}
          {activeTab === 'settings' && (
            <SettingsTab user={data?.user} onUpdate={handleUpdateProfile} isUpdating={isUpdating} />
          )}
        </div>
      </div>

      <style jsx global>{`
        :root {
          --color-background-primary: #ffffff;
          --color-background-secondary: #f8fafc;
          --color-text-primary: #1e293b;
          --color-text-secondary: #64748b;
          --color-text-tertiary: #94a3b8;
          --color-border-tertiary: rgba(0, 0, 0, 0.08);
          --brandy-primary: #1e3b8a;
          --brandy-primary-dark: #152c6e;
          --brandy-primary-light: #3b5fbf;
          --brandy-accent: #f59e0b;
          --brandy-accent-soft: rgba(245, 158, 11, 0.12);
        }
        * {
          box-sizing: border-box;
        }
        html,
        body {
          height: 100%;
          margin: 0;
        }
        /* Full-viewport layout: sidebar fixed, main scrolls internally */
        .db {
          display: flex;
          height: 100dvh;
          overflow: hidden;
          background: var(--color-background-secondary);
          font-family: 'Inter', sans-serif;
        }
        .sidebar {
          width: 200px;
          min-width: 200px;
          background: linear-gradient(
            180deg,
            var(--brandy-primary) 0%,
            var(--brandy-primary-dark) 100%
          );
          padding: 16px 0;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          height: 100dvh;
          overflow-y: auto;
          color: #fff;
        }
        .main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          height: 100dvh;
          overflow: hidden;
          background: var(--color-background-secondary);
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px 12px;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
        .tab-content {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 16px 18px 40px;
        }
        .home-link {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0 12px 8px;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.65);
          background: rgba(255, 255, 255, 0.06);
          text-decoration: none;
          transition: all 0.15s;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .home-link:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.12);
        }
        @media (max-width: 900px) {
          .db {
            flex-direction: column;
            height: auto;
            overflow: auto;
          }
          .sidebar {
            width: 100%;
            min-width: 0;
            height: auto;
            flex-direction: row;
            flex-wrap: wrap;
            padding: 8px;
            gap: 4px;
            overflow-x: auto;
            overflow-y: visible;
          }
          .sidebar .nav-section {
            display: none;
          }
          .sidebar .logo {
            padding: 8px 12px;
            font-size: 14px;
            flex-basis: 100%;
          }
          .sidebar .home-link {
            margin: 4px;
            padding: 5px 8px;
          }
          .sidebar .nav-item {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
          .main {
            height: auto;
          }
          .tab-content {
            overflow: visible;
            padding: 12px;
          }
          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        .logo {
          padding: 0 16px 16px;
          font-size: 15px;
          font-weight: 700;
          color: #fff;
        }
        .logo span {
          color: var(--brandy-accent);
          font-weight: 700;
        }
        .nav-section {
          font-size: 10px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.45);
          letter-spacing: 0.08em;
          padding: 10px 16px 4px;
          text-transform: uppercase;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 16px;
          cursor: pointer;
          font-size: 12.5px;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.15s;
          border-left: 3px solid transparent;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }
        .nav-item.active {
          background: rgba(245, 158, 11, 0.12);
          color: #fff;
          border-left-color: var(--brandy-accent);
        }
        .nav-icon {
          width: 15px;
          height: 15px;
          flex-shrink: 0;
        }
        .page-title {
          font-size: 17px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .user-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 600;
        }
        .signout-btn {
          font-size: 11px;
          color: rgba(252, 165, 165, 0.85);
          margin-top: 4px;
          background: none;
          border: none;
          cursor: pointer;
          display: block;
          padding: 0;
        }
        .signout-btn:hover {
          color: #fca5a5;
          text-decoration: underline;
        }
        .tier-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        .refresh-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: rgba(30, 59, 138, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--brandy-primary);
        }
        .refresh-btn:hover {
          background: rgba(30, 59, 138, 0.14);
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 14px;
        }
        @media (max-width: 768px) {
          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        .stat {
          background: var(--color-background-primary);
          border-radius: 12px;
          padding: 14px;
          border: 1px solid var(--color-border-tertiary);
        }
        .stat-label {
          font-size: 10px;
          color: var(--color-text-secondary);
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }
        .stat-val {
          font-size: 22px;
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1;
        }
        .stat-sub {
          font-size: 11px;
          margin-top: 4px;
        }
        .card {
          background: var(--color-background-primary);
          border-radius: 12px;
          border: 1px solid var(--color-border-tertiary);
          padding: 16px;
          margin-bottom: 11px;
        }
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 11px;
        }
        .card-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 11px;
          margin-bottom: 11px;
        }
        @media (max-width: 768px) {
          .grid2 {
            grid-template-columns: 1fr;
          }
        }
        .badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 20px;
          flex-shrink: 0;
        }
        .b-active {
          background: #e1f5ee;
          color: #085041;
        }
        .b-new {
          background: rgba(245, 158, 11, 0.16);
          color: var(--brandy-accent);
        }
        .action-btn {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background: transparent;
          color: var(--color-text-secondary);
          transition: all 0.15s;
          font-weight: 500;
        }
        .action-btn:hover {
          border-color: var(--brandy-primary);
          color: var(--brandy-primary);
        }
        .row-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid var(--color-border-tertiary);
        }
        .row-item:last-child {
          border-bottom: none;
        }
        .avatar-sm {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 500;
          flex-shrink: 0;
        }
        .input-profile {
          width: 100%;
          border: 1px solid #e2e8f0;
          padding: 9px 12px;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          margin-bottom: 10px;
          transition: border-color 0.15s;
        }
        .input-profile:focus {
          border-color: var(--brandy-primary);
          box-shadow: 0 0 0 3px rgba(30, 59, 138, 0.1);
        }
        .top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

const TITLES: Record<string, string> = {
  overview: 'Account overview',
  orders: 'Purchase history',
  wishlist: 'Saved items',
  notifications: 'System alerts',
  wallet: 'Wallet balance',
  settings: 'Profile management',
};

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}

function NavItem({ active, onClick, label, icon }: NavItemProps) {
  return (
    <div onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>
      <div className="nav-icon">{icon}</div>
      {label}
    </div>
  );
}

interface TabProps {
  data?: DashboardData | null;
  wishlist?: (WishlistItem & { product: Product })[];
  myOrders?: Order[];
}

function OverviewTab({ data, wishlist, myOrders }: TabProps) {
  const orders = myOrders || [];
  const items = wishlist || [];

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Orders</div>
          <div className="stat-val">{orders.length}</div>
          <div className="stat-sub" style={{ color: '#1D9E75' }}>
            Total purchases
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Wishlist</div>
          <div className="stat-val">{items.length}</div>
          <div className="stat-sub" style={{ color: '#1e3b8a' }}>
            Saved items
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Loyalty Points</div>
          <div className="stat-val" style={{ color: '#1e3b8a' }}>
            {(data?.user?.loyaltyPoints || 0).toLocaleString()}
          </div>
          <div className="stat-sub">Redeemable credits</div>
        </div>
        <div className="stat">
          <div className="stat-label">Wallet (Points × EGP)</div>
          <div className="stat-val" style={{ color: '#f59e0b' }}>
            {(data?.user?.loyaltyPoints || 0).toLocaleString()}
          </div>
          <div className="stat-sub">EGP equivalent</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Orders</div>
          </div>
          {orders.slice(0, 3).map(o => (
            <div key={o.id} className="row-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600 }}>ORD-{o.id.substring(0, 8)}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {new Date(o.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className="badge b-active">{o.status}</span>
            </div>
          ))}
          {!orders.length && (
            <div className="py-10 text-center text-xs text-slate-400">No orders yet.</div>
          )}
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Wishlist Preview</div>
          </div>
          {items.slice(0, 3).map(w => (
            <div key={w.productId} className="row-item">
              <div
                className="avatar-sm"
                style={{ borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9' }}
              >
                {w.product?.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={w.product.images[0].url}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                )}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 500 }} className="truncate flex-1">
                {w.product?.title}
              </span>
              <div style={{ fontSize: '12px', fontWeight: 600 }}>{w.product?.basePrice} EGP</div>
            </div>
          ))}
          {!items.length && (
            <div className="py-10 text-center text-xs text-slate-400">Wishlist empty.</div>
          )}
        </div>
      </div>
    </>
  );
}

function OrdersTab({
  orders,
  onCancel,
  onReturn,
  onReorder,
}: {
  orders: Order[];
  onCancel: (id: string) => void;
  onReturn: (itemId: string) => void;
  onReorder: (order: Order) => void;
}) {
  const canCancel = (status: string) =>
    ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING'].includes(status);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Full Purchase History</div>
      </div>
      {orders.map(o => (
        <div
          key={o.id}
          className="row-item"
          style={{ flexDirection: 'column', alignItems: 'stretch', padding: '15px 0' }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>
                Order #ORD-{o.id.substring(0, 8)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Placed on {new Date(o.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div style={{ fontSize: '15px', fontWeight: 700 }}>
                {o.totalAmount?.toLocaleString()} EGP
              </div>
              <span className="badge b-active">{o.status}</span>
            </div>
          </div>
          {/* Tracking Step UI */}
          <div className="flex items-center gap-2 mb-4 px-2">
            <TrackStep active={true} label="Ordered" />
            <TrackLine active={['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status)} />
            <TrackStep
              active={['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status)}
              label="Processing"
            />
            <TrackLine active={['SHIPPED', 'DELIVERED'].includes(o.status)} />
            <TrackStep active={['SHIPPED', 'DELIVERED'].includes(o.status)} label="Shipped" />
            <TrackLine active={o.status === 'DELIVERED'} />
            <TrackStep active={o.status === 'DELIVERED'} label="Delivered" />
          </div>

          {o.items?.map((item: OrderItem) => (
            <div key={item.id} className="flex gap-3 mt-2 p-2 bg-slate-50 rounded items-center">
              <div className="w-10 h-10 rounded bg-white overflow-hidden shrink-0">
                {item.variant?.product?.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.variant.product.images[0].url}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{item.productTitleSnapshot}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  Qty: {item.quantity} · Variant: {item.variant?.title}
                </div>
              </div>
              {item.status === 'DELIVERED' && (
                <button
                  onClick={() => onReturn(item.id)}
                  className="action-btn"
                  style={{ borderColor: '#F59E0B', color: '#B45309' }}
                >
                  Return
                </button>
              )}
            </div>
          ))}

          {/* Action buttons per order */}
          <div className="flex gap-2 mt-3">
            {canCancel(o.status) && (
              <button
                onClick={() => onCancel(o.id)}
                className="action-btn"
                style={{ borderColor: '#A32D2D', color: '#791F1F' }}
              >
                Cancel Order
              </button>
            )}
            <button onClick={() => onReorder(o)} className="action-btn">
              Buy Again
            </button>
            <Link href={`/dashboard/orders/${o.id}`} className="action-btn">
              View Details
            </Link>
          </div>
        </div>
      ))}
      {!orders.length && (
        <div className="py-20 text-center text-xs text-slate-400">No orders found.</div>
      )}
    </div>
  );
}

function WishlistTab({
  items,
  onToggle,
}: {
  items: (WishlistItem & { product: Product })[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">My Saved Items</div>
      </div>
      {items.map(w => (
        <div key={w.productId} className="row-item">
          <div className="w-12 h-12 rounded bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
            {w.product?.images?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={w.product.images[0].url} className="w-full h-full object-cover" alt="" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>{w.product?.title}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{w.product?.category?.name}</div>
          </div>
          <div style={{ textAlign: 'right', padding: '0 20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{w.product?.basePrice} EGP</div>
          </div>
          <div className="flex gap-3">
            <Link href={`/product/${w.productId}`} className="action-btn">
              View
            </Link>
            <button
              onClick={() => onToggle(w.productId)}
              className="action-btn"
              style={{ borderColor: '#A32D2D', color: '#791F1F' }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      {!items.length && (
        <div className="py-20 text-center text-xs text-slate-400">Wishlist empty.</div>
      )}
    </div>
  );
}

function NotificationsTab({ items }: { items: Notification[] }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">System Alerts</div>
      </div>
      {items.map(n => (
        <div key={n.id} className="row-item">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: n.isRead ? '#cbd5e1' : '#1e3b8a' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 600 }}>{n.title}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{n.message}</div>
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
            {new Date(n.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
      {!items.length && (
        <div className="py-20 text-center text-xs text-slate-400">No new notifications.</div>
      )}
    </div>
  );
}

interface LoyaltyTx {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
}

function WalletTab({ user }: { user?: User }) {
  const points = user?.loyaltyPoints || 0;
  // Tier thresholds — aligned with POINTS_PER_ORDER=10
  // Bronze: 0-499 pts | Silver: 500-1999 pts | Gold: 2000+ pts
  const tier = points >= 2000 ? 'Gold' : points >= 500 ? 'Silver' : 'Bronze';
  const tierColor = tier === 'Gold' ? '#F59E0B' : tier === 'Silver' ? '#94A3B8' : '#A16207';
  const tierBg = tier === 'Gold' ? '#FFFBEB' : tier === 'Silver' ? '#F8FAFC' : '#FEF3C7';
  const nextTier = tier === 'Bronze' ? 'Silver' : tier === 'Silver' ? 'Gold' : null;
  const nextTierPoints = tier === 'Bronze' ? 500 : tier === 'Silver' ? 2000 : 0;
  const progress = nextTierPoints ? Math.min(100, (points / nextTierPoints) * 100) : 100;

  const [history, setHistory] = useState<LoyaltyTx[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    fetch('/api/loyalty')
      .then(r => r.json())
      .then(d => setHistory(d.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  const txIcon = (type: string) => {
    if (type === 'EARNED_BY_ORDER') return '🛍️';
    if (type === 'EARNED_BY_REVIEW') return '⭐';
    if (type === 'REDEEMED_AT_CHECKOUT') return '💳';
    if (type === 'REFUNDED') return '↩️';
    return '🏆';
  };

  const txLabel = (type: string) => {
    if (type === 'EARNED_BY_ORDER') return 'Order reward';
    if (type === 'EARNED_BY_REVIEW') return 'Review reward';
    if (type === 'REDEEMED_AT_CHECKOUT') return 'Redeemed';
    if (type === 'REFUNDED') return 'Refund';
    return type;
  };

  void tierBg;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Balance card */}
      <div className="card text-center py-10">
        <div
          style={{
            fontSize: '10px',
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '10px',
          }}
        >
          Loyalty Balance
        </div>
        <div style={{ fontSize: '42px', fontWeight: 800, color: '#1e3b8a' }}>
          {points.toLocaleString()} <span style={{ fontSize: '20px', color: '#94a3b8' }}>pts</span>
        </div>
        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
          Worth <strong>{points.toLocaleString()} EGP</strong> at checkout (1 pt = 1 EGP)
        </div>
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold uppercase" style={{ color: tierColor }}>
              {tier} Member
            </div>
            {nextTier && (
              <div className="text-[10px] text-slate-400">
                {(nextTierPoints - points).toLocaleString()} pts to {nextTier}
              </div>
            )}
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: tierColor }}
            />
          </div>
          {/* Tier benefits */}
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <div className="font-bold text-slate-700 mb-1" style={{ color: tierColor }}>
              Your {tier} benefits:
            </div>
            {tier === 'Bronze' && <div>• 1 pt = 1 EGP off at checkout</div>}
            {tier === 'Silver' && (
              <>
                <div>• 1 pt = 1 EGP off at checkout</div>
                <div>• Early access to flash sales</div>
              </>
            )}
            {tier === 'Gold' && (
              <>
                <div>• 1 pt = 1 EGP off at checkout</div>
                <div>• Early access to flash sales</div>
                <div>• Free shipping on orders over 200 EGP</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* History section */}
      <div className="card">
        <div className="card-title mb-4">Transaction History</div>
        {historyLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading transactions…</div>
        ) : history.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
            No loyalty transactions yet. Place your first order to earn points!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-sm flex-shrink-0">
                    {txIcon(tx.type)}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-slate-800">
                      {txLabel(tx.type)}
                    </div>
                    {tx.description && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{tx.description}</div>
                    )}
                    <div className="text-[10px] text-slate-300 mt-0.5">
                      {new Date(tx.createdAt).toLocaleDateString('en-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                <div
                  className="text-sm font-bold tabular-nums"
                  style={{ color: tx.amount >= 0 ? '#16a34a' : '#dc2626' }}
                >
                  {tx.amount >= 0 ? '+' : ''}
                  {tx.amount.toLocaleString()} pts
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How to earn */}
      <div className="card">
        <div className="card-title mb-4">How to earn points</div>
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-[#1e3b8a] flex items-center justify-center text-sm">
              🛍️
            </div>
            <div>
              <div className="font-bold text-slate-900">Shop purchases</div>
              <div className="text-[11px] text-slate-400">10 points per completed order</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-[#1e3b8a] flex items-center justify-center text-sm">
              ⭐
            </div>
            <div>
              <div className="font-bold text-slate-900">Write reviews</div>
              <div className="text-[11px] text-slate-400">
                Earn 5 points per verified purchase review
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-[#1e3b8a] flex items-center justify-center text-sm">
              👥
            </div>
            <div>
              <div className="font-bold text-slate-900">Refer friends</div>
              <div className="text-[11px] text-slate-400">
                50 points when a friend completes their first order
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refer a Friend */}
      <div className="card">
        <div className="card-title mb-2">Refer a Friend</div>
        <div className="text-xs text-slate-500 mb-4">
          Share your unique referral link. Earn <strong>50 bonus points</strong> when a friend signs
          up and completes their first order.
        </div>
        {user?.email && <ReferralLinkWidget email={user.email} />}
      </div>
    </div>
  );
}

function ReferralLinkWidget({ email }: { email: string }) {
  const [copied, setCopied] = React.useState(false);
  const refCode = Buffer.from(email)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 12);
  const refLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/register?ref=${refCode}`
      : `https://lolozozo.shop/register?ref=${refCode}`;

  const copy = () => {
    navigator.clipboard.writeText(refLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 truncate">
        {refLink}
      </div>
      <button
        onClick={copy}
        className="px-3 py-2 bg-[#1e3b8a] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
      >
        {copied ? 'Copied ✓' : 'Copy Link'}
      </button>
    </div>
  );
}

function SettingsTab({
  user,
  onUpdate,
  isUpdating,
}: {
  user?: User;
  onUpdate: (e: React.FormEvent) => void;
  isUpdating: boolean;
}) {
  const [avatar, setAvatar] = useState(user?.avatarUrl || '');
  const [uploading, setUploading] = useState(false);
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show an immediate local preview so the user knows the file was picked.
    const localPreview = URL.createObjectURL(file);
    setAvatar(localPreview);
    setUploading(true);
    try {
      // Avatars are tiny — 512px max edge is plenty.
      const { compressImage } = await import('@/lib/compress-image');
      const uploadFile = await compressImage(file, { maxDimension: 512 });
      const fd = new FormData();
      fd.append('file', uploadFile);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.message || 'Upload failed');
      if (d.url.startsWith('data:') && d.url.length > 700 * 1024) {
        throw new Error('Avatar is too large after compression. Pick a smaller image.');
      }
      setAvatar(d.url);
    } catch (err) {
      console.error('Avatar upload failed', err);
      toast({
        variant: 'error',
        title: 'Upload Failed',
        description: (err as Error).message || 'Avatar upload failed.',
      });
      setAvatar(user?.avatarUrl || '');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      title: 'Delete Account',
      message: 'Delete your account? This anonymizes your data and cannot be undone.',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Account Deleted',
          description: 'Account deleted. Signing you out…',
        });
        setTimeout(() => {
          window.location.href = '/api/auth/signout';
        }, 1500);
      } else {
        const d = await res.json();
        toast({
          variant: 'error',
          title: 'Deletion Failed',
          description: d.message || 'Failed to delete account',
        });
      }
    } catch (err: unknown) {
      const e = err as Error;
      toast({ variant: 'error', title: 'Error', description: e.message });
    }
  };

  return (
    <div className="card max-w-xl">
      <div className="card-title mb-6">Profile Management</div>
      <form onSubmit={onUpdate}>
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-2xl">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              <span>👤</span>
            )}
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-slate-400 uppercase font-bold block mb-2">
              Profile Photo
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                {avatar ? 'Replace photo' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {avatar && !uploading && (
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50"
                >
                  Remove
                </button>
              )}
              {uploading && <span className="text-[11px] text-slate-400">Uploading…</span>}
            </div>
            <input type="hidden" name="avatarUrl" value={avatar} />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-slate-400 uppercase font-bold block mb-1">
            Full Name
          </label>
          <input name="name" defaultValue={user?.name} className="input-profile" />
        </div>
        <div>
          <label className="text-[11px] text-slate-400 uppercase font-bold block mb-1">
            Email Address
          </label>
          <input
            name="email"
            defaultValue={user?.email}
            className="input-profile"
            readOnly
            style={{ background: '#f8fafc', color: '#94a3b8' }}
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-400 uppercase font-bold block mb-1">
            Phone Number
          </label>
          <input
            name="phone"
            defaultValue={user?.phone || ''}
            className="input-profile"
            placeholder="+20 1XX XXX XXXX"
          />
        </div>
        <button
          disabled={isUpdating}
          type="submit"
          className="w-full py-3 bg-[#1e3b8a] text-white rounded font-bold mt-4 disabled:opacity-50"
        >
          {isUpdating ? 'Updating...' : 'Save Changes'}
        </button>

        {/* Danger zone */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="text-[11px] text-red-600 uppercase font-bold mb-2">Danger Zone</div>
          <p className="text-xs text-slate-500 mb-3">
            Deleting your account will anonymize your personal data in compliance with Egyptian PDPL
            law. Your order history is retained for legal/tax reasons but will no longer be linked
            to your identity.
          </p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="w-full py-2.5 border border-red-200 text-red-600 rounded font-bold text-xs hover:bg-red-50"
          >
            Delete My Account
          </button>
        </div>
      </form>
    </div>
  );
}

function TrackStep({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className={`w-3 h-3 rounded-full ${active ? 'bg-[#1e3b8a]' : 'bg-slate-200'}`} />
      <span
        className={`text-[9px] font-bold uppercase ${active ? 'text-[#1e3b8a]' : 'text-slate-300'}`}
      >
        {label}
      </span>
    </div>
  );
}

function TrackLine({ active }: { active: boolean }) {
  return <div className={`h-[2px] flex-1 ${active ? 'bg-[#1e3b8a]' : 'bg-slate-100'}`} />;
}

// SVGs
function OverviewIcon() {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="2" width="10" height="12" rx="2" />
      <path d="M6 6h4M6 9h4" />
    </svg>
  );
}
function WishlistIcon() {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M8 14.5s-6-3.5-6-8.5a3.5 3.5 0 016-3 3.5 3.5 0 016 3c0 5-6 8.5-6 8.5z" />
    </svg>
  );
}
function PayoutsIcon() {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="2" y="4" width="12" height="8" rx="2" />
      <circle cx="11" cy="8" r="1.5" />
    </svg>
  );
}
function ModerationIcon() {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="8" cy="8" r="3" />
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
    </svg>
  );
}
