'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardStats, createProduct, deleteProduct, updateOrderStatus, updateProduct } from '../actions';

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
    Processing: [S.amberBg, S.amberD, S.amber],
  };
  const [bg, col, bdr] = m[status] ?? [S.blueBg, S.blueD, S.blue];
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: bg, color: col, border: `0.5px solid ${bdr}` }}>{status}</span>;
}

function OverviewSection({ onNav, data }: { onNav: (id: string) => void; data: any }) {
  const dailyRevenue = data.stats.dailyRevenue || [];
  const last7Days = dailyRevenue.slice(-7);
  const maxRev = Math.max(...last7Days.map((d: any) => d.amount)) || 1;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Products', value: data.stats.totalProducts?.toString() || '0' },
          { label: 'Orders', value: data.stats.totalOrders?.toString() || '0' },
          { label: 'Balance', value: (data.stats.balance || 0).toLocaleString() + ' EGP' },
          { label: 'Revenue', value: (data.stats.revenue || 0).toLocaleString() + ' EGP' },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: S.txt2, marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: S.txt }}>{s.value}</div>
          </Card>
        ))}
      </div>
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>Revenue — last 7 days</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 70 }}>
          {last7Days.map((d: any, i: number) => (
            <div key={i} style={{ flex: 1, height: `${Math.max(5, (d.amount / maxRev) * 100)}%`, background: S.green, borderRadius: '3px 3px 0 0' }} />
          ))}
          {last7Days.length === 0 && <div style={{ color: S.txt3, fontSize: 11, textAlign: 'center', width: '100%', paddingBottom: 20 }}>No recent revenue data</div>}
        </div>
      </Card>
    </div>
  );
}

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
  { id: 'wallet', label: 'Wallet' },
];

export default function SellerHubPage() {
  const [active, setActive] = useState('overview');
  const [data, setData] = useState<any>(null);

  const refresh = () => {
    getDashboardStats().then((res: any) => setData(res)).catch((e: any) => console.error(e));
  }

  useEffect(() => { refresh(); }, []);

  if (!data) return <div style={{ background: S.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading Data...</div>;

  const renderContent = () => {
    switch (active) {
      case 'overview':  return <OverviewSection onNav={setActive} data={data} />;
      case 'orders':    return <Card>Orders logic here</Card>;
      case 'products':  return <SellerProductsSection data={data} refresh={refresh} />;
      case 'wallet':    return <Card>Wallet logic here</Card>;
      default:          return <OverviewSection onNav={setActive} data={data} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: S.bg }}>
      <div style={{ width: 186, background: S.sidebar, color: '#fff' }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)} style={{ display: 'block', width: '100%', padding: 10 }}>{item.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>{renderContent()}</div>
    </div>
  );
}

function SellerProductsSection({ data, refresh }: { data: any; refresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const dbProducts = (data.myProducts || []).map((p: any) => ({
    id: p.id, name: p.title, sku: p.slug.substring(0, 8), price: p.basePrice, stock: 10
  }));

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await createProduct(new FormData(e.currentTarget));
    refresh();
    setAdding(false);
  };

  return (
    <div>
      <button onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : 'Add Product'}</button>
      {adding && (
        <Card>
          <form onSubmit={handleAdd}>
            <input name="title" required placeholder="Name" />
            <input name="price" required type="number" placeholder="Price" />
            <button type="submit">Save</button>
          </form>
        </Card>
      )}
      <Card>
        {dbProducts.map((p: any) => (
          <div key={p.id} style={{ padding: '8px 0', borderBottom: `0.5px solid ${S.border}` }}>
            {p.name} - {p.price} EGP
            <button onClick={async () => { await deleteProduct(p.id); refresh(); }}>Delete</button>
          </div>
        ))}
      </Card>
    </div>
  );
}
