'use client';

import React, { useState } from 'react';

// ─── Design tokens ─────────────────────────────────────────────────────────
const S = {
  sidebar: '#534AB7',
  bg: '#192033',
  card: '#1E2A3B',
  card2: '#28364A',
  border: 'rgba(255,255,255,0.08)',
  txt: '#F9FAFB',
  txt2: '#9CA3AF',
  txt3: '#6B7280',
  purple: '#534AB7',
  purpleL: '#AFA9EC',
  green: '#27500A',
  greenBg: '#EAF3DE',
  blue: '#0C447C',
  blueBg: '#E6F1FB',
  red: '#791F1F',
  redBg: '#FCEBEB',
  amber: '#633806',
  amberBg: '#FAEEDA',
};

// ─── Mock data removed - using real data from API ────────────────────────

const WISHLIST = [
  { name: 'Apple Watch Series 9', price: 5200, emoji: '⌚', bg: '#EEEDFE', inStock: true },
  { name: 'MacBook Air M3', price: 28500, emoji: '💻', bg: '#E1F5EE', inStock: true },
  { name: 'AirPods Pro 2nd Gen', price: 3400, emoji: '🎵', bg: '#FAEEDA', inStock: false },
  { name: 'iPad Air 5th Gen', price: 12000, emoji: '📱', bg: '#EEEDFE', inStock: true },
];

const ADDRESSES = [
  { id: 1, label: 'Home', street: '12 El Nasr St', city: 'New Cairo', gov: 'Cairo', isDefault: true },
  { id: 2, label: 'Work', street: '45 Makram Ebid Ave', city: 'Nasr City', gov: 'Cairo', isDefault: false },
];

const WALLET_TX = [
  { type: 'Refund', desc: 'Nike Air Max 270 — partial refund', amount: +200, date: 'Mar 25, 2026' },
  { type: 'Payment', desc: 'Order #ORD-4821 — Sony Headphones', amount: -2800, date: 'Mar 29, 2026' },
  { type: 'Loyalty', desc: 'Points redeemed (124 pts)', amount: +124, date: 'Mar 15, 2026' },
];

const REVIEWS = [
  { product: 'Nike Air Max 270', rating: 5, comment: 'Super comfortable, fast delivery!', date: 'Mar 22, 2026', emoji: '👟' },
  { product: 'Samsung Galaxy S24', rating: 4, comment: 'Great phone, slightly expensive.', date: 'Mar 12, 2026', emoji: '📱' },
];

// ─── Helper components ──────────────────────────────────────────────────────
function Badge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    Delivered: [S.greenBg, S.green],
    Shipped: [S.blueBg, S.blue],
    Processing: [S.amberBg, S.amber],
    Cancelled: [S.redBg, S.red],
  };
  const [bg, col] = map[status] ?? ['#374151', '#9CA3AF'];
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: bg, color: col }}>{status}</span>;
}

function Stars({ n }: { n: number }) {
  return <span style={{ color: '#F59E0B', fontSize: 12 }}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: S.card, borderRadius: 12, border: `0.5px solid ${S.border}`, padding: 16, ...style }}>{children}</div>;
}

function SectionTitle({ title }: { title: string }) {
  return <div style={{ fontSize: 14, fontWeight: 600, color: S.txt, marginBottom: 14 }}>{title}</div>;
}

// ─── Sections ───────────────────────────────────────────────────────────────

function OverviewSection({ orders }: { orders: any[] }) {
  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'Total orders', value: orders.length.toString(), sub: <span style={{ background: S.greenBg, color: S.green, fontSize: 10, padding: '1px 6px', borderRadius: 20 }}>{orders.length} active</span> },
          { label: 'Total spent', value: orders.reduce((acc, o) => acc + o.price, 0).toLocaleString(), sub: <span style={{ color: S.txt2, fontSize: 11 }}>EGP this year</span> },
          { label: 'Loyalty points', value: '1,240', valueColor: S.purple, sub: <span style={{ color: S.purple, fontSize: 11 }}>= 124 EGP</span> },
        ].map((s, i) => (
          <Card key={i}>
            <div style={{ fontSize: 11, color: S.txt2, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.valueColor ?? S.txt, lineHeight: 1 }}>{s.value}</div>
            <div style={{ marginTop: 4 }}>{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Active order tracking */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: S.txt, marginBottom: 6 }}>Active order — tracking</div>
        <div style={{ fontSize: 11, color: S.txt2, marginBottom: 14 }}>Order #{orders[0]?.id || 'N/A'} · {orders[0]?.name || 'N/A'}</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          {(['Ordered', 'Confirmed', 'Shipped', 'Delivered'] as const).map((label, i, arr) => (
            <React.Fragment key={label}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', margin: '0 auto 5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600,
                  background: i < 2 ? S.purple : i === 2 ? '#CECBF6' : S.card2,
                  color: i < 2 ? '#fff' : i === 2 ? '#3C3489' : S.txt3,
                  border: i === 2 ? `2px solid ${S.purple}` : i === 3 ? `0.5px solid #4B5563` : 'none',
                }}>
                  {i < 2 ? '✓' : i === 2 ? '→' : '4'}
                </div>
                <div style={{ fontSize: 10, color: S.txt2 }}>{label}</div>
              </div>
              {i < arr.length - 1 && <div style={{ flex: 1, height: 2, background: i < 2 ? S.purple : '#2D3748', marginBottom: 18, maxWidth: 60 }} />}
            </React.Fragment>
          ))}
        </div>
        <div style={{ fontSize: 11, color: S.blue, background: S.blueBg, padding: '6px 10px', borderRadius: 6 }}>
          Payment Status: {orders[0]?.paymentStatus || 'Paid'}
        </div>
      </Card>

      {/* Recent orders */}
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle title="Recent orders" />
        {orders.slice(0, 3).map((o: any, i: number) => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < 2 && i < orders.length - 1 ? `0.5px solid ${S.border}` : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: o.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{o.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: S.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</div>
              <div style={{ fontSize: 11, color: S.txt2 }}>{o.date} · #{o.id}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <Badge status={o.status} />
              <div style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>{o.price.toLocaleString()} EGP</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Recommended */}
      <Card>
        <SectionTitle title="Recommended for you" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {WISHLIST.slice(0, 2).map((p, i) => (
            <div key={i} style={{ background: S.card2, borderRadius: 8, padding: 10, cursor: 'pointer', border: `0.5px solid ${S.border}`, transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = S.purple}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = S.border}>
              <div style={{ height: 70, borderRadius: 6, background: p.bg, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{p.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: S.txt }}>{p.name}</div>
              <div style={{ fontSize: 11, color: S.purple, marginTop: 2 }}>{p.price.toLocaleString()} EGP</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function OrdersSection({ orders }: { orders: any[] }) {
  const [filter, setFilter] = useState<string>('All');
  const statuses = ['All', 'Shipped', 'Delivered', 'Processing', 'Cancelled'];
  const filtered = filter === 'All' ? orders : orders.filter((o: any) => o.status === filter);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '5px 14px', borderRadius: 20, border: `0.5px solid ${filter === s ? S.purple : S.border}`, background: filter === s ? S.purple : 'transparent', color: filter === s ? '#fff' : S.txt2, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
            {s}
          </button>
        ))}
      </div>
      <Card>
        {filtered.length === 0 && <div style={{ textAlign: 'center', color: S.txt3, padding: 40, fontSize: 13 }}>No orders found.</div>}
        {filtered.map((o: any, i: number) => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < filtered.length - 1 ? `0.5px solid ${S.border}` : 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: o.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{o.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>{o.name}</div>
              <div style={{ fontSize: 11, color: S.txt2, marginTop: 2 }}>#{o.id} · {o.date}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Badge status={o.status} />
              <div style={{ fontSize: 13, fontWeight: 600, color: S.txt, marginTop: 4 }}>{o.price.toLocaleString()} EGP</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function DiscoverSection() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16, marginBottom: 20 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
            <div style={{ height: 180, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
              🛍️
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: S.txt, marginBottom: 4 }}>Discover Item {i}</div>
              <div style={{ fontSize: 12, color: S.txt2 }}>Explore new trends and collections</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PointsSection({ data }: { data: any }) {
  const points = data?.user?.loyaltyPoints || 0;
  return (
    <div>
      <Card style={{ textAlign: 'center', padding: '32px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: S.purpleL }}>{points}</div>
        <div style={{ fontSize: 14, color: S.txt2, marginTop: 4 }}>Loyalty Points</div>
        <div style={{ fontSize: 12, color: S.txt3, marginTop: 8 }}>≈ {(points * 0.1).toFixed(2)} EGP value</div>
      </Card>
      <Card>
        <SectionTitle title="How to earn points" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { action: 'Purchase', points: '+10 per 100 EGP spent' },
            { action: 'Review', points: '+5 per review' },
            { action: 'Referral', points: '+50 per friend' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? `0.5px solid ${S.border}` : 'none' }}>
              <span style={{ fontSize: 13, color: S.txt }}>{item.action}</span>
              <span style={{ fontSize: 12, color: S.purpleL, fontWeight: 600 }}>{item.points}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AddressesSection() {
  const [addrs, setAddrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ street: '', city: '', governorate: '', postalCode: '', isDefault: false });

  const fetchAddrs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/addresses');
      const d = await res.json();
      setAddrs(d.addresses || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchAddrs(); }, []);

  const handleAdd = async () => {
    if (!form.street || !form.city || !form.governorate) return;
    try {
      await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setAdding(false);
      setForm({ street: '', city: '', governorate: '', postalCode: '', isDefault: false });
      fetchAddrs();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete address?')) return;
    try {
      await fetch(`/api/addresses?id=${id}`, { method: 'DELETE' });
      fetchAddrs();
    } catch (err) { console.error(err); }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await fetch('/api/addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isDefault: true })
      });
      fetchAddrs();
    } catch (err) { console.error(err); }
  };

  if (loading && addrs.length === 0) return <div style={{ color: S.txt2, textAlign: 'center', padding: 40 }}>Loading addresses...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: S.txt2 }}>{addrs.length} saved addresses</div>
        <button onClick={() => setAdding(!adding)}
          style={{ background: S.purple, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {adding ? 'Cancel' : '+ Add address'}
        </button>
      </div>

      {adding && (
        <Card style={{ marginBottom: 12 }}>
          <SectionTitle title="New address" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <input value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} placeholder="Street Address *" style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none', gridColumn: '1 / -1' }} />
            <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="City *" style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none' }} />
            <input value={form.governorate} onChange={e => setForm(p => ({ ...p, governorate: e.target.value }))} placeholder="Governorate *" style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none' }} />
            <input value={form.postalCode} onChange={e => setForm(p => ({ ...p, postalCode: e.target.value }))} placeholder="Postal Code" style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: S.txt2 }}>
              <input type="checkbox" checked={form.isDefault} onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))} /> Set as default
            </label>
          </div>
          <button onClick={handleAdd} style={{ background: S.purple, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
        </Card>
      )}

      {addrs.map((a: any) => (
        <Card key={a.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>{a.city}, {a.governorate}</span>
                {a.isDefault && <span style={{ fontSize: 10, background: '#EEEDFE', color: '#3C3489', padding: '1px 6px', borderRadius: 20, fontWeight: 600 }}>Default</span>}
              </div>
              <div style={{ fontSize: 12, color: S.txt2 }}>{a.street}</div>
              {a.postalCode && <div style={{ fontSize: 11, color: S.txt3 }}>Postal: {a.postalCode}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {!a.isDefault && (
                <button onClick={() => handleSetDefault(a.id)}
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: `0.5px solid ${S.border}`, background: 'transparent', color: S.txt2, cursor: 'pointer' }}>Set default</button>
              )}
              <button onClick={() => handleDelete(a.id)}
                style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: `0.5px solid ${S.redBg}`, background: 'transparent', color: S.red, cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </Card>
      ))}
      {addrs.length === 0 && !adding && <div style={{ textAlign: 'center', color: S.txt3, padding: 40, fontSize: 13 }}>No saved addresses.</div>}
    </div>
  );
}

function WalletSection() {
  return (
    <div>
      <Card style={{ marginBottom: 12, textAlign: 'center', padding: '24px 16px' }}>
        <div style={{ fontSize: 11, color: S.txt2, marginBottom: 8 }}>Available balance</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: S.purpleL }}>1,240 EGP</div>
        <div style={{ fontSize: 11, color: S.txt2, marginTop: 4 }}>≈ 1,240 loyalty points</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button style={{ background: S.purple, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add funds</button>
          <button style={{ background: 'transparent', color: S.purpleL, border: `0.5px solid ${S.purple}`, borderRadius: 6, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Withdraw</button>
        </div>
      </Card>
      <Card>
        <SectionTitle title="Transaction history" />
        {WALLET_TX.map((tx, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < WALLET_TX.length - 1 ? `0.5px solid ${S.border}` : 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: tx.amount > 0 ? S.greenBg : S.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              {tx.amount > 0 ? '↓' : '↑'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: S.txt }}>{tx.type}</div>
              <div style={{ fontSize: 11, color: S.txt2 }}>{tx.desc}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: tx.amount > 0 ? '#10B981' : '#EF4444' }}>{tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} EGP</div>
              <div style={{ fontSize: 11, color: S.txt3 }}>{tx.date}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ReviewsSection() {
  return (
    <div>
      {REVIEWS.map((r, i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: S.card2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{r.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.txt, marginBottom: 4 }}>{r.product}</div>
              <div style={{ marginBottom: 6 }}><Stars n={r.rating} /></div>
              <div style={{ fontSize: 12, color: S.txt2 }}>{r.comment}</div>
              <div style={{ fontSize: 11, color: S.txt3, marginTop: 6 }}>{r.date}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Nav items ──────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview',   label: 'Overview',   icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".6"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".3"/></svg> },
  { id: 'orders',     label: 'My orders',  icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="2" rx="1" fill="currentColor"/><rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" opacity=".7"/><rect x="2" y="12" width="8" height="2" rx="1" fill="currentColor" opacity=".4"/></svg> },
  { id: 'wishlist',   label: 'Wishlist',   icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 13S2 9 2 5.5A3.5 3.5 0 018 3.5 3.5 3.5 0 0114 5.5C14 9 8 13 8 13z" fill="currentColor" opacity=".7"/></svg> },
  { id: 'addresses',  label: 'Addresses',  icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6C12.5 3.5 10.5 1.5 8 1.5z" fill="currentColor" opacity=".7"/><circle cx="8" cy="6" r="1.5" fill="currentColor"/></svg> },
  { id: 'wallet',     label: 'Wallet',     icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="9" rx="2" fill="currentColor" opacity=".6"/><rect x="1" y="4" width="14" height="3" rx="1" fill="currentColor"/><circle cx="11.5" cy="9.5" r="1.5" fill="#AFA9EC"/></svg> },
  { id: 'reviews',    label: 'My reviews', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3.5H13l-3 2 1 3.5L8 9l-3 2 1-3.5-3-2h3.5z" fill="currentColor" opacity=".7"/></svg> },
];

const TITLES: Record<string, string> = {
  overview: 'Good morning',
  orders: 'My orders',
  wishlist: 'Wishlist',
  addresses: 'Addresses',
  wallet: 'Wallet',
  reviews: 'My reviews',
};

import { getDashboardStats } from '../actions/seller';
import { useEffect } from 'react';
import { useWishlistStore } from '@/lib/wishlistStore';

// ─── Page ──────────────────────────────────────────────────────────────────
export default function CustomerDashboardPage() {
  const [active, setActive] = useState('overview');
  const [notifOpen, setNotifOpen] = useState(false);
  const [data, setData] = useState<any>(null);

  const { items: wishlistItems, fetchItems } = useWishlistStore();

  useEffect(() => {
    getDashboardStats().then(res => setData(res)).catch(e => console.error(e));
    fetchItems();
  }, []);

  if (!data) return <div style={{ background: S.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading Data...</div>;

  const dbOrders = data.myOrders?.map((o: any) => ({
    id: o.id.substring(0, 8), name: o.items[0]?.productTitleSnapshot || 'Order', date: new Date(o.createdAt).toLocaleDateString(), price: o.totalAmount, status: o.status === 'CONFIRMED' ? 'Processing' : o.status, paymentStatus: o.paymentStatus, emoji: '📦', bg: '#EEEDFE'
  })) || [];

  const WishlistSection = () => {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {wishlistItems.map((p: any) => (
            <Card key={p.id} style={{ padding: 10 }}>
              <div style={{ aspectRatio: '1/1', background: '#F3F4F6', borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
                <img src={p.image || '/placeholder.png'} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.txt, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: S.purpleL, marginBottom: 8 }}>{p.price} EGP</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button 
                  onClick={() => window.location.href = `/product/${p.id}`}
                  style={{ flex: 1, fontSize: 11, padding: '5px', borderRadius: 4, background: S.purple, color: '#fff', border: 'none', cursor: 'pointer' }}>View</button>
                <button 
                  onClick={() => useWishlistStore.getState().toggleItem(p, data.session)}
                  style={{ fontSize: 11, padding: '5px 8px', borderRadius: 4, background: S.redBg, color: S.red, border: 'none', cursor: 'pointer' }}>✕</button>
              </div>
            </Card>
          ))}
        </div>
        {wishlistItems.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: S.txt3 }}>Your wishlist is empty.</div>}
      </div>
    )
  }

  const renderContent = () => {
    switch (active) {
      case 'overview':   return <OverviewSection orders={dbOrders} />;
      case 'orders':     return <OrdersSection orders={dbOrders} />;
      case 'wishlist':   return <WishlistSection />;
      case 'addresses':  return <AddressesSection />;
      case 'wallet':     return <WalletSection />;
      case 'reviews':    return <ReviewsSection />;
      default:           return <OverviewSection orders={dbOrders} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: S.bg, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Sidebar */}
      <div style={{ width: 186, flexShrink: 0, background: S.sidebar, display: 'flex', flexDirection: 'column', padding: '16px 0' }}>
        <div style={{ padding: '0 16px 24px', fontSize: 16, fontWeight: 700, color: '#fff' }}>Souq<span style={{ color: S.purpleL }}>EG</span></div>
        <nav style={{ flex: 1 }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActive(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px', background: active === item.id ? 'rgba(255,255,255,0.15)' : 'transparent', color: active === item.id ? '#fff' : '#CECBF6', border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', transition: 'background 0.12s' }}
              onMouseEnter={e => { if (active !== item.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { if (active !== item.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" fill="white" opacity=".7"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="white" strokeWidth="1.5" fill="none" opacity=".5"/></svg>
            <span style={{ fontSize: 12, color: '#CECBF6' }}>{data.user?.name || 'Customer'}</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: `0.5px solid ${S.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: S.txt }}>{active === 'overview' ? `Good morning, ${data.user?.name?.split(' ')[0] || ''}` : TITLES[active]}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a href="/" style={{ color: S.txt, fontSize: 13, textDecoration: 'none', padding: '6px 12px', background: S.card2, borderRadius: 6, marginRight: 8 }}>Exit to Market</a>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setNotifOpen(!notifOpen)}
                style={{ width: 34, height: 34, borderRadius: 8, background: '#EEEDFE', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5A4.5 4.5 0 003.5 6c0 1.5-.5 3-1.5 4h12c-1-1-1.5-2.5-1.5-4A4.5 4.5 0 008 1.5z" fill="#534AB7" opacity=".8"/><path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="#534AB7" strokeWidth="1.2" fill="none"/></svg>
              </button>
              {notifOpen && (
                <div style={{ position: 'absolute', top: 42, right: 0, width: 260, background: S.card, border: `0.5px solid ${S.border}`, borderRadius: 10, padding: 12, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: S.txt, marginBottom: 10 }}>Notifications</div>
                  {[
                    { icon: '📦', msg: 'Your order #ORD-4821 is out for delivery', time: '2h ago' },
                    { icon: '⭐', msg: 'Rate your recent purchase: Nike Air Max', time: '1d ago' },
                    { icon: '🎁', msg: 'You earned 50 loyalty points!', time: '3d ago' },
                  ].map((n, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: i < 2 ? `0.5px solid ${S.border}` : 'none' }}>
                      <span style={{ fontSize: 16 }}>{n.icon}</span>
                      <div>
                        <div style={{ fontSize: 11, color: S.txt }}>{n.msg}</div>
                        <div style={{ fontSize: 10, color: S.txt3 }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#CECBF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#3C3489', cursor: 'pointer' }}>
              {data.user?.name?.substring(0, 2).toUpperCase() || 'CU'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
