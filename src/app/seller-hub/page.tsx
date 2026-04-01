'use client';

import React, { useState } from 'react';

const S = {
  sidebar: '#0F6E56',
  bg: '#192033',
  card: '#1E2A3B',
  card2: '#28364A',
  border: 'rgba(255,255,255,0.08)',
  txt: '#F9FAFB',
  txt2: '#9CA3AF',
  txt3: '#6B7280',
  green: '#1D9E75',
  greenL: '#9FE1CB',
  greenA: '#5DCAA5',
  greenBg: '#E1F5EE',
  greenD: '#085041',
  red: '#E24B4A',
  redBg: '#FCEBEB',
  redD: '#791F1F',
  amber: '#EF9F27',
  amberBg: '#FAEEDA',
  amberD: '#633806',
  blue: '#3B82F6',
  blueBg: '#E6F1FB',
  blueD: '#0C447C',
};

// ─── Mock data ──────────────────────────────────────────────────────────────
const PRODUCTS_INIT = [
  { id: 'p1', name: 'Sony WH-1000XM5', sku: 'SKU-1021', price: 2800, stock: 3, status: 'Active', category: 'Electronics', emoji: '🎧' },
  { id: 'p2', name: 'Apple AirPods Pro', sku: 'SKU-0987', price: 3400, stock: 1, status: 'Active', category: 'Electronics', emoji: '🎵' },
  { id: 'p3', name: 'HDMI Cable 2m', sku: 'SKU-0654', price: 180, stock: 5, status: 'Active', category: 'Accessories', emoji: '🔌' },
  { id: 'p4', name: 'USB-C Hub 7-in-1', sku: 'SKU-0450', price: 450, stock: 12, status: 'Active', category: 'Accessories', emoji: '🔌' },
  { id: 'p5', name: 'JBL Flip 6 Speaker', sku: 'SKU-1200', price: 1200, stock: 8, status: 'Active', category: 'Audio', emoji: '🔊' },
];

const ORDERS_INIT = [
  { id: '#ORD-5021', product: 'Sony WH-1000XM5', buyer: 'Mazen Ahmed', price: '2,800 EGP', status: 'New', date: 'Apr 1, 2026' },
  { id: '#ORD-5019', product: 'JBL Flip 6 Speaker', buyer: 'Sara M.', price: '1,200 EGP', status: 'Shipped', date: 'Mar 31, 2026' },
  { id: '#ORD-5017', product: 'USB-C Hub', buyer: 'Ahmed K.', price: '450 EGP', status: 'Return req.', date: 'Mar 29, 2026' },
  { id: '#ORD-5010', product: 'Apple AirPods Pro', buyer: 'Omar H.', price: '3,400 EGP', status: 'Delivered', date: 'Mar 25, 2026' },
  { id: '#ORD-5003', product: 'HDMI Cable 2m', buyer: 'Nour E.', price: '180 EGP', status: 'Delivered', date: 'Mar 20, 2026' },
];

const REVIEWS_INIT = [
  { product: 'Sony WH-1000XM5', buyer: 'Mazen A.', rating: 5, comment: 'Amazing sound quality, fast delivery!', date: 'Mar 30, 2026' },
  { product: 'JBL Flip 6', buyer: 'Sara M.', rating: 4, comment: 'Good speaker, a bit pricey.', date: 'Mar 22, 2026', sellerReply: '' },
  { product: 'USB-C Hub', buyer: 'Ahmed K.', rating: 2, comment: 'One port stopped working after 2 weeks.', date: 'Mar 15, 2026', sellerReply: '' },
];

const WALLET_TX = [
  { type: 'Sale', desc: '#ORD-5010 — Apple AirPods Pro', amount: +2890, date: 'Mar 25, 2026' },
  { type: 'Payout', desc: 'Bank transfer — Completed', amount: -10000, date: 'Mar 20, 2026' },
  { type: 'Sale', desc: '#ORD-5003 — HDMI Cable 2m', amount: +153, date: 'Mar 20, 2026' },
];

const RETURNS_INIT = [
  { id: '#ORD-5017', product: 'USB-C Hub', buyer: 'Ahmed K.', reason: 'Defective port', amount: '450 EGP', date: 'Mar 30, 2026' },
];

const BAR_HEIGHTS = [40, 60, 45, 80, 100, 70, 55];
const BAR_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─── Helper components ──────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: S.card, borderRadius: 10, border: `0.5px solid ${S.border}`, padding: 14, ...style }}>{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: S.txt, marginBottom: 12 }}>{children}</div>;
}
function OrderBadge({ status }: { status: string }) {
  const m: Record<string, [string, string, string]> = {
    New: [S.greenBg, S.greenD, S.green],
    Shipped: [S.blueBg, S.blueD, S.blue],
    Delivered: [S.greenBg, S.greenD, S.green],
    'Return req.': [S.redBg, S.redD, S.red],
    Processing: [S.amberBg, S.amberD, S.amber],
  };
  const [bg, col, bdr] = m[status] ?? ['#374151', '#9CA3AF', '#6B7280'];
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: bg, color: col, border: `0.5px solid ${bdr}` }}>{status}</span>;
}
function Stars({ n }: { n: number }) {
  return <span style={{ color: '#F59E0B', fontSize: 12 }}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

// ─── Sections ───────────────────────────────────────────────────────────────
function OverviewSection({ onNav }: { onNav: (id: string) => void }) {
  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Revenue (March)', value: '48,200', sub: '+18% vs Feb', subBg: '#EAF3DE', subC: '#27500A' },
          { label: 'Orders', value: '134', sub: '+12 today', subBg: '#EAF3DE', subC: '#27500A' },
          { label: 'Wallet balance', value: '32,640', valueColor: S.green, sub: 'EGP available', subC: S.txt2 },
          { label: 'Seller rating', value: '4.8', sub: '312 reviews', subC: S.amberD },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: S.txt2, marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: s.valueColor ?? S.txt, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, marginTop: 3 }}>
              {s.subBg ? <span style={{ background: s.subBg, color: s.subC, fontSize: 10, padding: '1px 6px', borderRadius: 20 }}>{s.sub}</span> : <span style={{ color: s.subC }}>{s.sub}</span>}
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue chart + Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Card>
          <SectionTitle>Revenue — last 7 days</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 70 }}>
            {BAR_HEIGHTS.map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: S.green, height: `${h}%`, cursor: 'pointer', transition: 'opacity 0.12s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '.7'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'} />
                <span style={{ fontSize: 9, color: S.txt3 }}>{BAR_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle>Performance score</SectionTitle>
          {[
            { label: 'Shipping speed', pct: 92, color: S.green, val: '92%' },
            { label: 'Order acceptance', pct: 98, color: S.green, val: '98%' },
            { label: 'Return rate', pct: 4, color: S.red, val: '4%', valC: S.redD },
            { label: 'Response time', pct: 85, color: S.amber, val: '2.1h' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: S.txt2, minWidth: 110 }}>{row.label}</div>
              <div style={{ flex: 1, height: 6, background: '#2D3748', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: row.color, width: `${row.pct}%` }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, minWidth: 36, textAlign: 'right', color: row.valC ?? S.txt }}>{row.val}</div>
            </div>
          ))}
        </Card>
      </div>

      {/* New orders + Low stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SectionTitle>{''}</SectionTitle>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>New orders</span>
              <button onClick={() => onNav('orders')} style={{ fontSize: 11, color: S.green, background: 'none', border: 'none', cursor: 'pointer' }}>See all</button>
            </div>
          </div>
          {ORDERS_INIT.slice(0, 3).map((o, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 2 ? `0.5px solid ${S.border}` : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: S.txt }}>{o.id}</div>
                <div style={{ fontSize: 11, color: S.txt2 }}>{o.product}</div>
              </div>
              <OrderBadge status={o.status} />
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>Low stock alert</span>
            <button onClick={() => onNav('products')} style={{ fontSize: 11, color: S.green, background: 'none', border: 'none', cursor: 'pointer' }}>Manage</button>
          </div>
          {PRODUCTS_INIT.filter(p => p.stock <= 5).map((p, i, arr) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < arr.length - 1 ? `0.5px solid ${S.border}` : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: S.txt }}>{p.name}</div>
                <div style={{ fontSize: 11, color: S.txt2 }}>{p.sku}</div>
              </div>
              <span style={{ fontSize: 10, background: S.redBg, color: S.redD, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{p.stock} left</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function OrdersSection() {
  const [orders, setOrders] = useState(ORDERS_INIT);
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? orders : orders.filter(o => o.status === filter);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['All', 'New', 'Shipped', 'Delivered', 'Return req.'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 14px', borderRadius: 20, border: `0.5px solid ${filter === f ? S.sidebar : S.border}`, background: filter === f ? S.sidebar : 'transparent', color: filter === f ? '#fff' : S.txt2, fontSize: 12, cursor: 'pointer' }}>
            {f}
          </button>
        ))}
      </div>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr 1fr 1.2fr', gap: 8, padding: '6px 0', borderBottom: `0.5px solid ${S.border}`, marginBottom: 6 }}>
          {['Order', 'Product', 'Buyer', 'Amount', 'Status', 'Date'].map(h => (
            <span key={h} style={{ fontSize: 10, color: S.txt3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
          ))}
        </div>
        {filtered.map((o, i) => (
          <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr 1fr 1.2fr', gap: 8, padding: '10px 0', borderBottom: i < filtered.length - 1 ? `0.5px solid ${S.border}` : 'none', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: S.greenA }}>{o.id}</span>
            <span style={{ fontSize: 11, color: S.txt }}>{o.product}</span>
            <span style={{ fontSize: 11, color: S.txt2 }}>{o.buyer}</span>
            <span style={{ fontSize: 12, color: S.txt }}>{o.price}</span>
            <OrderBadge status={o.status} />
            <span style={{ fontSize: 11, color: S.txt3 }}>{o.date}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ProductsSection() {
  const [products, setProducts] = useState(PRODUCTS_INIT);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', price: '', stock: '', category: '' });

  const addProduct = () => {
    if (!form.name || !form.price) return;
    setProducts(prev => [...prev, {
      id: 'p' + Date.now(), name: form.name, sku: form.sku || 'SKU-' + Math.floor(Math.random() * 9000 + 1000),
      price: parseFloat(form.price), stock: parseInt(form.stock) || 0,
      status: 'Active', category: form.category || 'General', emoji: '📦'
    }]);
    setForm({ name: '', sku: '', price: '', stock: '', category: '' });
    setAdding(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setAdding(!adding)}
          style={{ background: S.sidebar, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {adding ? '✕ Cancel' : '+ Add product'}
        </button>
      </div>

      {adding && (
        <Card style={{ marginBottom: 12 }}>
          <SectionTitle>New product</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[
              { key: 'name', ph: 'Product name *' },
              { key: 'price', ph: 'Price (EGP) *', type: 'number' },
              { key: 'sku', ph: 'SKU (optional)' },
              { key: 'stock', ph: 'Stock count', type: 'number' },
              { key: 'category', ph: 'Category' },
            ].map(f => (
              <input key={f.key} type={f.type ?? 'text'} placeholder={f.ph} value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none', gridColumn: f.key === 'name' ? '1 / -1' : undefined }} />
            ))}
          </div>
          <button onClick={addProduct}
            style={{ background: S.sidebar, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Save product
          </button>
        </Card>
      )}

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 80px', gap: 8, padding: '6px 0', borderBottom: `0.5px solid ${S.border}`, marginBottom: 6 }}>
          {['Product', 'SKU', 'Price', 'Stock', 'Category', ''].map(h => (
            <span key={h} style={{ fontSize: 10, color: S.txt3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
          ))}
        </div>
        {products.map((p, i) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 80px', gap: 8, padding: '10px 0', borderBottom: i < products.length - 1 ? `0.5px solid ${S.border}` : 'none', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{p.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: S.txt }}>{p.name}</span>
            </div>
            <span style={{ fontSize: 11, color: S.txt2 }}>{p.sku}</span>
            <span style={{ fontSize: 12, color: S.txt }}>{p.price.toLocaleString()} EGP</span>
            <span style={{ fontSize: 12, color: p.stock <= 3 ? S.red : S.txt }}>{p.stock}</span>
            <span style={{ fontSize: 11, color: S.txt2 }}>{p.category}</span>
            <button onClick={() => setProducts(prev => prev.filter(x => x.id !== p.id))}
              style={{ fontSize: 11, color: S.red, background: S.redBg, border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }}>
              Remove
            </button>
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
          { label: 'Total revenue', value: '48,200 EGP', c: S.green },
          { label: 'Avg order value', value: '359 EGP', c: S.txt },
          { label: 'Return rate', value: '4%', c: S.red },
          { label: 'Customer rating', value: '4.8 / 5', c: '#F59E0B' },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: S.txt2, marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: s.c }}>{s.value}</div>
          </Card>
        ))}
      </div>
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>Revenue — last 30 days</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100 }}>
          {Array.from({ length: 30 }, (_, i) => 25 + Math.round(Math.sin(i * 0.6) * 20 + Math.random() * 40)).map((h, i) => (
            <div key={i} title={`Day ${i + 1}`} style={{ flex: 1, height: `${h}%`, background: S.green, borderRadius: '2px 2px 0 0', opacity: 0.6 + (h / 100) * 0.4, cursor: 'pointer', transition: 'opacity 0.12s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = String(0.6 + (h / 100) * 0.4)} />
          ))}
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <SectionTitle>Top products by revenue</SectionTitle>
          {PRODUCTS_INIT.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < PRODUCTS_INIT.length - 1 ? `0.5px solid ${S.border}` : 'none', alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>{p.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: S.txt }}>{p.name}</div>
                <div style={{ height: 4, background: '#2D3748', borderRadius: 2, marginTop: 4 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: S.green, width: `${Math.min(100, (p.price / 3400) * 100)}%` }} />
                </div>
              </div>
              <span style={{ fontSize: 12, color: S.txt, fontWeight: 600 }}>{p.price.toLocaleString()} EGP</span>
            </div>
          ))}
        </Card>
        <Card>
          <SectionTitle>Traffic sources</SectionTitle>
          {[
            { source: 'Homepage', pct: 42, color: S.green },
            { source: 'Search', pct: 30, color: '#6366F1' },
            { source: 'Categories', pct: 18, color: S.amber },
            { source: 'Direct link', pct: 10, color: S.red },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: S.txt2, minWidth: 100 }}>{t.source}</div>
              <div style={{ flex: 1, height: 6, background: '#2D3748', borderRadius: 3 }}>
                <div style={{ height: '100%', borderRadius: 3, background: t.color, width: `${t.pct}%` }} />
              </div>
              <span style={{ fontSize: 12, color: S.txt, minWidth: 36, textAlign: 'right' }}>{t.pct}%</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function WalletSection() {
  const [amount, setAmount] = useState('');
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Card style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: 11, color: S.txt2, marginBottom: 6 }}>Available balance</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: S.greenA }}>32,640 EGP</div>
          <div style={{ fontSize: 11, color: S.txt2, marginTop: 4 }}>Next payout: Apr 5, 2026</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (EGP)"
              style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, color: S.txt, outline: 'none', width: 120 }} />
            <button onClick={() => { if (amount) { alert(`Withdrawal of ${amount} EGP requested!`); setAmount(''); } }}
              style={{ background: S.sidebar, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Withdraw</button>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            {[{ label: 'Pending', val: '9,450 EGP', c: S.amber }, { label: 'Total earned', val: '1,24,300 EGP', c: S.green }].map((s, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: S.txt2, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: s.c }}>{s.val}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: S.border, margin: '10px 0' }} />
          <div style={{ fontSize: 11, color: S.txt2, marginBottom: 6 }}>Commission rate: <strong style={{ color: S.txt }}>15%</strong></div>
          <div style={{ fontSize: 11, color: S.txt2 }}>Payout cycle: <strong style={{ color: S.txt }}>Weekly (Friday)</strong></div>
        </Card>
      </div>
      <Card>
        <SectionTitle>Transaction history</SectionTitle>
        {WALLET_TX.map((tx, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < WALLET_TX.length - 1 ? `0.5px solid ${S.border}` : 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: tx.amount > 0 ? S.greenBg : S.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{tx.amount > 0 ? '↓' : '↑'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: S.txt }}>{tx.type}</div>
              <div style={{ fontSize: 11, color: S.txt2 }}>{tx.desc}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: tx.amount > 0 ? S.green : S.red }}>{tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} EGP</div>
              <div style={{ fontSize: 11, color: S.txt3 }}>{tx.date}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ReturnsSection() {
  const [returns, setReturns] = useState(RETURNS_INIT);
  return (
    <div>
      {returns.length === 0 && (
        <Card><div style={{ textAlign: 'center', color: S.txt2, padding: 40 }}>No active return requests ✓</div></Card>
      )}
      {returns.map((r, i) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>{r.id}</span>
                <span style={{ fontSize: 10, background: S.amberBg, color: S.amberD, padding: '1px 6px', borderRadius: 20, fontWeight: 600 }}>Return request</span>
              </div>
              <div style={{ fontSize: 12, color: S.txt2 }}>Product: {r.product} · Amount: {r.amount}</div>
              <div style={{ fontSize: 12, color: S.txt2 }}>Buyer: {r.buyer} · Reason: {r.reason}</div>
              <div style={{ fontSize: 11, color: S.txt3 }}>{r.date}</div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <button onClick={() => setReturns(p => p.filter((_, j) => j !== i))}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: `0.5px solid ${S.green}`, background: 'transparent', color: S.greenD, cursor: 'pointer', fontWeight: 600 }}>Accept return</button>
              <button onClick={() => setReturns(p => p.filter((_, j) => j !== i))}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: `0.5px solid ${S.red}`, background: 'transparent', color: S.redD, cursor: 'pointer', fontWeight: 600 }}>Reject</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ReviewsSection() {
  const [reviews, setReviews] = useState(REVIEWS_INIT);
  const [replies, setReplies] = useState<Record<number, string>>({});
  return (
    <div>
      {reviews.map((r, i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.txt }}>{r.product}</div>
              <div style={{ fontSize: 11, color: S.txt2 }}>by {r.buyer} · {r.date}</div>
            </div>
            <Stars n={r.rating} />
          </div>
          <div style={{ fontSize: 12, color: S.txt2, marginBottom: 10 }}>"{r.comment}"</div>
          {reviews[i].sellerReply ? (
            <div style={{ background: S.card2, borderRadius: 6, padding: '8px 10px', fontSize: 11, color: S.greenA }}>
              <strong>Your reply:</strong> {reviews[i].sellerReply}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={replies[i] ?? ''} onChange={e => setReplies(p => ({ ...p, [i]: e.target.value }))}
                placeholder="Write a reply…"
                style={{ flex: 1, background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, color: S.txt, outline: 'none' }} />
              <button onClick={() => {
                if (replies[i]) {
                  const updated = [...reviews];
                  updated[i] = { ...updated[i], sellerReply: replies[i] };
                  setReviews(updated);
                  setReplies(p => ({ ...p, [i]: '' }));
                }
              }} style={{ background: S.sidebar, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reply</button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
import { getDashboardStats, createProduct, deleteProduct, updateOrderStatus } from '../actions';
import { useEffect } from 'react';

// ─── Nav ────────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview', label: 'Overview', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".6"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".3"/></svg> },
  { id: 'orders', label: 'Orders', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".7"/><rect x="5" y="5" width="6" height="1.2" rx=".6" fill="currentColor" opacity=".6"/><rect x="5" y="8" width="4" height="1.2" rx=".6" fill="currentColor" opacity=".4"/></svg> },
  { id: 'products', label: 'Products', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="8" rx="1.5" fill="currentColor" opacity=".7"/><rect x="9" y="1" width="6" height="5" rx="1.5" fill="currentColor" opacity=".5"/><rect x="1" y="11" width="6" height="4" rx="1.5" fill="currentColor" opacity=".4"/><rect x="9" y="8" width="6" height="7" rx="1.5" fill="currentColor" opacity=".3"/></svg> },
  { id: 'analytics', label: 'Analytics', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polyline points="1,12 5,7 8,10 11,4 15,8" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8"/></svg> },
  { id: 'wallet', label: 'Wallet', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="9" rx="2" fill="currentColor" opacity=".6"/><rect x="1" y="4" width="14" height="3" rx="1" fill="currentColor"/><circle cx="11.5" cy="9.5" r="1.5" fill="#0F6E56"/></svg> },
];

const TITLES: Record<string, string> = {
  overview: 'Dashboard', orders: 'Orders', products: 'Products',
  analytics: 'Analytics', wallet: 'Wallet'
};

export default function SellerHubPage() {
  const [active, setActive] = useState('overview');
  const [data, setData] = useState<any>(null);

  const refresh = () => {
    getDashboardStats().then(res => setData(res)).catch(e => console.error(e));
  }

  useEffect(() => { refresh(); }, []);

  if (!data) return <div style={{ background: S.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading Data...</div>;

  const dbProducts = data.myProducts.filter((p: any) => p.published).map((p: any) => ({
    id: p.id, name: p.title, sku: p.slug.substring(0, 8), price: p.basePrice, stock: 10, category: 'General', emoji: '📦'
  }));

  const dbOrders = data.myOrders.map((o: any) => ({
    id: o.id.substring(0, 8), product: 'Multiple Items', buyer: 'User', price: o.totalAmount + ' EGP', status: o.status, date: new Date(o.createdAt).toLocaleDateString()
  }));

  const SellerProductsSection = () => {
    const [adding, setAdding] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setUploading(true);
      const fd = new FormData(e.currentTarget);
      
      const fileRaw = fd.get('image');
      if (fileRaw && (fileRaw as File).size > 0) {
        const uploadFd = new FormData();
        uploadFd.append('file', fileRaw);
        
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: uploadFd });
          const resData = await res.json();
          if (resData.url) {
            fd.append('imageUrl', resData.url);
          }
        } catch (err) {
          console.error("Upload failed", err);
        }
      }
      
      fd.delete('image'); // don't send the raw buffer to the server action

      await createProduct(fd);
      refresh();
      setAdding(false);
      setUploading(false);
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={() => setAdding(!adding)} style={{ background: S.sidebar, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {adding ? '✕ Cancel' : '+ Add product'}
          </button>
        </div>

        {adding && (
          <Card style={{ marginBottom: 12 }}>
            <SectionTitle>New product</SectionTitle>
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <input name="title" required placeholder="Product name *" style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none', gridColumn: '1 / -1' }} />
              <input name="price" required type="number" placeholder="Base Price (EGP) *" style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none' }} />
              <input name="stock" required type="number" placeholder="Total Stock count *" style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none' }} />
              
              <input name="sizes" placeholder="Sizes (comma separated, e.g. S, M, L)" style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none' }} />
              <input name="colors" placeholder="Colors (comma separated, e.g. Red, Blue)" style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none' }} />

              <select name="category" required style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: S.txt, outline: 'none' }}>
                <option value="">Select Category *</option>
                {data.categories?.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input name="image" type="file" accept="image/*" style={{ background: S.card2, border: `0.5px solid ${S.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, color: S.txt, outline: 'none' }} />

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16, marginTop: 8 }}>
                <div style={{ flex: 1, background: S.card2, padding: 10, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.txt, marginBottom: 6 }}>Tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {data.tags?.map((t: any) => (
                      <label key={t.id} style={{ fontSize: 11, color: S.txt2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="checkbox" name="tags" value={t.id} /> {t.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1, background: S.card2, padding: 10, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.txt, marginBottom: 6 }}>Collections</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {data.collections?.map((c: any) => (
                      <label key={c.id} style={{ fontSize: 11, color: S.txt2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="checkbox" name="collections" value={c.id} /> {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" disabled={uploading} style={{ gridColumn: '1 / -1', background: uploading ? S.txt3 : S.sidebar, color: '#fff', border: 'none', borderRadius: 6, padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', marginTop: 8 }}>
                {uploading ? 'Uploading Image & Saving...' : 'Save Product & Generate Variants'}
              </button>
            </form>
          </Card>
        )}

        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 80px', gap: 8, padding: '6px 0', borderBottom: `0.5px solid ${S.border}`, marginBottom: 6 }}>
            {['Product', 'SKU', 'Price', 'Stock', 'Category', ''].map(h => (
              <span key={h} style={{ fontSize: 10, color: S.txt3, fontWeight: 600, textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>
          {dbProducts.map((p: any, i: number) => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 80px', gap: 8, padding: '10px 0', borderBottom: i < dbProducts.length - 1 ? `0.5px solid ${S.border}` : 'none', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: S.txt }}>{p.name}</div>
              <span style={{ fontSize: 11, color: S.txt2 }}>{p.sku}</span>
              <span style={{ fontSize: 12, color: S.txt }}>{p.price} EGP</span>
              <span style={{ fontSize: 12, color: S.txt }}>{p.stock}</span>
              <span style={{ fontSize: 11, color: S.txt2 }}>{p.category}</span>
              <button 
                onClick={async () => { await deleteProduct(p.id); refresh(); }}
                style={{ fontSize: 11, color: S.red, background: S.redBg, border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }}>
                Remove
              </button>
            </div>
          ))}
        </Card>
      </div>
    );
  };

  const SellerOrdersSection = () => {
    return (
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr 1fr 1.2fr 1fr', gap: 8, padding: '6px 0', borderBottom: `0.5px solid ${S.border}`, marginBottom: 6 }}>
          {['Order', 'Product', 'Buyer', 'Amount', 'Status', 'Date', 'Action'].map(h => (
            <span key={h} style={{ fontSize: 10, color: S.txt3, fontWeight: 600, textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {dbOrders.map((o: any, i: number) => (
          <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr 1fr 1.2fr 1fr', gap: 8, padding: '10px 0', borderBottom: i < dbOrders.length - 1 ? `0.5px solid ${S.border}` : 'none', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: S.greenA }}>{o.id}</span>
            <span style={{ fontSize: 11, color: S.txt }}>{o.product}</span>
            <span style={{ fontSize: 11, color: S.txt2 }}>{o.buyer}</span>
            <span style={{ fontSize: 12, color: S.txt }}>{o.price}</span>
            <OrderBadge status={o.status} />
            <span style={{ fontSize: 11, color: S.txt3 }}>{o.date}</span>
            <button 
              onClick={async () => { await updateOrderStatus(data.myOrders[i].id, 'SHIPPED'); refresh(); }}
              style={{ fontSize: 10, color: '#fff', background: S.blue, border: 'none', borderRadius: 4, padding: '4px', cursor: 'pointer' }}>
              Ship
            </button>
          </div>
        ))}
        {dbOrders.length === 0 && <div style={{ padding: 20, color: S.txt2, textAlign: 'center' }}>No orders yet.</div>}
      </Card>
    );
  };

  const renderContent = () => {
    switch (active) {
      case 'overview':  return <OverviewSection onNav={setActive} />;
      case 'orders':    return <SellerOrdersSection />;
      case 'products':  return <SellerProductsSection />;
      case 'analytics': return <AnalyticsSection />;
      case 'wallet':    return <WalletSection />;
      default:          return <OverviewSection onNav={setActive} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: S.bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: 186, flexShrink: 0, background: S.sidebar, display: 'flex', flexDirection: 'column', padding: '16px 0' }}>
        <div style={{ padding: '0 16px 24px', fontSize: 15, fontWeight: 600, color: '#fff' }}>Seller<span style={{ color: S.greenL }}>Hub</span></div>
        <nav style={{ flex: 1 }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActive(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 16px', background: active === item.id ? 'rgba(255,255,255,0.15)' : 'transparent', color: active === item.id ? '#fff' : S.greenL, border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', transition: 'background 0.12s' }}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.15)' }}>
          <div style={{ fontSize: 12, color: S.greenL, marginBottom: 3 }}>{data.currentSeller?.storeName || 'Store'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.greenA }} />
            <div style={{ fontSize: 11, color: S.greenA }}>Active seller</div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: `0.5px solid ${S.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: S.txt }}>{TITLES[active]}</div>
          <a href="/" style={{ color: S.txt, fontSize: 13, textDecoration: 'none', padding: '6px 12px', background: S.card2, borderRadius: 6 }}>Exit to Market</a>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>{renderContent()}</div>
      </div>
    </div>
  );
}
