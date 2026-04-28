'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardStats, createProduct, deleteProduct, updateOrderStatus, updateProduct } from '../actions';
import Link from 'next/link';
import { ChevronLeft, Plus, LayoutDashboard, ShoppingBag, Package, Wallet, RotateCcw, MessageSquare, ExternalLink } from '@/components/icons';

const S = {
  sidebar: '#0F6E56',
  sidebarText: '#9FE1CB',
  sidebarActive: 'rgba(255,255,255,0.15)',
  bg: '#f8faf9',
  card: '#ffffff',
  border: '#e5e7eb',
  txt: '#111827',
  txt2: '#4b5563',
  txt3: '#9ca3af',
  green: '#0F6E56',
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

function Card({ children, style, className = "" }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div 
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-[14px] font-bold text-gray-900">{children}</h3>
      {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
    </div>
  );
}

function OrderBadge({ status }: { status: string }) {
  const m: Record<string, [string, string, string]> = {
    New: [S.greenBg, S.greenD, S.green],
    Shipped: [S.blueBg, S.blueD, S.blue],
    Delivered: [S.greenBg, S.greenD, S.green],
    Processing: [S.amberBg, S.amberD, S.amber],
    CANCELLED: [S.redBg, S.redD, S.red],
  };
  const [bg, col, bdr] = m[status] ?? [S.blueBg, S.blueD, S.blue];
  return (
    <span 
      className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ background: bg, color: col, borderColor: bdr }}
    >
      {status}
    </span>
  );
}

const NAV = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
  { id: 'products', label: 'Products', icon: <Package size={18} /> },
  { id: 'wallet', label: 'Wallet', icon: <Wallet size={18} /> },
  { id: 'returns', label: 'Returns', icon: <RotateCcw size={18} /> },
  { id: 'reviews', label: 'Reviews', icon: <MessageSquare size={18} /> },
];

export default function SellerHubPage() {
  const [active, setActive] = useState('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    getDashboardStats()
      .then((res: any) => {
        setData(res);
        setLoading(false);
      })
      .catch((e: any) => {
        console.error(e);
        setError(e.message || "Failed to load dashboard data");
        setLoading(false);
      });
  }

  useEffect(() => { refresh(); }, []);

  if (loading) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0F6E56] text-white z-50">
      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
      <p className="font-bold tracking-widest uppercase text-xs">Syncing Brand Data...</p>
    </div>
  );

  if (error) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 mb-6 max-w-md">
        <h2 className="font-bold mb-2">Dashboard Error</h2>
        <p className="text-sm">{error}</p>
      </div>
      <div className="flex gap-4">
        <button onClick={refresh} className="bg-[#0F6E56] text-white px-6 py-2 rounded-lg font-bold text-sm">Try Again</button>
        <Link href="/" className="bg-white border border-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold text-sm">Back to Home</Link>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (active) {
      case 'overview':  return <OverviewSection onNav={setActive} data={data} />;
      case 'orders':    return <OrdersSection orders={data?.myOrders || []} />;
      case 'products':  return <SellerProductsSection data={data} refresh={refresh} />;
      case 'wallet':    return <WalletSection balance={data?.stats?.balance || 0} />;
      default:          return <OverviewSection onNav={setActive} data={data} />;
    }
  };

  const currentSeller = data?.currentSeller;

  return (
    <div className="flex h-screen bg-[#f8faf9] overflow-hidden">
      {/* Sidebar - Matching Design */}
      <div className="w-[200px] flex-shrink-0 bg-[#0F6E56] flex flex-col py-6 overflow-y-auto">
        <div className="px-5 mb-8">
          <Link href="/" className="text-white text-lg font-bold tracking-tight">
            Seller<span className="text-[#9FE1CB]">Hub</span>
          </Link>
        </div>

        <nav className="flex-1">
          {NAV.map(item => (
            <button 
              key={item.id} 
              onClick={() => setActive(item.id)} 
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                active === item.id 
                ? 'bg-white/15 text-white font-bold' 
                : 'text-[#9FE1CB] hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto px-5 py-4 border-t border-white/10">
          <div className="text-[12px] text-[#9FE1CB] font-bold mb-1 truncate">
            {currentSeller?.storeName || 'My Store'}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5DCAA5]"></div>
            <div className="text-[11px] text-[#5DCAA5] font-medium">Active seller</div>
          </div>
          <Link href="/" className="mt-4 flex items-center gap-2 text-[11px] text-white/60 hover:text-white transition-colors">
            <ExternalLink size={12} />
            View Marketplace
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{TITLES[active] || 'Dashboard'}</h1>
            <p className="text-sm text-gray-500">Welcome back, {currentSeller?.storeName}</p>
          </div>
          <div className="flex gap-3">
             {active === 'products' && (
               <button onClick={() => {}} className="bg-[#0F6E56] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                 <Plus size={16} /> Add Product
               </button>
             )}
             <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 border border-white shadow-sm overflow-hidden">
               {currentSeller?.logoUrl ? <img src={currentSeller.logoUrl} alt="logo" className="w-full h-full object-cover" /> : currentSeller?.storeName?.[0]}
             </div>
          </div>
        </header>

        {renderContent()}
      </div>
    </div>
  );
}

const TITLES: Record<string, string> = {
  overview: 'Dashboard Overview',
  orders: 'Order Management',
  products: 'Inventory & Products',
  wallet: 'Wallet & Payouts',
  returns: 'Returns Center',
  reviews: 'Customer Reviews'
};

function OverviewSection({ onNav, data }: { onNav: (id: string) => void; data: any }) {
  const stats = data?.stats || {};
  const dailyRevenue = stats.dailyRevenue || [
    { amount: 400 }, { amount: 600 }, { amount: 450 }, { amount: 800 }, { amount: 1000 }, { amount: 700 }, { amount: 550 }
  ];
  const maxRev = Math.max(...dailyRevenue.map((d: any) => d.amount)) || 1;

  return (
    <div className="space-y-6">
      {/* Stats Grid - Matching Design */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenue (March)', value: (stats.revenue || 0).toLocaleString() + ' EGP', trend: '+18% vs Feb', trendUp: true },
          { label: 'Orders', value: stats.totalOrders?.toString() || '0', trend: '+12 today', trendUp: true },
          { label: 'Wallet balance', value: (stats.balance || 0).toLocaleString() + ' EGP', trend: 'Available for payout', trendUp: null },
          { label: 'Active Products', value: stats.totalProducts?.toString() || '0', trend: '2 low stock', trendUp: false },
        ].map((s, i) => (
          <Card key={i} className="flex flex-col justify-between min-h-[110px]">
            <div>
              <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-2">{s.label}</div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            </div>
            {s.trend && (
              <div className={`text-[11px] mt-2 font-medium ${s.trendUp === true ? 'text-[#27500A]' : s.trendUp === false ? 'text-[#791F1F]' : 'text-gray-400'}`}>
                {s.trend}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart - Matching Design */}
        <Card>
          <SectionTitle subtitle="Earnings performance this week">Revenue — last 7 days</SectionTitle>
          <div className="flex items-end gap-2 h-[120px] mt-6">
            {dailyRevenue.map((d: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <div 
                  className="w-full bg-[#1D9E75] rounded-t-md transition-all group-hover:opacity-80 relative" 
                  style={{ height: `${Math.max(10, (d.amount / maxRev) * 100)}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {d.amount} EGP
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 font-bold">
                  {['M','T','W','T','F','S','S'][i]}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Performance Score - Matching Design */}
        <Card>
          <SectionTitle subtitle="How your store ranks on the platform">Performance score</SectionTitle>
          <div className="space-y-5 mt-4">
            {[
              { label: 'Shipping speed', val: '92%', color: '#1D9E75', width: '92%' },
              { label: 'Order acceptance', val: '98%', color: '#1D9E75', width: '98%' },
              { label: 'Return rate', val: '4%', color: '#E24B4A', width: '4%' },
              { label: 'Response time', val: '2.1h', color: '#EF9F27', width: '85%' },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="text-[12px] text-gray-600 font-medium w-[110px]">{p.label}</div>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: p.width, background: p.color }}></div>
                </div>
                <div className="text-[12px] font-bold text-gray-900 w-[36px] text-right">{p.val}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <SectionTitle>Recent Orders</SectionTitle>
            <button onClick={() => onNav('orders')} className="text-[11px] font-bold text-[#0F6E56] hover:underline uppercase tracking-wider">See all</button>
          </div>
          <div className="space-y-1">
            {data?.myOrders?.slice(0, 4).map((o: any) => (
              <div key={o.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 px-2 rounded-lg transition-colors cursor-pointer">
                <div>
                  <div className="text-[12px] font-bold text-gray-900">#{o.id.substring(0, 8)}</div>
                  <div className="text-[11px] text-gray-500">{o.totalAmount} EGP • {new Date(o.createdAt).toLocaleDateString()}</div>
                </div>
                <OrderBadge status={o.status} />
              </div>
            )) || <div className="text-center py-8 text-gray-400 text-sm italic">No recent orders</div>}
          </div>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <SectionTitle>Low Stock Alert</SectionTitle>
            <button onClick={() => onNav('products')} className="text-[11px] font-bold text-[#0F6E56] hover:underline uppercase tracking-wider">Manage</button>
          </div>
          <div className="space-y-1">
            {data?.myProducts?.filter((p:any) => true).slice(0, 4).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 px-2">
                <div>
                  <div className="text-[12px] font-bold text-gray-900">{p.title}</div>
                  <div className="text-[11px] text-gray-500">SKU-{p.id.substring(0, 6).toUpperCase()}</div>
                </div>
                <div className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded border border-red-100">
                  {Math.floor(Math.random() * 5) + 1} left
                </div>
              </div>
            )) || <div className="text-center py-8 text-gray-400 text-sm italic">Inventory healthy</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SellerProductsSection({ data, refresh }: { data: any; refresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const products = data?.myProducts || [];

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      basePrice: parseFloat(formData.get('price') as string),
      categoryId: data.categories?.[0]?.id,
    };
    await createProduct(payload);
    refresh();
    setAdding(false);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      basePrice: parseFloat(formData.get('price') as string),
    };
    await updateProduct(editing.id, payload);
    refresh();
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">All Products ({products.length})</h3>
        <button 
          onClick={() => { setAdding(!adding); setEditing(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
            adding ? 'bg-gray-100 text-gray-600' : 'bg-[#0F6E56] text-white shadow-sm hover:opacity-90'
          }`}
        >
          {adding ? 'Cancel' : <><Plus size={16} /> Add Product</>}
        </button>
      </div>

      {(adding || editing) && (
        <Card className="max-w-xl animate-fadeIn border-[#0F6E56]/20 shadow-md">
          <SectionTitle>{editing ? `Edit Product: ${editing.title}` : 'Add New Product'}</SectionTitle>
          <form onSubmit={editing ? handleUpdate : handleAdd} className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Product Title</label>
              <input name="title" defaultValue={editing?.title} required placeholder="e.g. Premium Leather Bag" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#0F6E56]" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Description</label>
              <textarea name="description" defaultValue={editing?.description} required placeholder="Describe your product..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#0F6E56] h-24" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Price (EGP)</label>
              <input name="price" defaultValue={editing?.basePrice} required type="number" placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#0F6E56]" />
            </div>
            <div className="flex gap-3 mt-2">
              <button type="submit" className="flex-1 bg-[#0F6E56] text-white font-bold py-2.5 rounded-lg shadow-sm hover:opacity-95 transition-opacity">
                {editing ? 'Update Changes' : 'Save Product'}
              </button>
              {editing && (
                <button type="button" onClick={() => setEditing(null)} className="px-6 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Product Info</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-md border border-gray-200 overflow-hidden flex-shrink-0">
                      {p.images?.[0] ? <img src={p.images[0].url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20} /></div>}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{p.title}</div>
                      <div className="text-[10px] text-gray-400 font-medium uppercase">SKU-{p.id.substring(0, 6)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-bold text-[#0F6E56] bg-[#E1F5EE] px-2 py-0.5 rounded-full border border-[#9FE1CB]/30">{p.category?.name || 'General'}</span>
                </td>
                <td className="px-6 py-4 font-bold text-sm text-gray-900">{p.basePrice.toLocaleString()} EGP</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditing(p); setAdding(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="p-2 text-gray-400 hover:text-[#0F6E56] transition-colors"
                      title="Edit Product"
                    >
                      <Plus size={16} />
                    </button>
                    <button 
                      onClick={async () => { if(confirm('Permanently delete this product?')) { await deleteProduct(p.id); refresh(); } }}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Product"
                    >
                      <RotateCcw size={16} className="rotate-45" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                  No products found. Start by adding your first product.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function OrdersSection({ orders, refresh }: { orders: any[]; refresh: () => void }) {
  const handleStatusChange = async (orderId: string, status: any) => {
    await updateOrderStatus(orderId, status);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">Order Management ({orders.length})</h3>
        <div className="flex gap-2">
           <input type="text" placeholder="Search orders..." className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#0F6E56]" />
        </div>
      </div>
      
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-400 text-[11px] uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-4 font-bold text-gray-400 text-[11px] uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 font-bold text-gray-400 text-[11px] uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 font-bold text-gray-400 text-[11px] uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 font-bold text-gray-400 text-[11px] uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 font-bold text-gray-400 text-[11px] uppercase tracking-wider text-right">Update Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-gray-700">
            {orders.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-bold">#{o.id.substring(0, 8)}</td>
                <td className="px-6 py-4 font-medium">{o.user?.name || 'Guest'}</td>
                <td className="px-6 py-4">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-bold">{o.totalAmount.toLocaleString()} EGP</td>
                <td className="px-6 py-4"><OrderBadge status={o.status} /></td>
                <td className="px-6 py-4 text-right">
                  <select 
                    defaultValue={o.status}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    className="text-[11px] font-bold bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#0F6E56]"
                  >
                    <option value="CONFIRMED">Confirm</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancel</option>
                  </select>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No orders received yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function WalletSection({ balance }: { balance: number }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#0F6E56] text-white border-none shadow-lg p-8 relative overflow-hidden">
          <div className="relative z-10">
             <div className="text-[#9FE1CB] text-xs font-bold uppercase tracking-widest mb-4">Available Balance</div>
             <div className="text-4xl font-bold mb-8">{balance.toLocaleString()} <span className="text-xl font-normal opacity-70 text-[#9FE1CB]">EGP</span></div>
             <button className="bg-white text-[#0F6E56] px-8 py-3 rounded-xl font-bold text-sm shadow-xl hover:bg-[#9FE1CB] transition-colors">Withdraw Funds</button>
          </div>
          {/* Decorative Circle */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full"></div>
          <div className="absolute right-10 top-5 w-20 h-20 bg-white/5 rounded-full"></div>
        </Card>

        <Card className="flex flex-col justify-center p-8">
          <SectionTitle subtitle="Next automatic payout: Apr 15, 2026">Payout Schedule</SectionTitle>
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
               <span className="text-sm text-gray-500">Processing Fee</span>
               <span className="text-sm font-bold text-gray-900">0.00 EGP</span>
            </div>
            <div className="flex justify-between items-center py-2">
               <span className="text-sm text-gray-500">Estimated Payout</span>
               <span className="text-sm font-bold text-[#0F6E56]">{balance.toLocaleString()} EGP</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle>Recent Transactions</SectionTitle>
        <div className="text-center py-12 text-gray-400 text-sm italic">No recent payout history.</div>
      </Card>
    </div>
  );
}
