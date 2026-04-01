'use client';

import React, { useState } from 'react';

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
  { id: 'tz', initials: 'TZ', name: 'TechZone Egypt', cat: 'Electronics', ago: 'approved', email: 'hello@techzone.eg', avatarBg: '#EEEDFE', avatarColor: '#3C3489', status: 'Active', gmv: '189,400 EGP', products: 87 },
  { id: 'eg', initials: 'EH', name: 'EcoHome Co', cat: 'Home', ago: 'approved', email: 'eco@home.eg', avatarBg: '#E1F5EE', avatarColor: '#085041', status: 'Active', gmv: '67,000 EGP', products: 45 },
];

const USERS_DATA = [
  { id: 1, name: 'Mazen Ahmed', email: 'mazen@example.com', role: 'BUYER', joined: 'Jan 5, 2026', orders: 24, spent: '12,450 EGP' },
  { id: 2, name: 'Sara Mohamed', email: 'sara@seller.eg', role: 'SELLER', joined: 'Feb 14, 2026', orders: 0, spent: '—' },
  { id: 3, name: 'Ahmed Karram', email: 'ahmed@buyer.com', role: 'BUYER', joined: 'Mar 3, 2026', orders: 5, spent: '3,200 EGP' },
  { id: 4, name: 'Nour El-Din', email: 'nour@admin.eg', role: 'ADMIN', joined: 'Dec 1, 2025', orders: 0, spent: '—' },
  { id: 5, name: 'Hana Youssef', email: 'hana@admin.eg', role: 'ADMIN', joined: 'Dec 1, 2025', orders: 0, spent: '—' },
];

const ORDERS_DATA = [
  { id: '#ORD-4821', buyer: 'Mazen Ahmed', product: 'Sony WH-1000XM5', amount: '2,800 EGP', status: 'Shipped', date: 'Mar 29, 2026' },
  { id: '#ORD-4790', buyer: 'Mazen Ahmed', product: 'Nike Air Max 270', amount: '1,650 EGP', status: 'Delivered', date: 'Mar 20, 2026' },
  { id: '#ORD-4788', buyer: 'Sara M.', product: 'iPhone 15 Pro', amount: '18,000 EGP', status: 'Returns', date: 'Mar 18, 2026' },
  { id: '#ORD-4801', buyer: 'Ahmed K.', product: 'Samsung Tab S9', amount: '9,500 EGP', status: 'Processing', date: 'Mar 31, 2026' },
];

const PAYOUTS_DATA = [
  { seller: 'TechZone Egypt', amount: '142,050 EGP', commission: '25,050 EGP', status: 'Paid', date: 'Apr 01, 2026' },
  { seller: 'EcoHome Co', amount: '50,250 EGP', commission: '8,900 EGP', status: 'Pending', date: 'Apr 03, 2026' },
  { seller: 'Style Fashion', amount: '9,600 EGP', commission: '1,700 EGP', status: 'Pending', date: 'Apr 05, 2026' },
];

const DISPUTES_DATA = [
  { id: '#ORD-4801', issue: 'Item not received', buyer: 'Ahmed K.', seller: 'TechZone Egypt', amount: '9,500 EGP', age: '1 day', status: 'Open' },
  { id: '#ORD-4788', issue: 'Wrong item sent', buyer: 'Sara M.', seller: 'EcoHome Co', amount: '18,000 EGP', age: '3 days', status: 'Open' },
  { id: '#ORD-4650', issue: 'Damaged item', buyer: 'Omar H.', seller: 'Style Fashion', amount: '4,200 EGP', age: '1 week', status: 'Resolved' },
];

const AUDIT_LOG = [
  { color: S.red, action: 'banned seller', target: 'FakeGoods LLC', admin: 'Admin Hana', note: 'policy violation', time: '2m ago' },
  { color: S.green, action: 'approved seller', target: 'TechZone Egypt', admin: 'Admin Omar', note: '', time: '18m ago' },
  { color: S.purple, action: 'issued full refund on', target: '#ORD-4788', admin: 'Admin Hana', note: '1,650 EGP', time: '1h ago' },
  { color: S.amber, action: 'updated commission rate for', target: 'EcoHome Co', admin: 'Admin Hana', note: '12% → 10%', time: '3h ago' },
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
    Open: [S.redBg, S.redD], Resolved: [S.greenBg, S.greenD],
    Shipped: ['#E6F1FB', '#0C447C'], Delivered: [S.greenBg, S.greenD],
    Processing: [S.amberBg, S.amberD], Returns: [S.redBg, S.redD],
    Paid: [S.greenBg, S.greenD],
    BUYER: ['#EEEDFE', '#3C3489'], SELLER: [S.greenBg, S.greenD], ADMIN: ['#F3F0FF', '#4C1D95'],
  };
  const [bg, col] = m[s] ?? ['#374151', '#9CA3AF'];
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: bg, color: col }}>{s}</span>;
}
function ActionBtn({ label, color, onClick }: { label: string; color?: string; onClick?: () => void }) {
  const c = color === 'green' ? { b: '#0F6E56', t: S.greenD } : color === 'red' ? { b: '#A32D2D', t: S.redD } : { b: S.border, t: S.txt2 };
  return (
    <button onClick={onClick}
      style={{ fontSize: 11, padding: '3px 9px', borderRadius: 4, cursor: 'pointer', border: `0.5px solid ${c.b}`, background: 'transparent', color: c.t, fontWeight: 600, transition: 'all 0.15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '.7'}
      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}>
      {label}
    </button>
  );
}

// ─── Sections ───────────────────────────────────────────────────────────────
function OverviewSection({ pendingSellers, refresh }: { pendingSellers: any[], refresh: () => void }) {
  const [toast, setToast] = useState('');
  const act = async (id: string, name: string, action: string) => {
    await updateSellerStatus(id, action === 'approved' ? 'ACTIVE' : 'BANNED');
    setToast(`${action === 'approved' ? '✓' : '✗'} ${name} ${action}`);
    setTimeout(() => setToast(''), 3000);
    refresh();
  };
  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 14 }}>
        {[
          { label: 'GMV (March)', value: '1.2M', sub: '+24% vs Feb', subPositive: true },
          { label: 'Platform revenue', value: '96,400', sub: 'EGP (8% avg)', valueColor: '#534AB7' },
          { label: 'Active sellers', value: '284', sub: '+12 this month', subPositive: true },
          { label: 'Total users', value: '18,492', sub: '+340 today', subPositive: true },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 12 }}>
            <div style={{ fontSize: 10, color: S.txt2, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: s.valueColor ?? S.txt, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              {s.subPositive
                ? <span style={{ background: S.greenBg, color: S.greenD, fontSize: 10, padding: '1px 6px', borderRadius: 20 }}>{s.sub}</span>
                : <span style={{ color: S.txt2 }}>{s.sub}</span>}
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 11 }}>
        <Card>
          <SectionTitle>Orders this week</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
            {BAR_HEIGHTS.map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div title={`Day ${i+1}: ${h}%`} style={{ width: '100%', borderRadius: '2px 2px 0 0', background: S.purple, height: `${h}%`, minHeight: 3, cursor: 'pointer', transition: 'opacity 0.12s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '.7'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'} />
                <span style={{ fontSize: 9, color: S.txt3 }}>{BAR_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle>Key metrics</SectionTitle>
          {[
            { label: 'Avg order value', value: '892 EGP', c: S.txt },
            { label: 'Conversion rate', value: '3.4%', c: S.green },
            { label: 'Refund rate', value: '2.1%', c: S.red },
            { label: 'Pending payouts', value: '214,800 EGP', c: S.txt },
          ].map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 3 ? `0.5px solid ${S.border}` : 'none', fontSize: 12 }}>
              <span style={{ color: S.txt2 }}>{m.label}</span>
              <span style={{ fontWeight: 600, color: m.c }}>{m.value}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Seller apps + disputes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 11 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
            <SectionTitle>{''}</SectionTitle>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>Seller applications</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: S.amberBg, color: S.amberD }}>{pendingSellers.length} pending</span>
            </div>
          </div>
          {pendingSellers.length === 0 && <div style={{ fontSize: 12, color: S.txt3, padding: '10px 0' }}>No pending applications ✓</div>}
          {pendingSellers.map((sel, i) => (
            <div key={sel.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < pendingSellers.length - 1 ? `0.5px solid ${S.border}` : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                {sel.storeName.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: S.txt }}>{sel.storeName}</div>
                <div style={{ fontSize: 11, color: S.txt2 }}>{new Date(sel.createdAt).toLocaleDateString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <ActionBtn label="Approve" color="green" onClick={() => act(sel.id, sel.storeName, 'approved')} />
                <ActionBtn label="Reject" color="red" onClick={() => act(sel.id, sel.storeName, 'rejected')} />
              </div>
            </div>
          ))}
          {toast && <div style={{ marginTop: 8, fontSize: 12, color: toast.startsWith('✓') ? S.green : S.red, fontWeight: 600 }}>{toast}</div>}
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>Open disputes</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: S.redBg, color: S.redD }}>4 open</span>
          </div>
          {DISPUTES_DATA.filter(d => d.status === 'Open').map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i === 0 ? `0.5px solid ${S.border}` : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: S.txt }}>{d.id} — {d.issue}</div>
                <div style={{ fontSize: 11, color: S.txt2 }}>Buyer: {d.buyer} · {d.age} old</div>
              </div>
              <ActionBtn label="Review" />
            </div>
          ))}
        </Card>
      </div>

      {/* Audit log */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 11 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>Admin audit log</span>
          <span style={{ fontSize: 11, color: S.txt2 }}>Last 24h</span>
        </div>
        {AUDIT_LOG.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: i < AUDIT_LOG.length - 1 ? `0.5px solid ${S.border}` : 'none', fontSize: 11 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: e.color, flexShrink: 0, marginTop: 3 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, color: S.txt }}>{e.admin}</span>
              <span style={{ color: S.txt2 }}> {e.action} </span>
              <span style={{ fontWeight: 600, color: S.txt }}>{e.target}</span>
              {e.note && <span style={{ color: S.txt2 }}> · {e.note}</span>}
            </div>
            <span style={{ color: S.txt3, flexShrink: 0 }}>{e.time}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function SellersSection() {
  const [sellers, setSellers] = useState(SELLERS_INIT);
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? sellers : sellers.filter(s => s.status === filter);
  const act = (id: string, newStatus: string) => setSellers(p => p.map(s => s.id === id ? { ...s, status: newStatus } : s));
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['All', 'Active', 'Pending', 'Banned'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 14px', borderRadius: 20, border: `0.5px solid ${filter === f ? S.purple : S.border}`, background: filter === f ? S.purple : 'transparent', color: filter === f ? '#fff' : S.txt2, fontSize: 12, cursor: 'pointer' }}>
            {f}
          </button>
        ))}
      </div>
      {filtered.map((sel, i) => (
        <Card key={sel.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: sel.avatarBg, color: sel.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{sel.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>{sel.name}</span>
                <StatusBadge s={sel.status} />
              </div>
              <div style={{ fontSize: 11, color: S.txt2 }}>{sel.cat} · {sel.email}</div>
              <div style={{ fontSize: 11, color: S.txt3, marginTop: 2 }}>GMV: {sel.gmv} · {sel.products} products</div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {sel.status === 'Pending' && <ActionBtn label="Approve" color="green" onClick={() => act(sel.id, 'Active')} />}
              {sel.status !== 'Banned' && <ActionBtn label="Suspend" color="red" onClick={() => act(sel.id, 'Banned')} />}
              {sel.status === 'Banned' && <ActionBtn label="Reinstate" color="green" onClick={() => act(sel.id, 'Active')} />}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function UsersSection() {
  const [users, setUsers] = useState(USERS_DATA);
  const [search, setSearch] = useState('');
  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users by name or email…"
        style={{ width: '100%', background: S.card, border: `0.5px solid ${S.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: S.txt, outline: 'none', marginBottom: 14 }} />
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: 8, padding: '6px 0', borderBottom: `0.5px solid ${S.border}`, marginBottom: 4 }}>
          {['Name', 'Email', 'Role', 'Orders', 'Spent'].map(h => (
            <span key={h} style={{ fontSize: 10, color: S.txt3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
          ))}
        </div>
        {filtered.map((u, i) => (
          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: 8, padding: '10px 0', borderBottom: i < filtered.length - 1 ? `0.5px solid ${S.border}` : 'none', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: S.txt }}>{u.name}</span>
            <span style={{ fontSize: 11, color: S.txt2 }}>{u.email}</span>
            <StatusBadge s={u.role} />
            <span style={{ fontSize: 12, color: S.txt }}>{u.orders}</span>
            <span style={{ fontSize: 12, color: S.txt }}>{u.spent}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function OrdersSection() {
  const [orders, setOrders] = useState(ORDERS_DATA);
  return (
    <div>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr 1fr 1fr', gap: 8, padding: '6px 0', borderBottom: `0.5px solid ${S.border}`, marginBottom: 4 }}>
          {['Order ID', 'Buyer', 'Product', 'Amount', 'Status', 'Date'].map(h => (
            <span key={h} style={{ fontSize: 10, color: S.txt3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
          ))}
        </div>
        {orders.map((o, i) => (
          <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr 1fr 1fr', gap: 8, padding: '10px 0', borderBottom: i < orders.length - 1 ? `0.5px solid ${S.border}` : 'none', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: S.purpleA }}>{o.id}</span>
            <span style={{ fontSize: 12, color: S.txt }}>{o.buyer}</span>
            <span style={{ fontSize: 11, color: S.txt2 }}>{o.product}</span>
            <span style={{ fontSize: 12, color: S.txt }}>{o.amount}</span>
            <StatusBadge s={o.status} />
            <span style={{ fontSize: 11, color: S.txt3 }}>{o.date}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function PayoutsSection() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Total pending payouts', value: '214,800 EGP', color: S.amber },
          { label: 'Paid this month', value: '182,300 EGP', color: S.green },
          { label: 'Platform commission', value: '96,400 EGP', color: S.purpleA },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: S.txt2, marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>
      <Card>
        <SectionTitle>Payout schedule</SectionTitle>
        {PAYOUTS_DATA.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < PAYOUTS_DATA.length - 1 ? `0.5px solid ${S.border}` : 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: S.txt }}>{p.seller}</div>
              <div style={{ fontSize: 11, color: S.txt2 }}>Commission: {p.commission} · Due {p.date}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>{p.amount}</div>
              <StatusBadge s={p.status} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function AnalyticsSection() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Conv. rate', value: '3.4%', color: S.green },
          { label: 'Avg order value', value: '892 EGP', color: S.txt },
          { label: 'Bounce rate', value: '38%', color: S.amber },
          { label: 'Refund rate', value: '2.1%', color: S.red },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: S.txt2, marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>
      <Card>
        <SectionTitle>Revenue — last 30 days</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 90 }}>
          {Array.from({ length: 30 }, (_, i) => Math.round(30 + Math.sin(i * 0.5) * 20 + Math.random() * 30)).map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, background: S.purple, borderRadius: '2px 2px 0 0', opacity: 0.7 + (i / 30) * 0.3, cursor: 'pointer', transition: 'opacity 0.12s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = String(0.7 + (i / 30) * 0.3)} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function DisputesSection() {
  const [disputes, setDisputes] = useState(DISPUTES_DATA);
  const resolve = (id: string) => setDisputes(p => p.map(d => d.id === id ? { ...d, status: 'Resolved' } : d));
  return (
    <div>
      {disputes.map((d, i) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: d.status === 'Open' ? S.purpleA : S.txt }}>{d.id}</span>
                <StatusBadge s={d.status} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.txt, marginBottom: 4 }}>{d.issue}</div>
              <div style={{ fontSize: 11, color: S.txt2 }}>Buyer: {d.buyer} · Seller: {d.seller}</div>
              <div style={{ fontSize: 11, color: S.txt2 }}>Amount: {d.amount} · Age: {d.age}</div>
            </div>
            {d.status === 'Open' && (
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                <ActionBtn label="Refund buyer" color="green" onClick={() => resolve(d.id)} />
                <ActionBtn label="Dismiss" color="red" onClick={() => resolve(d.id)} />
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ModerationSection() {
  const items = [
    { type: 'Product', name: 'Suspect Phone Case', seller: 'FakeGoods LLC', reason: 'Counterfeit brand logo', reported: '2h ago' },
    { type: 'Review', name: '⭐☆☆☆☆ "Never delivered"', seller: 'TechZone Egypt', reason: 'False shipping claim', reported: '5h ago' },
    { type: 'Seller', name: 'QuickSell99', seller: '—', reason: 'Spam listings', reported: '1d ago' },
  ];
  const [list, setList] = useState(items);
  return (
    <div>
      {list.map((item, i) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, background: '#EEEDFE', color: '#3C3489', padding: '1px 6px', borderRadius: 20, fontWeight: 600 }}>{item.type}</span>
                <span style={{ fontSize: 11, color: S.txt3 }}>{item.reported}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.txt, marginBottom: 2 }}>{item.name}</div>
              <div style={{ fontSize: 11, color: S.txt2 }}>Reason: {item.reason}</div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <ActionBtn label="Remove" color="red" onClick={() => setList(l => l.filter((_, j) => j !== i))} />
              <ActionBtn label="Dismiss" onClick={() => setList(l => l.filter((_, j) => j !== i))} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SettingsSection() {
  const [settings, setSettings] = useState({ commission: '8', minWithdraw: '500', maintenance: false, newSellers: true });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Card>
        <SectionTitle>Platform settings</SectionTitle>
        {[
          { label: 'Platform commission (%)', key: 'commission' },
          { label: 'Min. payout amount (EGP)', key: 'minWithdraw' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: S.txt2, marginBottom: 6 }}>{f.label}</div>
            <input value={(settings as any)[f.key]} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))}
              style={{ width: '100%', background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none' }} />
          </div>
        ))}
      </Card>
      <Card>
        <SectionTitle>Feature toggles</SectionTitle>
        {[
          { label: 'Maintenance mode', key: 'maintenance', desc: 'Take platform offline for all users' },
          { label: 'New seller registrations', key: 'newSellers', desc: 'Allow new sellers to apply' },
        ].map(f => (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `0.5px solid ${S.border}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>{f.label}</div>
              <div style={{ fontSize: 11, color: S.txt2 }}>{f.desc}</div>
            </div>
            <button onClick={() => setSettings(p => ({ ...p, [f.key]: !(p as any)[f.key] }))}
              style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: (settings as any)[f.key] ? S.green : '#374151', transition: 'background 0.2s', position: 'relative' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: (settings as any)[f.key] ? 21 : 3, transition: 'left 0.2s' }} />
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Nav ────────────────────────────────────────────────────────────────────
const navSections = [
  { title: 'Main', items: [
    { id: 'overview', label: 'Overview', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".6"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".3"/></svg> },
    { id: 'catalog', label: 'Catalog', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".7"/><path d="M5 6h6M5 10h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".5"/></svg> },
    { id: 'sellers', label: 'Sellers', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".7"/><path d="M1 14c0-2.8 2.2-5 5-5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".6"/><path d="M11 9l1.5 1.5L15 8" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8"/></svg> },
    { id: 'users', label: 'Users', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.1" fill="none" opacity=".6"/><circle cx="11" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.1" fill="none" opacity=".6"/><path d="M1 14c0-2.5 1.8-4 4-4M7 14c0-2.5 1.8-4 4-4s4 1.5 4 4" stroke="currentColor" strokeWidth="1.1" fill="none" opacity=".5"/></svg> },
    { id: 'ordersadmin', label: 'Orders', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".7"/><rect x="5" y="5" width="6" height="1" rx=".5" fill="currentColor" opacity=".5"/><rect x="5" y="8" width="4" height="1" rx=".5" fill="currentColor" opacity=".4"/></svg> },
  ]},
  { title: 'Finance', items: [
    { id: 'payouts', label: 'Payouts', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="9" rx="2" fill="currentColor" opacity=".5"/><rect x="1" y="4" width="14" height="3" rx="1" fill="currentColor" opacity=".7"/><circle cx="11.5" cy="9.5" r="1.5" fill="#7F77DD"/></svg> },
    { id: 'analytics', label: 'Analytics', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><polyline points="1,12 5,7 8,10 11,4 15,8" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".7"/></svg> },
  ]},
  { title: 'Support', items: [
    { id: 'disputes', label: 'Disputes', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8S4.4 14.5 8 14.5 14.5 11.6 14.5 8 11.6 1.5 8 1.5z" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".7"/><path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/></svg> },
    { id: 'moderation', label: 'Moderation', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".6"/><path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8"/></svg> },
  ]},
  { title: 'System', items: [
    { id: 'settings', label: 'Settings', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".7"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity=".5"/></svg> },
  ]},
];

const TITLES: Record<string, string> = {
  overview: 'Platform overview', catalog: 'Catalog & Tags', sellers: 'Sellers', users: 'Users',
  ordersadmin: 'Orders', payouts: 'Payouts', analytics: 'Analytics',
  disputes: 'Disputes', moderation: 'Moderation', settings: 'Settings',
};

import { getDashboardStats, updateSellerStatus, getAdminTaxonomyData, createTaxonomy, deleteTaxonomy, updateProductTaxonomies } from '../actions';
import { useEffect } from 'react';

// ─── Page ──────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [active, setActive] = useState('overview');
  const [data, setData] = useState<any>(null);

  const refresh = () => {
    getDashboardStats().then(res => setData(res)).catch(e => console.error(e));
  }

  useEffect(() => { refresh(); }, []);

  if (!data) return <div style={{ background: S.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading Data...</div>;

  const renderContent = () => {
    switch (active) {
      case 'overview':   return <OverviewSection pendingSellers={data.pendingSellers || []} refresh={refresh} />;
      case 'catalog':    return <CatalogSection />;
      case 'sellers':    return <SellersSection />;
      case 'users':      return <UsersSection />;
      case 'ordersadmin': return <OrdersSection />;
      case 'payouts':    return <PayoutsSection />;
      case 'analytics':  return <AnalyticsSection />;
      case 'disputes':   return <DisputesSection />;
      case 'moderation': return <ModerationSection />;
      case 'settings':   return <SettingsSection />;
      default:           return <OverviewSection pendingSellers={data.pendingSellers || []} refresh={refresh} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: S.bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 186, flexShrink: 0, background: S.sidebar, display: 'flex', flexDirection: 'column', padding: '16px 0', overflowY: 'auto' }}>
        <div style={{ padding: '0 16px 20px', fontSize: 15, fontWeight: 600, color: '#fff', flexShrink: 0 }}>Admin<span style={{ color: S.purple }}>OS</span></div>
        <nav style={{ flex: 1 }}>
          {navSections.map(section => (
            <div key={section.title}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#444', letterSpacing: '.08em', padding: '10px 16px 4px', textTransform: 'uppercase' }}>{section.title}</div>
              {section.items.map(item => (
                <button key={item.id} onClick={() => setActive(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 16px', background: active === item.id ? 'rgba(127,119,221,0.15)' : 'transparent', color: active === item.id ? S.purpleA : '#888', border: 'none', cursor: 'pointer', fontSize: 12, textAlign: 'left', transition: 'background 0.12s' }}>
                  {item.icon}{item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: `0.5px solid ${S.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: S.txt }}>{TITLES[active]}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a href="/" style={{ color: S.txt, fontSize: 13, textDecoration: 'none', padding: '6px 12px', background: S.card2, borderRadius: 6, marginRight: 8 }}>Exit to Market</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: S.txt2 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: S.red }} />4 disputes open
            </div>
            <button style={{ width: 34, height: 34, borderRadius: 8, background: '#EEEDFE', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5A4.5 4.5 0 003.5 6c0 1.5-.5 3-1.5 4h12c-1-1-1.5-2.5-1.5-4A4.5 4.5 0 008 1.5z" fill="#534AB7" opacity=".8"/><path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="#534AB7" strokeWidth="1.2" fill="none"/></svg>
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>{renderContent()}</div>
      </div>
    </div>
  );
}

function CatalogSection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const refresh = async () => {
    const res = await getAdminTaxonomyData();
    setData(res);
  };
  
  useEffect(() => { refresh(); }, []);

  const handleAddTaxonomy = async (e: React.FormEvent, type: 'CATEGORY' | 'TAG' | 'COLLECTION') => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const name = fd.get('name') as string;
    if (name.trim()) await createTaxonomy(type, name);
    (e.target as HTMLFormElement).reset();
    await refresh();
    setLoading(false);
  };

  const handleUpdateProduct = async (e: React.FormEvent, productId: string) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const tags = fd.getAll('tags') as string[];
    const cols = fd.getAll('collections') as string[];
    await updateProductTaxonomies(productId, tags, cols);
    await refresh();
    setLoading(false);
  };

  if (!data) return <div style={{ color: S.txt }}>Loading...</div>;

  const taxonomyUI = (type: 'CATEGORY' | 'TAG' | 'COLLECTION', items: any[]) => (
    <Card>
      <SectionTitle>Manage {type}S</SectionTitle>
      <form onSubmit={e => handleAddTaxonomy(e, type)} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input name="name" required placeholder={`New ${type.toLowerCase()} name`} disabled={loading} style={{ flex: 1, background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none' }} />
        <button type="submit" disabled={loading} style={{ background: S.sidebar, color: '#fff', border: 'none', borderRadius: 6, padding: '0 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add</button>
      </form>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 20, padding: '4px 8px 4px 12px', fontSize: 11, color: S.txt }}>
            {t.name}
            <button onClick={async () => { setLoading(true); await deleteTaxonomy(type, t.id); await refresh(); setLoading(false); }} disabled={loading} style={{ border: 'none', background: 'transparent', color: S.red, cursor: 'pointer', fontSize: 12 }}>×</button>
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        {taxonomyUI('CATEGORY', data.categories)}
        {taxonomyUI('TAG', data.tags)}
        {taxonomyUI('COLLECTION', data.collections)}
      </div>

      <Card>
        <SectionTitle>Product Tags & Collections Mapping</SectionTitle>
        <div style={{ fontSize: 11, color: S.txt2, marginBottom: 12 }}>Assign tags and collections to the latest products.</div>
        {data.products.map((p: any) => (
          <form key={p.id} onSubmit={e => handleUpdateProduct(e, p.id)} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 1fr', gap: 12, padding: '12px 0', borderBottom: `0.5px solid ${S.border}`, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.txt, marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: 11, color: S.txt3 }}>{p.slug}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: S.txt2 }}>
                <strong style={{ color: S.txt }}>Tags:</strong> 
                {data.tags.map((t: any) => (
                  <label key={t.id} style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" name="tags" value={t.id} defaultChecked={p.tags?.some((pt: any) => pt.id === t.id)} /> {t.name}
                  </label>
                ))}
              </div>
              <div style={{ fontSize: 11, color: S.txt2 }}>
                <strong style={{ color: S.txt }}>Collections:</strong> 
                {data.collections.map((c: any) => (
                  <label key={c.id} style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" name="collections" value={c.id} defaultChecked={p.collections?.some((pc: any) => pc.id === c.id)} /> {c.name}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button type="submit" disabled={loading} style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 4, padding: '4px 12px', fontSize: 11, color: S.txt, cursor: 'pointer' }}>
                Save
              </button>
            </div>
          </form>
        ))}
      </Card>
    </div>
  );
}
