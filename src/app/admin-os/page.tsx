'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getDashboardStats,
  updateSellerStatus,
  seedTestData,
  createTaxonomy,
  deleteTaxonomy,
  adminCreateUser,
  adminDeleteUser,
  adminUpdateUser,
} from '../actions/seller';
// New admin control-panel tabs — extracted into _components/ to keep the
// main file from growing without bound. These tabs each fetch their own
// data; they don't lean on the shared `data` state below.
import NewSettingsTab from './_components/SettingsTab';
import PluginsTab from './_components/PluginsTab';
import PagesTab from './_components/PagesTab';
import ReviewsTab from './_components/ReviewsTab';
import MarketingTab from './_components/MarketingTab';
import SupportTab from './_components/SupportTab';
import MaintenanceTab from './_components/MaintenanceTab';
import {
  SessionUser,
  SellerProfile,
  User,
  Order,
  AuditLog,
  SystemSettings,
  Payout,
  Category,
  Tag,
  Collection,
  Role,
} from '@/types';
import type { SellerStatus } from '@/generated/client';

// Lightweight version of Product used by the admin Products tab. We don't
// extend the canonical Product type because the admin query returns a
// reduced shape (only the fields we need for the listing).
interface AdminProduct {
  id: string;
  title: string;
  basePrice: number;
  seller?: { id: string; storeName: string } | null;
  category?: { id: string; name: string } | null;
  images?: { url: string; isPrimary?: boolean }[];
  variants?: { id: string; stockCount: number; price: number }[];
}

interface DashboardData {
  sellers: SellerProfile[];
  orders: Order[];
  users: User[];
  products?: AdminProduct[];
  auditLogs: AuditLog[];
  systemSettings: SystemSettings[];
  payouts: Payout[];
  categories: Category[];
  tags: Tag[];
  collections: Collection[];
  pendingSellers: SellerProfile[];
  stats: {
    revenue: number;
    platformFees: number;
    totalOrders: number;
    totalSellers: number;
    totalUsers: number;
    totalProducts: number;
  };
  error?: string;
  user?: SessionUser;
}

export default function AdminOS() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Access control - redirect non-admins
  useEffect(() => {
    const role = (session?.user as SessionUser)?.role;
    if (session && role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [session, router]);
  const [seedLoading, setSeedLoading] = useState(false);

  // Taxonomy Form State
  const [taxType, setTaxType] = useState<'category' | 'tag' | 'collection'>('category');
  const [taxName, setTaxName] = useState('');

  // Create User Modal State
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'BUYER' as Role,
    storeName: '',
  });
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  // Edit User Modal State
  const [showEditUser, setShowEditUser] = useState(false);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    id: '',
    name: '',
    email: '',
    role: 'BUYER' as Role,
  });
  const [editUserError, setEditUserError] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = (await getDashboardStats()) as unknown as DashboardData;
      if (res?.error) {
        setError(res.error);
        return;
      }
      setData(res);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Unauthorized');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (sellerId: string, status: SellerStatus) => {
    setActionLoading(sellerId);
    try {
      const res = (await updateSellerStatus(sellerId, status)) as { error?: string };
      if (res?.error) {
        alert(res.error);
        return;
      }
      await refreshData();
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateTaxonomy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = (await createTaxonomy(taxType, { name: taxName })) as { error?: string };
      if (res?.error) {
        alert(res.error);
        return;
      }
      setTaxName('');
      await refreshData();
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message);
    }
  };

  const handleDeleteTaxonomy = async (type: 'category' | 'tag' | 'collection', id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      const res = (await deleteTaxonomy(type, id)) as { error?: string };
      if (res?.error) {
        alert(res.error);
        return;
      }
      await refreshData();
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message);
    }
  };

  const handleSeed = async () => {
    setSeedLoading(true);
    try {
      const res = (await seedTestData()) as { error?: string };
      if (res?.error) {
        alert(res.error);
        return;
      }
      await refreshData();
      alert('System seeded with full operational data.');
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message);
    } finally {
      setSeedLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserLoading(true);
    setCreateUserError(null);
    try {
      const res = (await adminCreateUser(createUserForm)) as { error?: string };
      if (res?.error) {
        setCreateUserError(res.error);
        return;
      }
      setShowCreateUser(false);
      setCreateUserForm({ name: '', email: '', password: '', role: 'BUYER', storeName: '' });
      await refreshData();
    } catch (err: unknown) {
      const error = err as Error;
      setCreateUserError(error.message || 'Failed to create user.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete account "${email}"? This cannot be undone.`)) return;
    try {
      const res = (await adminDeleteUser(userId)) as { error?: string; message?: string };
      if (res?.error) {
        alert(res.error);
        return;
      }
      if (res?.message) alert(res.message);
      await refreshData();
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Failed to delete user.');
    }
  };

  const handleEditClick = (user: User) => {
    setEditUserForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setEditUserError(null);
    setShowEditUser(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditUserLoading(true);
    setEditUserError(null);
    try {
      const res = (await adminUpdateUser(editUserForm.id, {
        name: editUserForm.name,
        email: editUserForm.email,
        role: editUserForm.role,
      })) as { error?: string };
      if (res?.error) {
        setEditUserError(res.error);
        return;
      }
      setShowEditUser(false);
      await refreshData();
    } catch (err: unknown) {
      const error = err as Error;
      setEditUserError(error.message || 'Failed to update user.');
    } finally {
      setEditUserLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (loading && !data)
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-[#1a1a2e] font-medium">
        Initializing AdminOS...
      </div>
    );
  if (error)
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-red-600 font-bold">
        {error}
      </div>
    );

  return (
    <div className="db">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo">
          Admin<span>OS</span>
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

        <div className="nav-section">Main</div>
        <NavItem
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          label="Overview"
          icon={<OverviewIcon />}
        />
        <NavItem
          active={activeTab === 'sellers'}
          onClick={() => setActiveTab('sellers')}
          label="Sellers"
          icon={<SellersIcon />}
        />
        <NavItem
          active={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
          label="Users"
          icon={<UsersIcon />}
        />
        <NavItem
          active={activeTab === 'products'}
          onClick={() => setActiveTab('products')}
          label="Products"
          icon={<ProductsIcon />}
        />
        <NavItem
          active={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
          label="Orders"
          icon={<OrdersIcon />}
        />

        <div className="nav-section">Finance</div>
        <NavItem
          active={activeTab === 'payouts'}
          onClick={() => setActiveTab('payouts')}
          label="Payouts"
          icon={<PayoutsIcon />}
        />
        <NavItem
          active={activeTab === 'analytics'}
          onClick={() => setActiveTab('analytics')}
          label="Analytics"
          icon={<AnalyticsIcon />}
        />

        <div className="nav-section">Content</div>
        <NavItem
          active={activeTab === 'pages'}
          onClick={() => setActiveTab('pages')}
          label="Pages"
          icon={<DocIcon />}
        />
        <NavItem
          active={activeTab === 'reviews'}
          onClick={() => setActiveTab('reviews')}
          label="Reviews & Q&A"
          icon={<ReviewIcon />}
        />
        <NavItem
          active={activeTab === 'marketing'}
          onClick={() => setActiveTab('marketing')}
          label="Marketing"
          icon={<MarketingIcon />}
        />
        <NavItem
          active={activeTab === 'support'}
          onClick={() => setActiveTab('support')}
          label="Support"
          icon={<SupportIcon />}
        />

        <div className="nav-section">System</div>
        <NavItem
          active={activeTab === 'taxonomy'}
          onClick={() => setActiveTab('taxonomy')}
          label="Taxonomy"
          icon={<ModerationIcon />}
        />
        <NavItem
          active={activeTab === 'affiliate'}
          onClick={() => setActiveTab('affiliate')}
          label="Affiliate"
          icon={<AffiliateIcon />}
        />
        <NavItem
          active={activeTab === 'plugins'}
          onClick={() => setActiveTab('plugins')}
          label="Plugins"
          icon={<PluginIcon />}
        />
        <NavItem
          active={activeTab === 'maintenance'}
          onClick={() => setActiveTab('maintenance')}
          label="Maintenance"
          icon={<WrenchIcon />}
        />
        <NavItem
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
          label="Settings"
          icon={<SettingsIcon />}
        />

        <div className="mt-auto px-4 pb-4 flex flex-col gap-2">
          <button onClick={handleSeed} disabled={seedLoading} className="seed-btn">
            {seedLoading ? 'Seeding...' : 'Seed Data'}
          </button>
          <div className="user-label">{data?.user?.email}</div>
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
            <div className="applications-badge">
              <div className="alert-dot"></div>
              {data?.pendingSellers?.length || 0} pending
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
                  fill="#534AB7"
                  opacity=".8"
                />
                <path
                  d="M6.5 13.5a1.5 1.5 0 003 0"
                  stroke="#534AB7"
                  strokeWidth="1.2"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="tab-content animate-fadeIn">
          {activeTab === 'overview' && data && (
            <OverviewTab
              data={data}
              handleStatusUpdate={handleStatusUpdate}
              actionLoading={actionLoading}
            />
          )}
          {activeTab === 'sellers' && data && (
            <SellersTab
              data={data}
              handleStatusUpdate={handleStatusUpdate}
              actionLoading={actionLoading}
            />
          )}
          {activeTab === 'users' && data && (
            <UsersTab
              data={data}
              onDelete={handleDeleteUser}
              onEdit={handleEditClick}
              onCreateClick={() => setShowCreateUser(true)}
            />
          )}
          {activeTab === 'products' && data && <ProductsTab data={data} />}
          {activeTab === 'orders' && data && <OrdersTab data={data} onRefresh={refreshData} />}
          {activeTab === 'payouts' && data && <PayoutsTab data={data} />}
          {activeTab === 'analytics' && data && <AnalyticsTab data={data} />}
          {activeTab === 'taxonomy' && data && (
            <TaxonomyTab
              data={data}
              onTypeChange={setTaxType}
              currentType={taxType}
              onNameChange={setTaxName}
              nameValue={taxName}
              onCreate={handleCreateTaxonomy}
              onDelete={handleDeleteTaxonomy}
            />
          )}
          {activeTab === 'settings' && <NewSettingsTab />}
          {activeTab === 'plugins' && <PluginsTab />}
          {activeTab === 'pages' && <PagesTab />}
          {activeTab === 'reviews' && <ReviewsTab />}
          {activeTab === 'marketing' && <MarketingTab />}
          {activeTab === 'support' && <SupportTab />}
          {activeTab === 'maintenance' && <MaintenanceTab />}
          {activeTab === 'affiliate' && <AffiliateTab />}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <CreateUserModal
          form={createUserForm}
          onChange={(f: typeof createUserForm) => setCreateUserForm(f)}
          onSubmit={handleCreateUser}
          onClose={() => {
            setShowCreateUser(false);
            setCreateUserError(null);
          }}
          loading={createUserLoading}
          error={createUserError}
        />
      )}

      {/* Edit User Modal */}
      {showEditUser && (
        <EditUserModal
          form={editUserForm}
          onChange={(f: typeof editUserForm) => setEditUserForm(f)}
          onSubmit={handleUpdateUser}
          onClose={() => {
            setShowEditUser(false);
            setEditUserError(null);
          }}
          loading={editUserLoading}
          error={editUserError}
        />
      )}

      <style jsx global>{`
        :root {
          --color-primary: #534AB7;
          --color-background-primary: #ffffff;
          --color-background-secondary: #f8fafc;
          --color-text-primary: #1e293b;
          --color-text-secondary: #64748b;
          --color-border-tertiary: rgba(0,0,0,0.06);
        }
        *{box-sizing:border-box;margin:0;padding:0}
        /* Whole admin dashboard scrolls naturally; sidebar stays in view via
           position: sticky so the nav stays accessible while you scroll. The
           layout is intentionally compact so a typical 13"/14" laptop
           (~1280-1440px wide, 720-900px tall) shows full content without
           feeling cramped. */
        .db{display:flex;height:100dvh;overflow:hidden;background:var(--color-background-secondary);font-family: 'Inter', sans-serif;}
        .sidebar{width:180px;min-width:180px;background:#1a1a2e;padding:14px 0;display:flex;flex-direction:column;flex-shrink:0;height:100%;overflow-y:auto}
        /* Laptops in the 1280-1440px range get a slightly tighter sidebar +
           main padding so the 4-column stats grid never wraps. */
        @media (min-width: 901px) and (max-width: 1440px){
          .sidebar{width:168px;min-width:168px}
          .main{padding:14px 16px 60px !important}
          .stats{gap:8px !important}
          .stat{padding:10px !important}
          .stat-val{font-size:18px !important}
        }
        @media (max-width: 900px){
          .db{flex-direction:column;height:auto;overflow:visible}
          .sidebar{width:100%;min-width:0;height:auto;flex-direction:row;flex-wrap:wrap;padding:8px;gap:4px;overflow-x:auto;overflow-y:visible}
          .sidebar .nav-section{display:none}
          .sidebar .nav-item{padding:6px 10px !important;font-size:11px !important}
          .main{height:auto;overflow-y:visible;padding:14px !important}
          .stats{grid-template-columns:repeat(2,1fr) !important}
        }
        .logo{padding:0 14px 18px;font-size:14px;font-weight:500;color:#fff}
        .logo span{color:#7F77DD}
        .nav-section{font-size:10px;font-weight:500;color:#444;letter-spacing:.08em;padding:10px 14px 4px;text-transform:uppercase}
        .nav-item{display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;font-size:12px;color:#888;transition:all .12s}
        .nav-item:hover{background:rgba(255,255,255,.05);color:#ccc}
        .nav-item.active{background:rgba(127,119,221,.15);color:#AFA9EC}
        .nav-icon{width:14px;height:14px;flex-shrink:0}
        .main{flex:1;min-width:0;padding:16px 18px;padding-bottom:60px;background:var(--color-background-secondary);height:100%;overflow-y:auto}
        .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
        .page-title{font-size:16px;font-weight:500;color:var(--color-text-primary)}
        .seed-btn { text-[10px]; text-white/40; hover:text-white; bg:white/5; py:1.5; rounded:4px; transition:all 0.2s; border:none; cursor:pointer; }
        .user-label { font-size: 10px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .signout-btn { text-align: left; font-size: 10px; color: rgba(239,68,68,0.6); background: none; border: none; cursor: pointer; }
        .applications-badge { display:flex;align-items:center;gap:5px;font-size:12px;color:var(--color-text-secondary); }
        .alert-dot { width:8px;height:8px;border-radius:50%;background:#E24B4A;flex-shrink:0; }
        .refresh-btn { width:34px;height:34px;borderRadius:6px;background:#EEEDFE;display:flex;align-items:center;justify-content:center;cursor:pointer; }
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:14px}
        .stat{background:var(--color-background-primary);border-radius:8px;padding:12px;border:1px solid var(--color-border-tertiary)}
        .stat-label{font-size:10px;color:var(--color-text-secondary);margin-bottom:5px;text-transform:uppercase;letter-spacing:.04em}
        .stat-val{font-size:20px;font-weight:500;color:var(--color-text-primary);line-height:1}
        .stat-sub{font-size:11px;margin-top:4px}
        .up{color:#27500A}.down{color:#791F1F}
        .card{background:var(--color-background-primary);border-radius:12px;border:1px solid var(--color-border-tertiary);padding:14px;margin-bottom:11px}
        .card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px}
        .card-title{font-size:13px;font-weight:500;color:var(--color-text-primary)}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:11px}
        .badge{font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;flex-shrink:0}
        .b-pending{background:#FAEEDA;color:#633806}
        .b-active{background:#E1F5EE;color:#085041}
        .b-banned{background:#FCEBEB;color:#791F1F}
        .b-new{background:#EEEDFE;color:#3C3489}
        .action-btn{font-size:11px;padding:3px 9px;border-radius:4px;cursor:pointer;border:1px solid #e2e8f0;background:transparent;color:var(--color-text-secondary);transition:all .15s}
        .action-btn:hover{background:var(--color-background-secondary);border-color:var(--color-text-primary)}
        .row-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--color-border-tertiary)}
        .row-item:last-child{border-bottom:none}
        .avatar-sm{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;flex-shrink:0}
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .input-tax { width:100%; border:1px solid #e2e8f0; padding:8px 12px; border-radius:6px; font-size:12px; outline:none; }
        .input-tax:focus { border-color: var(--color-primary); }
        .modal-overlay { position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px; }
        .modal-box { background:#fff;width:100%;max-width:480px;padding:28px;border-radius:16px;box-shadow:0 25px 60px rgba(0,0,0,0.2); }
        .modal-title { font-size:16px;font-weight:600;color:#1e293b;margin-bottom:20px; }
        .form-group { margin-bottom:14px; }
        .form-label { display:block;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px; }
        .form-input { width:100%;border:1px solid #e2e8f0;padding:9px 12px;border-radius:8px;font-size:13px;outline:none;background:#fff;color:#1e293b; }
        .form-input:focus { border-color:#534AB7;box-shadow:0 0 0 3px rgba(83,74,183,0.1); }
        .role-select { appearance:none;cursor:pointer; }
        .btn-primary { width:100%;padding:11px;background:#534AB7;color:#fff;font-size:13px;font-weight:600;border:none;border-radius:8px;cursor:pointer;transition:opacity .15s; }
        .btn-primary:hover { opacity:.9; }
        .btn-primary:disabled { opacity:.5;cursor:not-allowed; }
        .btn-ghost { background:none;border:none;padding:11px;font-size:13px;color:#64748b;cursor:pointer;width:100%; }
        .error-banner { background:#FEF2F2;border:1px solid #FCA5A5;color:#B91C1C;font-size:12px;padding:10px 14px;border-radius:8px;margin-bottom:14px; }
        .del-btn { font-size:10px;color:#E24B4A;background:none;border:none;cursor:pointer;padding:3px 8px;border-radius:4px; }
        .del-btn:hover { background:#FEF2F2; }
      `}</style>
    </div>
  );
}

const TITLES: Record<string, string> = {
  overview: 'Platform overview',
  sellers: 'Seller management',
  users: 'User registry',
  products: 'Product catalog',
  orders: 'Order oversight',
  payouts: 'Financial settlements',
  analytics: 'Revenue analytics',
  pages: 'Pages CMS',
  reviews: 'Reviews & Q&A moderation',
  marketing: 'Marketing & campaigns',
  support: 'Customer support inbox',
  taxonomy: 'Classification systems',
  affiliate: 'Affiliate program',
  plugins: 'Plugins & integrations',
  maintenance: 'Maintenance & system',
  settings: 'System configuration',
};

// ─── AffiliateIcon ────────────────────────────────────────────────────────────
function AffiliateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M18 8h4M20 6v4" />
    </svg>
  );
}

// ─── AffiliateTab ─────────────────────────────────────────────────────────────
type AdminAff = {
  id: string;
  promoCode: string;
  status: string;
  tier: string;
  totalConversions: number;
  totalEarnedEgp: number;
  pendingEarningsEgp: number;
  customCommissionPct: number | null;
  customDiscountPct: number | null;
  adminNote: string | null;
  platform: string | null;
  platformFollowers: number | null;
  categoryFocus: string | null;
  applicationNote: string | null;
  payoutMethod: string | null;
  approvedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
};
type AdminPayout = {
  id: string;
  affiliateName: string;
  affiliateEmail: string;
  promoCode: string;
  amountEgp: number;
  method: string;
  payoutDetails: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  processedAt: string | null;
};
type AffStats = {
  totalActive: number;
  totalPending: number;
  commissionsPaidEgp: number;
  revenueFromRefsEgp: number;
};
type GlobalSettings = {
  defaultDiscountPct: number;
  maxDiscountPct: number;
  referrerBonusEgp: number;
  joinerBonusEgp: number;
  bonusExpiryDays: number;
  bonusesEnabled: boolean;
  programEnabled: boolean;
};
type TierCfg = {
  id: string;
  tier: string;
  name: string;
  minConversions: number;
  commissionPct: number;
  isActive: boolean;
};

function AffiliateTab() {
  const [panel, setPanel] = React.useState<'settings' | 'affiliates' | 'pending' | 'payouts'>(
    'settings'
  );
  const [affiliates, setAffiliates] = React.useState<AdminAff[]>([]);
  const [payouts, setPayouts] = React.useState<AdminPayout[]>([]);
  const [stats, setStats] = React.useState<AffStats | null>(null);
  const [settings, setSettings] = React.useState<GlobalSettings | null>(null);
  const [tiers, setTiers] = React.useState<TierCfg[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<{
    status: string;
    customCommissionPct: string;
    customDiscountPct: string;
    adminNote: string;
    promoCode: string;
    tier: string;
  }>({
    status: '',
    customCommissionPct: '',
    customDiscountPct: '',
    adminNote: '',
    promoCode: '',
    tier: '',
  });
  const [settingsForm, setSettingsForm] = React.useState<Partial<GlobalSettings>>({});
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [settingsMsg, setSettingsMsg] = React.useState('');

  async function load() {
    setLoading(true);
    try {
      const [affRes, payRes, setRes] = await Promise.all([
        fetch('/api/admin/affiliate').then(r => r.json()),
        fetch('/api/admin/affiliate/payouts').then(r => r.json()),
        fetch('/api/admin/affiliate/settings').then(r => r.json()),
      ]);
      setAffiliates(affRes.affiliates ?? []);
      setStats(affRes.stats ?? null);
      setPayouts(payRes.payouts ?? []);
      setSettings(setRes.settings ?? null);
      setTiers(setRes.tiers ?? []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    await fetch(`/api/admin/affiliate/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    load();
  }

  async function reject(id: string) {
    await fetch(`/api/admin/affiliate/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REJECTED' }),
    });
    load();
  }

  async function saveEdit() {
    if (!editId) return;
    await fetch(`/api/admin/affiliate/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: editForm.status || undefined,
        customCommissionPct: editForm.customCommissionPct
          ? parseFloat(editForm.customCommissionPct)
          : null,
        customDiscountPct: editForm.customDiscountPct
          ? parseFloat(editForm.customDiscountPct)
          : null,
        adminNote: editForm.adminNote || undefined,
        promoCode: editForm.promoCode || undefined,
        tier: editForm.tier || undefined,
      }),
    });
    setEditId(null);
    load();
  }

  async function markPayoutPaid(id: string) {
    await fetch(`/api/admin/affiliate/payouts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAID' }),
    });
    load();
  }

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsMsg('');
    try {
      const payload: Record<string, unknown> = {};
      if (settingsForm.defaultDiscountPct !== undefined)
        payload.defaultDiscountPct = settingsForm.defaultDiscountPct;
      if (settingsForm.maxDiscountPct !== undefined)
        payload.maxDiscountPct = settingsForm.maxDiscountPct;
      if (settingsForm.referrerBonusEgp !== undefined)
        payload.referrerBonusEgp = settingsForm.referrerBonusEgp;
      if (settingsForm.joinerBonusEgp !== undefined)
        payload.joinerBonusEgp = settingsForm.joinerBonusEgp;
      if (settingsForm.bonusesEnabled !== undefined)
        payload.bonusesEnabled = settingsForm.bonusesEnabled;
      if (settingsForm.programEnabled !== undefined)
        payload.programEnabled = settingsForm.programEnabled;
      await fetch('/api/admin/affiliate/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // Save tiers
      await fetch('/api/admin/affiliate/tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          tiers.map(t => ({
            tier: t.tier,
            name: t.name,
            minConversions: t.minConversions,
            commissionPct: t.commissionPct,
            isActive: t.isActive,
          }))
        ),
      });
      setSettingsMsg('Saved ✓');
      load();
    } finally {
      setSavingSettings(false);
    }
  }

  const pending = affiliates.filter(a => a.status === 'PENDING');
  const active = affiliates.filter(a => a.status === 'ACTIVE' || a.status === 'PAUSED');
  const filtered = active.filter(
    a =>
      !search ||
      `${a.user?.name} ${a.user?.email} ${a.promoCode}`.toLowerCase().includes(search.toLowerCase())
  );

  const tierColors: Record<string, string> = {
    STARTER: '#64748b',
    SILVER: '#94a3b8',
    GOLD: '#d97706',
    PLATINUM: '#7c3aed',
  };

  if (loading)
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        Loading affiliate data...
      </div>
    );

  const s = settings ?? ({} as GlobalSettings);

  return (
    <div>
      {/* Stats bar */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat">
          <div className="stat-label">Active affiliates</div>
          <div className="stat-val">{stats?.totalActive ?? 0}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Commissions paid</div>
          <div className="stat-val" style={{ fontSize: 16 }}>
            {(stats?.commissionsPaidEgp ?? 0).toLocaleString()} EGP
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Revenue from refs</div>
          <div className="stat-val" style={{ fontSize: 16 }}>
            {(stats?.revenueFromRefsEgp ?? 0).toLocaleString()} EGP
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Pending apps</div>
          <div className="stat-val" style={{ color: pending.length ? '#d97706' : undefined }}>
            {stats?.totalPending ?? 0}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          marginBottom: 14,
        }}
      >
        {(['settings', 'affiliates', 'pending', 'payouts'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPanel(p)}
            style={{
              padding: '7px 14px',
              fontSize: 12,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: panel === p ? '#1e293b' : '#94a3b8',
              borderBottom: panel === p ? '2px solid #534AB7' : '2px solid transparent',
              fontWeight: panel === p ? 600 : 400,
            }}
          >
            {p === 'pending'
              ? `Pending (${pending.length})`
              : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Global Settings ── */}
      {panel === 'settings' && (
        <div>
          {/* Commission tiers */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Commission tiers</div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 50px',
                gap: 8,
                fontSize: 11,
                color: '#94a3b8',
                padding: '0 0 6px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                marginBottom: 8,
              }}
            >
              <span>Tier name</span>
              <span>Min conversions</span>
              <span>Commission %</span>
              <span></span>
            </div>
            {tiers.map((t, i) => (
              <div
                key={t.tier}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 50px',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <input
                  value={t.name}
                  onChange={e =>
                    setTiers(ts => ts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                  style={{
                    fontSize: 12,
                    padding: '5px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    outline: 'none',
                  }}
                />
                <input
                  type="number"
                  value={t.minConversions}
                  onChange={e =>
                    setTiers(ts =>
                      ts.map((x, j) =>
                        j === i ? { ...x, minConversions: parseInt(e.target.value) || 0 } : x
                      )
                    )
                  }
                  style={{
                    fontSize: 12,
                    padding: '5px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={t.commissionPct}
                    onChange={e =>
                      setTiers(ts =>
                        ts.map((x, j) =>
                          j === i ? { ...x, commissionPct: parseFloat(e.target.value) } : x
                        )
                      )
                    }
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, minWidth: 32 }}>
                    {t.commissionPct}%
                  </span>
                </div>
                <span
                  className="badge"
                  style={{ background: '#E1F5EE', color: '#085041', fontSize: 10 }}
                >
                  {t.tier === 'PLATINUM' ? 'VIP' : 'Active'}
                </span>
              </div>
            ))}
          </div>

          {/* Buyer discount + bonuses */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Buyer discount settings</div>
            </div>
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}
            >
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>
                  Default buyer discount %
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    value={settingsForm.defaultDiscountPct ?? s.defaultDiscountPct ?? 15}
                    onChange={e =>
                      setSettingsForm(f => ({
                        ...f,
                        defaultDiscountPct: parseFloat(e.target.value),
                      }))
                    }
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 32 }}>
                    {settingsForm.defaultDiscountPct ?? s.defaultDiscountPct ?? 15}%
                  </span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>
                  Max allowed discount %
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={settingsForm.maxDiscountPct ?? s.maxDiscountPct ?? 30}
                    onChange={e =>
                      setSettingsForm(f => ({ ...f, maxDiscountPct: parseFloat(e.target.value) }))
                    }
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 32 }}>
                    {settingsForm.maxDiscountPct ?? s.maxDiscountPct ?? 30}%
                  </span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8' }}>
              Affiliates can set their own discount within the max limit.
            </p>
          </div>

          {/* Referral bonuses */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Referral signup bonuses</div>
            </div>
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}
            >
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>
                  Referrer bonus (EGP)
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="range"
                    min={0}
                    max={500}
                    step={5}
                    value={settingsForm.referrerBonusEgp ?? s.referrerBonusEgp ?? 50}
                    onChange={e =>
                      setSettingsForm(f => ({ ...f, referrerBonusEgp: parseFloat(e.target.value) }))
                    }
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 56 }}>
                    {settingsForm.referrerBonusEgp ?? s.referrerBonusEgp ?? 50} EGP
                  </span>
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>
                  New joiner bonus (EGP)
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="range"
                    min={0}
                    max={500}
                    step={5}
                    value={settingsForm.joinerBonusEgp ?? s.joinerBonusEgp ?? 30}
                    onChange={e =>
                      setSettingsForm(f => ({ ...f, joinerBonusEgp: parseFloat(e.target.value) }))
                    }
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 56 }}>
                    {settingsForm.joinerBonusEgp ?? s.joinerBonusEgp ?? 30} EGP
                  </span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
              Bonus credited as store credit, redeemable after new joiner places first order.
            </p>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={settingsForm.bonusesEnabled ?? s.bonusesEnabled ?? true}
                onChange={e => setSettingsForm(f => ({ ...f, bonusesEnabled: e.target.checked }))}
              />
              Referral bonuses enabled
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              style={{
                padding: '8px 20px',
                background: '#534AB7',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {savingSettings ? 'Saving...' : 'Save all settings'}
            </button>
            {settingsMsg && (
              <span style={{ fontSize: 12, color: '#085041', fontWeight: 600 }}>{settingsMsg}</span>
            )}
          </div>
        </div>
      )}

      {/* ── All Affiliates ── */}
      {panel === 'affiliates' && (
        <div>
          <input
            placeholder="Search by name, email or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              marginBottom: 12,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 80px 70px 70px 90px 70px',
                gap: 8,
                padding: '8px 14px',
                fontSize: 11,
                color: '#94a3b8',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                fontWeight: 600,
              }}
            >
              <span></span>
              <span>Affiliate</span>
              <span>Code</span>
              <span>Tier</span>
              <span>Conv.</span>
              <span>Earned</span>
              <span>Action</span>
            </div>
            {filtered.map(a => (
              <div
                key={a.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 80px 70px 70px 90px 70px',
                  gap: 8,
                  padding: '8px 14px',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#EEEDFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#534AB7',
                    flexShrink: 0,
                  }}
                >
                  {(a.user?.name ?? 'U').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 12 }}>{a.user?.name}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{a.user?.email}</div>
                </div>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>
                  {a.promoCode}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 10,
                    background: '#f1f5f9',
                    color: tierColors[a.tier] ?? '#1e293b',
                    fontWeight: 600,
                  }}
                >
                  {a.tier}
                </span>
                <span style={{ fontWeight: 500 }}>{a.totalConversions}</span>
                <span style={{ color: '#085041', fontWeight: 600 }}>
                  {a.totalEarnedEgp.toLocaleString()} EGP
                </span>
                <button
                  onClick={() => {
                    setEditId(a.id);
                    setEditForm({
                      status: a.status,
                      customCommissionPct: a.customCommissionPct?.toString() ?? '',
                      customDiscountPct: a.customDiscountPct?.toString() ?? '',
                      adminNote: a.adminNote ?? '',
                      promoCode: a.promoCode,
                      tier: a.tier,
                    });
                  }}
                  className="action-btn"
                >
                  Edit
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                No affiliates found.
              </div>
            )}
          </div>

          {/* Edit panel */}
          {editId && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-header">
                <div className="card-title">Edit affiliate</div>
                <button
                  onClick={() => setEditId(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 18,
                    color: '#94a3b8',
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label
                    style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}
                  >
                    Custom commission % (overrides tier)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      value={parseFloat(editForm.customCommissionPct) || 8}
                      onChange={e =>
                        setEditForm(f => ({ ...f, customCommissionPct: e.target.value }))
                      }
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 32 }}>
                      {editForm.customCommissionPct || 8}%
                    </span>
                  </div>
                </div>
                <div>
                  <label
                    style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}
                  >
                    Custom buyer discount % (overrides global)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={parseFloat(editForm.customDiscountPct) || 15}
                      onChange={e =>
                        setEditForm(f => ({ ...f, customDiscountPct: e.target.value }))
                      }
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 32 }}>
                      {editForm.customDiscountPct || 15}%
                    </span>
                  </div>
                </div>
                <div>
                  <label
                    style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}
                  >
                    Override promo code
                  </label>
                  <input
                    value={editForm.promoCode}
                    onChange={e =>
                      setEditForm(f => ({
                        ...f,
                        promoCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                      }))
                    }
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}
                  >
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 12,
                      outline: 'none',
                      background: '#fff',
                    }}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="BANNED">Banned</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}
                  >
                    Admin note
                  </label>
                  <input
                    value={editForm.adminNote}
                    onChange={e => setEditForm(f => ({ ...f, adminNote: e.target.value }))}
                    placeholder="Internal note..."
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={saveEdit}
                  style={{
                    padding: '7px 18px',
                    background: '#534AB7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save changes
                </button>
                <button
                  onClick={() => setEditId(null)}
                  style={{
                    padding: '7px 18px',
                    background: 'none',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Pending Applications ── */}
      {panel === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pending.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
              Queue clear. No pending applications.
            </div>
          )}
          {pending.map(a => (
            <div key={a.id} className="card" style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#EEEDFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#534AB7',
                    }}
                  >
                    {(a.user?.name ?? 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.user?.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {a.user?.email} · Applied {new Date(a.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 20,
                    background: '#FAEEDA',
                    color: '#633806',
                    fontWeight: 600,
                  }}
                >
                  Pending review
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 10,
                  marginTop: 12,
                  fontSize: 12,
                }}
              >
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>
                    Requested code
                  </span>
                  <strong style={{ fontFamily: 'monospace' }}>{a.promoCode}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>
                    Platform
                  </span>
                  <strong>
                    {a.platform ?? '-'}
                    {a.platformFollowers
                      ? ` · ${a.platformFollowers.toLocaleString()} followers`
                      : ''}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>
                    Category focus
                  </span>
                  <strong>{a.categoryFocus ?? '-'}</strong>
                </div>
              </div>
              {a.applicationNote && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '8px 10px',
                    background: '#f8fafc',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#64748b',
                  }}
                >
                  &quot;{a.applicationNote}&quot;
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => approve(a.id)}
                  style={{
                    padding: '7px 16px',
                    background: '#1D9E75',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(a.id)}
                  style={{
                    padding: '7px 16px',
                    background: 'transparent',
                    border: '1px solid #E24B4A',
                    color: '#E24B4A',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Payouts ── */}
      {panel === 'payouts' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Affiliate payout requests</div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 110px 80px 100px',
              gap: 8,
              fontSize: 11,
              color: '#94a3b8',
              padding: '6px 0',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              fontWeight: 600,
            }}
          >
            <span>Affiliate</span>
            <span>Amount</span>
            <span>Method</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {payouts
            .filter(p => p.status === 'REQUESTED' || p.status === 'PROCESSING')
            .map(p => (
              <div
                key={p.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 110px 80px 100px',
                  gap: 8,
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{p.affiliateName}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{p.promoCode}</div>
                </div>
                <span style={{ color: '#d97706', fontWeight: 600 }}>
                  {Number(p.amountEgp).toLocaleString()} EGP
                </span>
                <span>{p.method?.replace(/_/g, ' ')}</span>
                <span className="badge b-pending">{p.status}</span>
                <button onClick={() => markPayoutPaid(p.id)} className="action-btn">
                  Mark paid
                </button>
              </div>
            ))}
          {payouts.filter(p => p.status === 'REQUESTED' || p.status === 'PROCESSING').length ===
            0 && (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
              No pending payouts.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

interface OverviewTabProps {
  data: DashboardData;
  handleStatusUpdate: (id: string, status: SellerStatus) => Promise<void>;
  actionLoading: string | null;
}

function OverviewTab({ data, handleStatusUpdate, actionLoading }: OverviewTabProps) {
  const stats = data?.stats || {};
  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">GMV (Total)</div>
          <div className="stat-val">{(stats.revenue || 0).toLocaleString()}</div>
          <div className="stat-sub up">+24% vs last month</div>
        </div>
        <div className="stat">
          <div className="stat-label">Platform revenue</div>
          <div className="stat-val" style={{ color: '#534AB7' }}>
            {(stats.platformFees || 0).toLocaleString()}
          </div>
          <div className="stat-sub" style={{ color: 'var(--color-text-secondary)' }}>
            EGP (Net Fees)
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Active sellers</div>
          <div className="stat-val">{stats.totalSellers || 0}</div>
          <div className="stat-sub up">+12 this month</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total users</div>
          <div className="stat-val">{stats.totalUsers || 0}</div>
          <div className="stat-sub up">+340 today</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Audit Log</div>
          </div>
          {data?.auditLogs?.slice(0, 5).map((log: AuditLog) => (
            <div key={log.id} className="row-item" style={{ fontSize: '11px' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: log.action.includes('SUSPENDED') ? '#E24B4A' : '#1D9E75',
                }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{log.admin?.name}</span>
                <span style={{ color: '#64748b' }}>
                  {' '}
                  {log.action.replace(/_/g, ' ').toLowerCase()}{' '}
                </span>
                <span style={{ fontWeight: 500 }}>{log.details}</span>
              </div>
              <div style={{ color: '#94a3b8' }}>
                {new Date(log.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
          {!data?.auditLogs?.length && (
            <div className="py-10 text-center text-xs text-slate-400">
              No logs yet. Seed data to test.
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Pending Approvals</div>
          </div>
          {data?.pendingSellers?.slice(0, 3).map((s: SellerProfile) => (
            <div key={s.id} className="row-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500 }}>{s.storeName}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{s.user?.email}</div>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  disabled={actionLoading === s.id}
                  onClick={() => handleStatusUpdate(s.id, 'ACTIVE')}
                  className="action-btn"
                  style={{ borderColor: '#0F6E56', color: '#085041' }}
                >
                  Approve
                </button>
                <button
                  disabled={actionLoading === s.id}
                  onClick={() => handleStatusUpdate(s.id, 'SUSPENDED')}
                  className="action-btn"
                  style={{ borderColor: '#A32D2D', color: '#791F1F' }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {!data?.pendingSellers?.length && (
            <div className="py-10 text-center text-xs text-slate-400">Queue clear.</div>
          )}
        </div>
      </div>
    </>
  );
}

interface SellersTabProps {
  data: DashboardData;
  handleStatusUpdate: (id: string, status: SellerStatus) => Promise<void>;
  actionLoading: string | null;
}

/**
 * Reusable search input used by every list-style admin tab so admins can
 * type a few characters and instantly narrow the table.
 */
function SearchInput({
  value,
  onChange,
  placeholder,
  count,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  count: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="relative flex-1">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-7 py-1.5 rounded-md border border-slate-200 bg-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#534AB7]"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 px-1"
          >
            ×
          </button>
        )}
      </div>
      <span className="text-[11px] text-slate-400 whitespace-nowrap">{count}</span>
    </div>
  );
}

function SellersTab({ data, handleStatusUpdate, actionLoading }: SellersTabProps) {
  const [search, setSearch] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const q = search.trim().toLowerCase();
  const sellers = (data?.sellers || []).filter((s: SellerProfile) => {
    if (!q) return true;
    return `${s.storeName || ''} ${s.user?.name || ''} ${s.user?.email || ''} ${s.status || ''}`
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">All Sellers</div>
      </div>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search sellers by store, owner, email or status…"
        count={`${sellers.length} / ${data?.sellers?.length || 0}`}
      />
      <div className="row-item font-bold text-[11px] text-slate-400 uppercase">
        <span className="flex-1">Store Name / Owner</span>
        <span className="w-32 text-center">Status</span>
        <span className="w-32 text-right">Balance</span>
        <span className="w-48 text-right">Actions</span>
      </div>
      {sellers.map((s: any) => (
        <div key={s.id} className="row-item">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 500 }}>{s.storeName}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{s.user?.name}</div>
          </div>
          <div className="w-32 flex justify-center">
            <span
              className={`badge ${s.status === 'ACTIVE' ? 'b-active' : s.status === 'PENDING_APPROVAL' ? 'b-pending' : 'b-banned'}`}
            >
              {s.status}
            </span>
          </div>
          <div className="w-32 text-right text-sm font-medium">
            {s.balance?.toLocaleString()} EGP
          </div>
          <div className="w-48 text-right flex justify-end gap-2">
            <button
              onClick={() => setSelectedSeller(s)}
              className="action-btn"
              style={{ background: '#f1f5f9', color: '#475569' }}
            >
              Details
            </button>
            <button
              disabled={actionLoading === s.id}
              onClick={() =>
                handleStatusUpdate(s.id, s.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')
              }
              className="action-btn"
            >
              {s.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
            </button>
          </div>
        </div>
      ))}
      {sellers.length === 0 && (
        <div className="py-10 text-center text-xs text-slate-400">
          {q ? `No sellers match "${search}".` : 'No sellers yet.'}
        </div>
      )}

      {selectedSeller && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px',
          }}
          onClick={() => setSelectedSeller(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '680px',
              maxWidth: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '24px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#4f46e5',
                  }}
                >
                  {selectedSeller.storeName?.[0]?.toUpperCase() || 'S'}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                    {selectedSeller.storeName}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Owned by {selectedSeller.user?.name}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className={`badge ${selectedSeller.status === 'ACTIVE' ? 'b-active' : selectedSeller.status === 'PENDING_APPROVAL' ? 'b-pending' : 'b-banned'}`}
                >
                  {selectedSeller.status}
                </span>
                <button
                  onClick={() => setSelectedSeller(null)}
                  style={{
                    border: 'none',
                    background: 'none',
                    fontSize: '18px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Owner Info & Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h4
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: '#94a3b8',
                      letterSpacing: '0.05em',
                      marginBottom: '10px',
                    }}
                  >
                    👤 Owner Contact Details
                  </h4>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      fontSize: '13px',
                      color: '#334155',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <li>
                      <strong>Email:</strong> {selectedSeller.user?.email}
                    </li>
                    <li>
                      <strong>Phone:</strong> {selectedSeller.user?.phone || 'Not provided'}
                    </li>
                    <li>
                      <strong>Verified:</strong>{' '}
                      {selectedSeller.user?.emailVerified
                        ? `✅ Verified on ${new Date(selectedSeller.user.emailVerified).toLocaleDateString()}`
                        : '❌ Email Unverified'}
                    </li>
                    <li>
                      <strong>Joined:</strong>{' '}
                      {new Date(
                        selectedSeller.user?.createdAt || selectedSeller.createdAt
                      ).toLocaleDateString()}
                    </li>
                  </ul>
                </div>
                <div>
                  <h4
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: '#94a3b8',
                      letterSpacing: '0.05em',
                      marginBottom: '10px',
                    }}
                  >
                    💰 Ledger & Escrow Account
                  </h4>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      fontSize: '13px',
                      color: '#334155',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <li>
                      <strong>Available Balance:</strong>{' '}
                      <span style={{ color: '#059669', fontWeight: '600' }}>
                        {selectedSeller.balance?.toLocaleString()} EGP
                      </span>
                    </li>
                    <li>
                      <strong>Bank Account:</strong>{' '}
                      {selectedSeller.bankAccount || 'Not configured'}
                    </li>
                    <li>
                      <strong>Platform Commission:</strong>{' '}
                      {Math.round((selectedSeller.commissionRate ?? 0.15) * 100)}%
                    </li>
                    <li>
                      <strong>Location:</strong> {selectedSeller.governorate || 'N/A'},{' '}
                      {selectedSeller.city || 'N/A'}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Listings */}
              <div>
                <h4
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    letterSpacing: '0.05em',
                    marginBottom: '10px',
                  }}
                >
                  📦 Products & Listings ({selectedSeller.products?.length || 0} Total)
                </h4>
                {selectedSeller.products && selectedSeller.products.length > 0 ? (
                  <div
                    style={{
                      maxHeight: '160px',
                      overflow: 'auto',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      padding: '8px 12px',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            textAlign: 'left',
                            color: '#64748b',
                          }}
                        >
                          <th style={{ padding: '6px 0' }}>Product Name</th>
                          <th style={{ padding: '6px 0', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSeller.products.map((p: any) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 0', color: '#1e293b' }}>{p.title}</td>
                            <td style={{ padding: '6px 0', textAlign: 'right' }}>
                              <span
                                className={`badge ${p.published ? 'b-active' : 'b-pending'}`}
                                style={{ fontSize: '9px', padding: '2px 4px' }}
                              >
                                {p.published ? 'PUBLISHED' : 'DRAFT'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                    No products listed yet.
                  </p>
                )}
              </div>

              {/* Payouts */}
              <div>
                <h4
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    letterSpacing: '0.05em',
                    marginBottom: '10px',
                  }}
                >
                  💸 Payout History ({selectedSeller.payouts?.length || 0} Records)
                </h4>
                {selectedSeller.payouts && selectedSeller.payouts.length > 0 ? (
                  <div
                    style={{
                      maxHeight: '160px',
                      overflow: 'auto',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      padding: '8px 12px',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            textAlign: 'left',
                            color: '#64748b',
                          }}
                        >
                          <th style={{ padding: '6px 0' }}>Date</th>
                          <th style={{ padding: '6px 0', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '6px 0', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSeller.payouts.map((pay: any) => (
                          <tr key={pay.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 0', color: '#1e293b' }}>
                              {new Date(pay.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: '500' }}>
                              {pay.amount.toLocaleString()} EGP
                            </td>
                            <td style={{ padding: '6px 0', textAlign: 'right' }}>
                              <span
                                className={`badge ${pay.status === 'COMPLETED' ? 'b-active' : pay.status === 'PENDING' ? 'b-pending' : 'b-banned'}`}
                                style={{ fontSize: '9px', padding: '2px 4px' }}
                              >
                                {pay.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                    No payouts requested yet.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #f1f5f9',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
              }}
            >
              <button
                onClick={() => setSelectedSeller(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Close Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface UsersTabProps {
  data: DashboardData;
  onDelete: (id: string, email: string) => Promise<void>;
  onEdit: (user: User) => void;
  onCreateClick: () => void;
}

function UsersTab({ data, onDelete, onEdit, onCreateClick }: UsersTabProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'BUYER' | 'SELLER' | 'ADMIN'>('all');
  const q = search.trim().toLowerCase();
  const users = (data?.users || []).filter((u: User) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!q) return true;
    return `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q);
  });

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">User Registry</div>
        <button
          onClick={onCreateClick}
          style={{
            background: '#534AB7',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            padding: '6px 14px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          + Create Account
        </button>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users by name or email…"
            className="w-full pl-8 pr-7 py-1.5 rounded-md border border-slate-200 bg-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#534AB7]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 px-1"
            >
              ×
            </button>
          )}
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as typeof roleFilter)}
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#534AB7]"
        >
          <option value="all">All roles</option>
          <option value="BUYER">Buyers</option>
          <option value="SELLER">Sellers</option>
          <option value="ADMIN">Admins</option>
        </select>
        <span className="text-[11px] text-slate-400 whitespace-nowrap">
          {users.length} / {data?.users?.length || 0}
        </span>
      </div>
      <div
        className="row-item"
        style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}
      >
        <div style={{ width: 28 }} />
        <div style={{ flex: 1 }}>Name / Email</div>
        <div style={{ width: 80, textAlign: 'center' }}>Role</div>
        <div style={{ width: 100, textAlign: 'right' }}>Joined</div>
        <div style={{ width: 60 }} />
      </div>
      {users.map((u: User) => (
        <div key={u.id} className="row-item">
          <div
            className="avatar-sm"
            style={{
              background:
                u.role === 'ADMIN' ? '#EEEDFE' : u.role === 'SELLER' ? '#E1F5EE' : '#FFF7ED',
              color: u.role === 'ADMIN' ? '#534AB7' : u.role === 'SELLER' ? '#085041' : '#92400E',
            }}
          >
            {(u.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 500 }}>{u.name}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
          </div>
          <div style={{ width: 80, textAlign: 'center' }}>
            <span
              className={`badge ${u.role === 'ADMIN' ? 'b-new' : u.role === 'SELLER' ? 'b-active' : 'b-pending'}`}
            >
              {u.role}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', width: 100, textAlign: 'right' }}>
            {new Date(u.createdAt).toLocaleDateString()}
          </div>
          <div
            style={{
              width: 80,
              textAlign: 'right',
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
            }}
          >
            <button
              className="action-btn"
              onClick={() => onEdit(u)}
              style={{ fontSize: '10px', padding: '2px 6px' }}
            >
              Edit
            </button>
            <button className="del-btn" onClick={() => onDelete(u.id, u.email)}>
              Delete
            </button>
          </div>
        </div>
      ))}
      {users.length === 0 && (
        <div className="py-10 text-center text-xs text-slate-400">
          {q || roleFilter !== 'all' ? 'No users match the current filters.' : 'No users found.'}
        </div>
      )}
    </div>
  );
}

interface OrdersTabProps {
  data: DashboardData;
  onRefresh: () => Promise<void>;
}

const ADMIN_ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;

type OrderStatusValue = (typeof ADMIN_ORDER_STATUSES)[number];

interface ShippingSnapshot {
  fullName?: string;
  phone?: string;
  street?: string;
  city?: string;
  governorate?: string;
  postalCode?: string;
  country?: string;
  email?: string;
}

function safeParseSnapshot(raw: string | null | undefined): ShippingSnapshot {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return typeof v === 'object' && v !== null ? (v as ShippingSnapshot) : {};
  } catch {
    return {};
  }
}

function OrdersTab({ data, onRefresh }: OrdersTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const q = search.trim().toLowerCase();
  const orders = (data?.orders || []).filter((o: Order) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (!q) return true;
    return `${o.id} ${o.user?.name || ''} ${o.user?.email || ''} ${o.guestEmail || ''} ${o.paymentMethod || ''}`
      .toLowerCase()
      .includes(q);
  });

  const sendUpdate = async (
    orderId: string,
    body: Record<string, unknown>,
    successLabel: string
  ) => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(payload?.message || `Failed to ${successLabel}`);
        return false;
      }
      await onRefresh();
      return true;
    } catch (err) {
      console.error('[admin/orders] update failed:', err);
      alert(`Failed to ${successLabel}`);
      return false;
    } finally {
      setBusyOrderId(null);
    }
  };

  const cancelOrder = async (o: Order) => {
    if (o.status === 'CANCELLED' || o.status === 'RETURNED') return;
    if (
      !confirm(
        `Cancel order #ORD-${o.id.substring(0, 8)}? This will mark all live items as cancelled.`
      )
    )
      return;
    await sendUpdate(o.id, { status: 'CANCELLED' }, 'cancel order');
  };

  const deleteOrder = async (o: Order) => {
    if (
      !confirm(
        `Permanently delete order #ORD-${o.id.substring(0, 8)}? This cannot be undone. Stock for live items will be returned.`
      )
    )
      return;
    setBusyOrderId(o.id);
    try {
      const res = await fetch(`/api/admin/orders/${o.id}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(payload?.message || 'Failed to delete order');
        return;
      }
      await onRefresh();
    } catch (err) {
      console.error('[admin/orders] delete failed:', err);
      alert('Failed to delete order');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Platform Orders</div>
      </div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders by ID, customer, email or payment method…"
            className="w-full pl-8 pr-7 py-1.5 rounded-md border border-slate-200 bg-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#534AB7]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 px-1"
            >
              ×
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#534AB7]"
        >
          <option value="all">All status</option>
          {ADMIN_ORDER_STATUSES.map(s => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ').toLowerCase()}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-slate-400 whitespace-nowrap">
          {orders.length} / {data?.orders?.length || 0}
        </span>
      </div>
      {orders.map((o: Order) => {
        const contactEmail = o.user?.email || o.guestEmail;
        const customerLabel = o.user?.name || 'Guest';
        const isCancelled = o.status === 'CANCELLED' || o.status === 'RETURNED';
        const busy = busyOrderId === o.id;
        return (
          <div key={o.id} className="row-item flex-wrap gap-2">
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: '12px', fontWeight: 600 }}>#ORD-{o.id.substring(0, 8)}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {customerLabel} · {o.items?.length || 0} items
              </div>
              {contactEmail && (
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  {contactEmail}
                  {!o.user && ' (guest)'}
                </div>
              )}
            </div>
            <div className="text-right">
              <div style={{ fontSize: '12px', fontWeight: 600 }}>
                {o.totalAmount?.toLocaleString()} EGP
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>{o.paymentMethod}</div>
            </div>
            <select
              value={o.status}
              disabled={busy}
              onChange={e => sendUpdate(o.id, { status: e.target.value }, 'change status')}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-[#534AB7]"
            >
              {ADMIN_ORDER_STATUSES.map(s => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setEditingOrder(o)}
              disabled={busy}
              className="action-btn"
              style={{ borderColor: '#3C3489', color: '#3C3489' }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => cancelOrder(o)}
              disabled={busy || isCancelled}
              className="action-btn"
              style={{ borderColor: '#A32D2D', color: '#791F1F', opacity: isCancelled ? 0.4 : 1 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => deleteOrder(o)}
              disabled={busy}
              className="action-btn"
              style={{ borderColor: '#E24B4A', color: '#E24B4A' }}
            >
              Delete
            </button>
          </div>
        );
      })}
      {orders.length === 0 && (
        <div className="py-10 text-center text-xs text-slate-400">
          {q || statusFilter !== 'all' ? 'No orders match the current filters.' : 'No orders yet.'}
        </div>
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={async () => {
            setEditingOrder(null);
            await onRefresh();
          }}
        />
      )}
    </div>
  );
}

interface EditOrderModalProps {
  order: Order;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function EditOrderModal({ order, onClose, onSaved }: EditOrderModalProps) {
  const initialSnap = safeParseSnapshot(order.shippingAddressSnapshot);
  const [status, setStatus] = useState<OrderStatusValue>(order.status as OrderStatusValue);
  const [shipping, setShipping] = useState<ShippingSnapshot>({
    fullName: initialSnap.fullName || '',
    phone: initialSnap.phone || '',
    street: initialSnap.street || '',
    city: initialSnap.city || '',
    governorate: initialSnap.governorate || '',
    postalCode: initialSnap.postalCode || '',
    country: initialSnap.country || 'Egypt',
    email: initialSnap.email || '',
  });
  const [orderNotes, setOrderNotes] = useState<string>(order.orderNotes || '');
  const [giftWrapping, setGiftWrapping] = useState<boolean>(Boolean(order.giftWrapping));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { status };
      // Only send shipping fields that were actually filled in.
      const shippingPayload: Record<string, string> = {};
      for (const [k, v] of Object.entries(shipping)) {
        if (typeof v === 'string' && v.trim()) shippingPayload[k] = v.trim();
      }
      if (Object.keys(shippingPayload).length) body.shipping = shippingPayload;
      body.orderNotes = orderNotes.trim() || null;
      body.giftWrapping = giftWrapping;

      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.message || 'Failed to update order');
        return;
      }
      await onSaved();
    } catch (err) {
      console.error('[admin/orders] save failed:', err);
      setError('Failed to update order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-title">Edit order #{order.id.substring(0, 8)}</div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-input role-select"
              value={status}
              onChange={e => setStatus(e.target.value as OrderStatusValue)}
            >
              {ADMIN_ORDER_STATUSES.map(s => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                className="form-input"
                value={shipping.fullName || ''}
                onChange={e => setShipping({ ...shipping, fullName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                value={shipping.phone || ''}
                onChange={e => setShipping({ ...shipping, phone: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Street</label>
              <input
                className="form-input"
                value={shipping.street || ''}
                onChange={e => setShipping({ ...shipping, street: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                className="form-input"
                value={shipping.city || ''}
                onChange={e => setShipping({ ...shipping, city: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Governorate</label>
              <input
                className="form-input"
                value={shipping.governorate || ''}
                onChange={e => setShipping({ ...shipping, governorate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Postal code</label>
              <input
                className="form-input"
                value={shipping.postalCode || ''}
                onChange={e => setShipping({ ...shipping, postalCode: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email (guest)</label>
              <input
                type="email"
                className="form-input"
                value={shipping.email || ''}
                onChange={e => setShipping({ ...shipping, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Order notes</label>
            <textarea
              rows={3}
              className="form-input"
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <label className="flex items-center gap-2 mb-4 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={giftWrapping}
              onChange={e => setGiftWrapping(e.target.checked)}
            />
            Gift wrapping
          </label>

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving...' : 'Save changes'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

interface ProductsTabProps {
  data: DashboardData;
}

function ProductsTab({ data }: ProductsTabProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out' | 'low'>('all');

  const products = data?.products || [];
  const q = search.trim().toLowerCase();
  const filtered = products.filter(p => {
    if (categoryFilter !== 'all' && p.category?.id !== categoryFilter) return false;
    const stock = (p.variants || []).reduce((a, b) => a + (b.stockCount || 0), 0);
    if (stockFilter === 'in' && stock <= 0) return false;
    if (stockFilter === 'out' && stock !== 0) return false;
    if (stockFilter === 'low' && (stock === 0 || stock > 5)) return false;
    if (!q) return true;
    return `${p.title || ''} ${p.id || ''} ${p.category?.name || ''} ${p.seller?.storeName || ''}`
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">All Products</div>
        <span className="text-[11px] text-slate-400">
          {filtered.length} / {products.length}
        </span>
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
        <div className="relative flex-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products by name, store, category or ID…"
            className="w-full pl-8 pr-7 py-1.5 rounded-md border border-slate-200 bg-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#534AB7]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 px-1"
            >
              ×
            </button>
          )}
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#534AB7]"
        >
          <option value="all">All categories</option>
          {data?.categories?.map((c: Category) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={e => setStockFilter(e.target.value as typeof stockFilter)}
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#534AB7]"
        >
          <option value="all">All stock</option>
          <option value="in">In stock</option>
          <option value="low">Low (≤5)</option>
          <option value="out">Out of stock</option>
        </select>
      </div>
      <div
        className="row-item"
        style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}
      >
        <div style={{ width: 40 }} />
        <div style={{ flex: 1 }}>Title / Category</div>
        <div style={{ width: 160 }}>Seller</div>
        <div style={{ width: 90, textAlign: 'right' }}>Price</div>
        <div style={{ width: 80, textAlign: 'right' }}>Stock</div>
      </div>
      {filtered.map(p => {
        const stock = (p.variants || []).reduce((a, b) => a + (b.stockCount || 0), 0);
        const img = p.images?.find(i => i.isPrimary)?.url || p.images?.[0]?.url || '';
        return (
          <div key={p.id} className="row-item">
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                overflow: 'hidden',
                background: '#f1f5f9',
                flexShrink: 0,
              }}
            >
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : null}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {p.title}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{p.category?.name || '—'}</div>
            </div>
            <div
              style={{
                width: 160,
                fontSize: '11px',
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {p.seller?.storeName || '—'}
            </div>
            <div style={{ width: 90, textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>
              {p.basePrice?.toLocaleString()} EGP
            </div>
            <div
              style={{
                width: 80,
                textAlign: 'right',
                fontSize: '11px',
                fontWeight: 600,
                color: stock === 0 ? '#ef4444' : stock <= 5 ? '#f59e0b' : '#64748b',
              }}
            >
              {stock}
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <div className="py-10 text-center text-xs text-slate-400">
          {q || categoryFilter !== 'all' || stockFilter !== 'all'
            ? 'No products match the current filters.'
            : 'No products yet.'}
        </div>
      )}
    </div>
  );
}

interface PayoutsTabProps {
  data: DashboardData;
}

function PayoutsTab({ data }: PayoutsTabProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Pending Payout Requests</div>
      </div>
      {data?.payouts?.map((p: Payout) => (
        <div key={p.id} className="row-item">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 600 }}>{p.seller?.storeName}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {new Date(p.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginRight: '20px' }}>
            {p.amount?.toLocaleString()} EGP
          </div>
          <button className="action-btn" style={{ borderColor: '#0F6E56', color: '#085041' }}>
            Release Payment
          </button>
        </div>
      ))}
      {!data?.payouts?.length && (
        <div className="py-20 text-center text-xs text-slate-400">No payout requests in queue.</div>
      )}
    </div>
  );
}

interface AnalyticsTabProps {
  data: DashboardData;
}

function AnalyticsTab({ data }: AnalyticsTabProps) {
  // Real volume distribution from orders
  const orders = data?.orders || [];
  const totalOrders = orders.length || 1;
  const flashSaleOrders = orders.filter(o =>
    o.items?.some(i => {
      const variant = (i as { variant?: { product?: { flashSalePrice?: number | null } } }).variant;
      return variant?.product?.flashSalePrice != null;
    })
  ).length;
  const couponOrders = orders.filter(o => o.couponId != null).length;
  const flashPct = Math.round((flashSaleOrders / totalOrders) * 100);
  const couponPct = Math.round((couponOrders / totalOrders) * 100);
  const directPct = Math.max(0, 100 - flashPct - couponPct);

  // Real category aggregation from orders → variants → products → categories
  const categoryCounts = new Map<string, { name: string; units: number }>();
  for (const order of orders) {
    for (const item of order.items || []) {
      const variant = (
        item as {
          variant?: {
            product?: { category?: { id: string; name: string } | null; categoryId?: string };
          };
        }
      ).variant;
      const cat = variant?.product?.category;
      if (cat) {
        const existing = categoryCounts.get(cat.id);
        categoryCounts.set(cat.id, {
          name: cat.name,
          units: (existing?.units || 0) + (item.quantity || 0),
        });
      }
    }
  }
  const topCategories = Array.from(categoryCounts.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <div className="card-title mb-4">Volume Distribution</div>
        <div className="flex flex-col gap-4">
          <MetricBar label="Direct Sales" value={directPct} color="#534AB7" />
          <MetricBar label="Flash Sales" value={flashPct} color="#E24B4A" />
          <MetricBar label="Coupon Orders" value={couponPct} color="#1D9E75" />
        </div>
      </div>
      <div className="card">
        <div className="card-title mb-4">Top Categories</div>
        {topCategories.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No order data yet.</div>
        ) : (
          topCategories.map(c => (
            <div
              key={c.name}
              className="flex justify-between items-center py-2 border-bottom border-slate-50"
            >
              <span className="text-xs text-slate-600">{c.name}</span>
              <span className="text-xs font-bold">{c.units} units</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface TaxonomyTabProps {
  data: DashboardData;
  currentType: 'category' | 'tag' | 'collection';
  onTypeChange: (type: 'category' | 'tag' | 'collection') => void;
  onNameChange: (name: string) => void;
  nameValue: string;
  onCreate: (e: React.FormEvent) => Promise<void>;
  onDelete: (type: 'category' | 'tag' | 'collection', id: string) => Promise<void>;
}

function TaxonomyTab({
  data,
  currentType,
  onTypeChange,
  onNameChange,
  nameValue,
  onCreate,
  onDelete,
}: TaxonomyTabProps) {
  const items =
    currentType === 'category'
      ? data.categories
      : currentType === 'tag'
        ? data.tags
        : data.collections;
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="card col-span-1">
        <div className="card-title mb-4">Add Taxonomy</div>
        <form onSubmit={onCreate} className="flex flex-col gap-4">
          <select
            value={currentType}
            onChange={e => onTypeChange(e.target.value as 'category' | 'tag' | 'collection')}
            className="input-tax bg-white"
          >
            <option value="category">Category</option>
            <option value="tag">Tag</option>
            <option value="collection">Collection</option>
          </select>
          <input
            required
            placeholder="Name"
            value={nameValue}
            onChange={e => onNameChange(e.target.value)}
            className="input-tax"
          />
          <button
            type="submit"
            className="action-btn bg-slate-900 text-white hover:bg-slate-800 py-2 border-none"
          >
            Create Entry
          </button>
        </form>
      </div>
      <div className="card col-span-2">
        <div className="card-title mb-4">Existing {currentType}s</div>
        <div className="flex flex-col gap-1">
          {items?.map((item: Category | Tag | Collection) => (
            <div key={item.id} className="row-item">
              <div className="flex-1 text-xs font-medium">{item.name}</div>
              <div className="text-[10px] text-slate-400 mr-4">slug: {item.slug}</div>
              <button
                onClick={() => onDelete(currentType, item.id)}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
          {!items?.length && (
            <div className="py-10 text-center text-xs text-slate-400">Empty set.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Legacy `SettingsTab` removed — its replacement lives in `_components/SettingsTab.tsx`
// and renders the typed catalog from `lib/admin-settings-registry.ts`. Keeping
// the prop interface around for now in case other tabs in this file still
// reference `data.systemSettings`.
interface SettingsTabProps {
  data: DashboardData;
}

function _LegacySettingsTab({ data }: SettingsTabProps) {
  return (
    <div className="card max-w-xl">
      <div className="card-title mb-6">Global Platform Settings</div>
      {data?.systemSettings?.map((s: SystemSettings) => (
        <div key={s.key} className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">{s.key}</span>
            <span className="text-[10px] text-slate-300">
              Updated {new Date(s.updatedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex gap-4 items-center">
            <input defaultValue={s.value} className="input-tax flex-1" />
            <button className="action-btn bg-white">Save</button>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">{s.description}</div>
        </div>
      ))}
      {!data?.systemSettings?.length && (
        <div className="py-10 text-center text-xs text-slate-400">
          No settings found. Seed data to initialize.
        </div>
      )}
    </div>
  );
}

interface MetricBarProps {
  label: string;
  value: number;
  color: string;
}

function MetricBar({ label, value, color }: MetricBarProps) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span>{label}</span>
        <span className="font-bold">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full" style={{ width: `${value}%`, background: color }}></div>
      </div>
    </div>
  );
}

// SVGs matched from mockup
function OverviewIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".6" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".6" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".3" />
    </svg>
  );
}
function SellersIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <circle
        cx="6"
        cy="5"
        r="3"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity=".7"
      />
      <path
        d="M1 14c0-2.8 2.2-5 5-5"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity=".6"
      />
      <path
        d="M11 9l1.5 1.5L15 8"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
        opacity=".8"
      />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <circle
        cx="5"
        cy="5"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
        opacity=".6"
      />
      <circle
        cx="11"
        cy="5"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
        opacity=".6"
      />
      <path
        d="M1 14c0-2.5 1.8-4 4-4M7 14c0-2.5 1.8-4 4-4s4 1.5 4 4"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
        opacity=".5"
      />
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <rect
        x="2"
        y="1"
        width="12"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity=".7"
      />
      <rect x="5" y="5" width="6" height="1" rx=".5" fill="currentColor" opacity=".5" />
      <rect x="5" y="8" width="4" height="1" rx=".5" fill="currentColor" opacity=".4" />
    </svg>
  );
}
function ProductsIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 5l6-3 6 3-6 3-6-3z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity=".7"
      />
      <path
        d="M2 5v6l6 3M14 5v6l-6 3"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
        opacity=".6"
      />
    </svg>
  );
}
function PayoutsIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="4" width="14" height="9" rx="2" fill="currentColor" opacity=".5" />
      <rect x="1" y="4" width="14" height="3" rx="1" fill="currentColor" opacity=".7" />
      <circle cx="11.5" cy="9.5" r="1.5" fill="#7F77DD" />
    </svg>
  );
}
function AnalyticsIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <polyline
        points="1,12 5,7 8,10 11,4 15,8"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
        opacity=".7"
      />
    </svg>
  );
}
function ModerationIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <rect
        x="2"
        y="2"
        width="12"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity=".6"
      />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <circle
        cx="8"
        cy="8"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity=".7"
      />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity=".5"
      />
    </svg>
  );
}

// ─── New tab icons ──────────────────────────────────────────────────────────
function DocIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 1h7l3 3v11H3V1z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity=".7"
      />
      <path d="M10 1v3h3" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".6" />
      <path d="M5 7h6M5 9h6M5 11h4" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
    </svg>
  );
}
function ReviewIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2l1.5 4.5H14l-3.5 2.7L12 14l-4-3-4 3 1.5-4.8L2 6.5h4.5L8 2z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity=".7"
      />
    </svg>
  );
}
function MarketingIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 6l9-4v12L3 10V6z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity=".7"
      />
      <path d="M3 6v4M5 10v3" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
    </svg>
  );
}
function SupportIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 3h12v8H8l-3 3v-3H2V3z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity=".7"
      />
      <circle cx="5" cy="7" r="0.6" fill="currentColor" opacity=".6" />
      <circle cx="8" cy="7" r="0.6" fill="currentColor" opacity=".6" />
      <circle cx="11" cy="7" r="0.6" fill="currentColor" opacity=".6" />
    </svg>
  );
}
function PluginIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <path
        d="M5 1v3H3v3h2v3M11 1v3h2v3h-2v3M5 10c0 1.5 1 3 3 3s3-1.5 3-3"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity=".7"
      />
    </svg>
  );
}
function WrenchIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <path
        d="M11 2a3 3 0 100 6 3 3 0 003-3l-2 2-2-1 1-2-1-1 1-1zM10 8L3 14l-1-1 6-7"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
        opacity=".7"
      />
    </svg>
  );
}

interface EditUserModalProps {
  form: { id: string; name: string; email: string; role: Role };
  onChange: (form: { id: string; name: string; email: string; role: Role }) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}

function EditUserModal({ form, onChange, onSubmit, onClose, loading, error }: EditUserModalProps) {
  const update = (field: keyof typeof form, val: string) =>
    onChange({ ...form, [field]: val } as typeof form);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Edit User Account</div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              required
              className="form-input"
              placeholder="e.g. Ahmed Hassan"
              value={form.name}
              onChange={e => update('name', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              required
              type="email"
              className="form-input"
              placeholder="user@example.com"
              value={form.email}
              onChange={e => update('email', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Role</label>
            <select
              className="form-input role-select"
              value={form.role}
              onChange={e => update('role', e.target.value)}
            >
              <option value="BUYER">🛍️ Buyer (Customer)</option>
              <option value="SELLER">🏪 Seller (Merchant)</option>
              <option value="ADMIN">🛡️ Admin (Staff)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CreateUserModalProps {
  form: { name: string; email: string; password: string; role: Role; storeName: string };
  onChange: (form: {
    name: string;
    email: string;
    password: string;
    role: Role;
    storeName: string;
  }) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}

function CreateUserModal({
  form,
  onChange,
  onSubmit,
  onClose,
  loading,
  error,
}: CreateUserModalProps) {
  const update = (field: keyof typeof form, val: string) =>
    onChange({ ...form, [field]: val } as typeof form);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Create New Account</div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              required
              className="form-input"
              placeholder="e.g. Ahmed Hassan"
              value={form.name}
              onChange={e => update('name', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              required
              type="email"
              className="form-input"
              placeholder="user@example.com"
              value={form.email}
              onChange={e => update('email', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              required
              type="password"
              className="form-input"
              placeholder="Min. 8 characters"
              minLength={8}
              value={form.password}
              onChange={e => update('password', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Role</label>
            <select
              className="form-input role-select"
              value={form.role}
              onChange={e => update('role', e.target.value)}
            >
              <option value="BUYER">🛍️ Buyer (Customer)</option>
              <option value="SELLER">🏪 Seller (Merchant)</option>
              <option value="ADMIN">🛡️ Admin (Staff)</option>
            </select>
          </div>

          {form.role === 'SELLER' && (
            <div className="form-group">
              <label className="form-label">Store Name</label>
              <input
                className="form-input"
                placeholder="e.g. Ahmed's Electronics"
                value={form.storeName}
                onChange={e => update('storeName', e.target.value)}
              />
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 4 }}>
                Leave blank to auto-generate from name
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? 'Creating...'
                : `Create ${form.role === 'BUYER' ? 'Customer' : form.role === 'SELLER' ? 'Seller' : 'Admin'} Account`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
