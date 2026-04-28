'use client';

import React, { useState, useEffect } from 'react';
import { 
  getDashboardStats, 
  updateSellerStatus, 
  getAdminTaxonomyData, 
  createTaxonomy, 
  deleteTaxonomy, 
  updateProductTaxonomies, 
  updateTaxSettings, 
  getTaxSettings 
} from '../actions';

const S = {
  sidebar: '#1a1a2e',
  bg: '#192033',
  card: '#1E2A3B',
  card2: '#28364A',
  border: 'rgba(255,255,255,0.08)',
  txt: '#F9FAFB',
  txt2: '#9CA3AF',
  txt3: '#6B7280',
  purple: '#7F77DD',
  purpleA: '#AFA9EC',
  green: '#1D9E75',
  greenBg: '#E1F5EE',
  greenD: '#085041',
  red: '#E24B4A',
  redBg: '#FCEBEB',
  redD: '#791F1F',
  amber: '#EF9F27',
  amberBg: '#FAEEDA',
  amberD: '#633806',
};

// ─── Mock data ──────────────────────────────────────────────────────────────
const SELLERS_INIT = [
  { id: 'kt', initials: 'KT', name: 'Kareem Tech', cat: 'Electronics', ago: '2h ago', email: 'kareem@techstore.eg', avatarBg: '#EEEDFE', avatarColor: '#3C3489', status: 'Pending', gmv: '45,200 EGP', products: 12 },
  { id: 'sf', initials: 'SF', name: 'Style Fashion', cat: 'Fashion', ago: '5h ago', email: 'info@stylefashion.eg', avatarBg: '#E1F5EE', avatarColor: '#085041', status: 'Pending', gmv: '12,800 EGP', products: 34 },
];

const ORDERS_DATA = [
  { id: '#ORD-4821', buyer: 'Mazen Ahmed', product: 'Sony WH-1000XM5', amount: '2,800 EGP', status: 'Shipped', date: 'Mar 29, 2026' },
];

const PAYOUTS_DATA = [
  { seller: 'TechZone Egypt', amount: '142,050 EGP', commission: '25,050 EGP', status: 'Paid', date: 'Apr 01, 2026' },
];

const DISPUTES_DATA = [
  { id: '#ORD-4801', issue: 'Item not received', buyer: 'Ahmed K.', seller: 'TechZone Egypt', amount: '9,500 EGP', age: '1 day', status: 'Open' },
];

const AUDIT_LOG = [
  { color: S.red, action: 'banned seller', target: 'FakeGoods LLC', admin: 'Admin Hana', note: 'policy violation', time: '2m ago' },
];

const BAR_HEIGHTS = [50, 70, 55, 90, 100, 75, 60];
const BAR_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─── Helper components ──────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: S.card, borderRadius: 10, border: `0.5px solid ${S.border}`, padding: 14, ...style }}>{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: S.txt, marginBottom: 12 }}>{children}</div>;
}
function StatusBadge({ s }: { s: string }) {
  const m: Record<string, [string, string]> = {
    Active: [S.greenBg, S.greenD], Pending: [S.amberBg, S.amberD], Banned: [S.redBg, S.redD],
    BUYER: ['#EEEDFE', '#3C3489'], SELLER: [S.greenBg, S.greenD], ADMIN: ['#F3F0FF', '#4C1D95'],
  };
  const [bg, col] = m[s] ?? ['#374151', '#9CA3AF'];
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: bg, color: col }}>{s}</span>;
}
function ActionBtn({ label, color, onClick }: { label: string; color?: string; onClick?: () => void }) {
  const c = color === 'green' ? { b: '#0F6E56', t: S.greenD } : color === 'red' ? { b: '#A32D2D', t: S.redD } : { b: S.border, t: S.txt2 };
  return (
    <button onClick={onClick}
      style={{ fontSize: 11, padding: '3px 9px', borderRadius: 4, cursor: 'pointer', border: `0.5px solid ${c.b}`, background: 'transparent', color: c.t, fontWeight: 600, transition: 'all 0.15s' }}>
      {label}
    </button>
  );
}

// ─── Sections ───────────────────────────────────────────────────────────────
function OverviewSection({ pendingSellers, stats, refresh }: { pendingSellers: any[], stats: any, refresh: () => void }) {
  const [toast, setToast] = useState('');
  const act = async (id: string, name: string, action: string) => {
    await updateSellerStatus(id, action === 'approved' ? 'ACTIVE' : 'BANNED' as any);
    setToast(`${action === 'approved' ? '✓' : '✗'} ${name} ${action}`);
    setTimeout(() => setToast(''), 3000);
    refresh();
  };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 14 }}>
        {[
          { label: 'Total Revenue', value: (stats.revenue || 0).toLocaleString() + ' EGP' },
          { label: 'Total Orders', value: stats.totalOrders?.toString() || '0' },
          { label: 'Total Products', value: stats.totalProducts?.toString() || '0' },
          { label: 'Total users', value: stats.totalUsers?.toString() || '0' },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 12 }}>
            <div style={{ fontSize: 10, color: S.txt2, marginBottom: 5, textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: S.txt }}>{s.value}</div>
          </Card>
        ))}
      </div>
      <Card>
        <SectionTitle>Seller applications</SectionTitle>
        {pendingSellers.map((sel, i) => (
          <div key={sel.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < pendingSellers.length - 1 ? `0.5px solid ${S.border}` : 'none' }}>
            <div style={{ flex: 1 }}>{sel.storeName}</div>
            <div style={{ display: 'flex', gap: 5 }}>
              <ActionBtn label="Approve" color="green" onClick={() => act(sel.id, sel.storeName, 'approved')} />
              <ActionBtn label="Reject" color="red" onClick={() => act(sel.id, sel.storeName, 'rejected')} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function SellersSection({ sellers: dbSellers, refresh }: { sellers: any[], refresh: () => void }) {
  const [filter, setFilter] = useState('All');
  const sellers = dbSellers || SELLERS_INIT;
  const filtered = filter === 'All' ? sellers : sellers.filter((s:any) => s.status === filter);
  return (
    <div>
      {filtered.map((sel:any) => (
        <Card key={sel.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>{sel.storeName || sel.name} - <StatusBadge s={sel.status} /></div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function UsersSection({ users }: { users: any[] }) {
  return (
    <Card>
      {users.map((u:any) => (
        <div key={u.id} style={{ padding: '8px 0', borderBottom: `0.5px solid ${S.border}` }}>
          {u.name} ({u.email}) - <StatusBadge s={u.role} />
        </div>
      ))}
    </Card>
  );
}

function OrdersSection({ orders: dbOrders }: { orders: any[] }) {
  const orders = dbOrders || ORDERS_DATA;
  return (
    <Card>
      {orders.map((o:any) => (
        <div key={o.id} style={{ padding: '8px 0', borderBottom: `0.5px solid ${S.border}` }}>
          {o.id} - {o.totalAmount || o.amount} - <StatusBadge s={o.status} />
        </div>
      ))}
    </Card>
  );
}

function PayoutsSection() { return <Card>Payouts logic here</Card>; }
function AnalyticsSection({ stats }: { stats: any }) { return <Card>Analytics: {JSON.stringify(stats)}</Card>; }
function DisputesSection() { return <Card>Disputes logic here</Card>; }
function ModerationSection() { return <Card>Moderation logic here</Card>; }

function SettingsSection() {
  const [taxSettings, setTaxSettings] = useState({ vatRate: '14', platformFee: '15' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTaxSettings().then((res: any) => setTaxSettings({ vatRate: res.vatRate.toString(), platformFee: res.platformFee.toString() })).catch((e: any) => console.error(e));
  }, []);

  const handleTaxUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await updateTaxSettings(new FormData(e.target as HTMLFormElement));
    setLoading(false);
  };

  return (
    <Card>
      <form onSubmit={handleTaxUpdate}>
        <input name="vatRate" value={taxSettings.vatRate} onChange={e => setTaxSettings(p => ({ ...p, vatRate: e.target.value }))} />
        <input name="platformFee" value={taxSettings.platformFee} onChange={e => setTaxSettings(p => ({ ...p, platformFee: e.target.value }))} />
        <button type="submit" disabled={loading}>Save</button>
      </form>
    </Card>
  );
}

const navSections = [
  { title: 'Main', items: [
    { id: 'overview', label: 'Overview', icon: <span /> },
    { id: 'catalog', label: 'Catalog', icon: <span /> },
    { id: 'sellers', label: 'Sellers', icon: <span /> },
    { id: 'users', label: 'Users', icon: <span /> },
    { id: 'ordersadmin', label: 'Orders', icon: <span /> },
  ]},
  { title: 'System', items: [
    { id: 'settings', label: 'Settings', icon: <span /> },
  ]},
];

const TITLES: Record<string, string> = { overview: 'Overview', catalog: 'Catalog', sellers: 'Sellers', users: 'Users', ordersadmin: 'Orders', settings: 'Settings' };

export default function AdminDashboardPage() {
  const [active, setActive] = useState('overview');
  const [data, setData] = useState<any>(null);

  const refresh = () => {
    getDashboardStats().then((res: any) => setData(res)).catch((e: any) => console.error(e));
  }

  useEffect(() => { refresh(); }, []);

  if (!data) return <div style={{ background: S.bg, height: '100vh', color: '#fff' }}>Loading Data...</div>;

  const renderContent = () => {
    switch (active) {
      case 'overview':   return <OverviewSection pendingSellers={data.pendingSellers || []} stats={data.stats} refresh={refresh} />;
      case 'catalog':    return <CatalogSection />;
      case 'sellers':    return <SellersSection sellers={data.sellers || []} refresh={refresh} />;
      case 'users':      return <UsersSection users={data.users || []} />;
      case 'ordersadmin': return <OrdersSection orders={data.orders || []} />;
      case 'settings':   return <SettingsSection />;
      default:           return <OverviewSection pendingSellers={data.pendingSellers || []} stats={data.stats} refresh={refresh} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: S.bg }}>
      <div style={{ width: 186, background: S.sidebar, color: '#fff' }}>
        {navSections.map(s => (
          <div key={s.title}>
            {s.items.map(item => <button key={item.id} onClick={() => setActive(item.id)}>{item.label}</button>)}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>{renderContent()}</div>
    </div>
  );
}

function CatalogSection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const refresh = async () => { setData(await getAdminTaxonomyData()); };
  useEffect(() => { refresh(); }, []);

  if (!data) return <div style={{ color: S.txt }}>Loading...</div>;

  return (
    <div>
      <Card>
        {['CATEGORY', 'TAG', 'COLLECTION'].map((type: any) => (
          <div key={type}>
            <button onClick={async () => { await createTaxonomy(type.toLowerCase() as any, { name: 'New' }); refresh(); }}>Add {type}</button>
          </div>
        ))}
      </Card>
      <Card>
        {data.products?.map((p: any) => (
          <div key={p.id}>{p.title}</div>
        ))}
      </Card>
    </div>
  );
}
