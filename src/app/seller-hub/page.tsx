'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard,
  ShoppingBag,
  Package,
  BarChart3,
  Wallet,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Star,
  Users
} from 'lucide-react';
import { 
  getDashboardStats, 
  createProduct, 
  deleteProduct, 
  updateOrderItemStatus 
} from '../actions/seller';
import { 
  Product, 
  Order, 
  Category, 
  SellerProfile, 
  SessionUser,
  ProductVariant,
  ProductImage,
  Tag,
  Collection
} from '@/types';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  balance: number;
  revenue: number;
  dailyRevenue: number[];
  avgRating: number;
  reviewCount: number;
  todayOrdersCount: number;
  thisMonthRevenue: number;
  monthlyChangePct: number;
  performance: {
    orderAcceptance: number;
    returnRate: number;
    shippingSpeed: number;
  };
}

interface DashboardData {
  currentSeller?: SellerProfile;
  myProducts?: Product[];
  myOrders?: Order[];
  stats?: DashboardStats;
  categories?: Category[];
  tags?: Tag[];
  collections?: Collection[];
  error?: string;
}

interface NewProductState {
  title: string;
  description: string;
  basePrice: string | number;
  flashSalePrice: string | number;
  categoryId: string;
}

interface VariantState {
  color: string;
  stock: number;
  price: string | number;
  image: string;
  uploading?: boolean;
}

export default function SellerHub() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<NewProductState>({ title: '', description: '', basePrice: '', flashSalePrice: '', categoryId: '' });
  const [editVariants, setEditVariants] = useState<VariantState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Access control - redirect if not seller
  useEffect(() => {
    const role = (session?.user as SessionUser | undefined)?.role;
    if (session && role === 'ADMIN') {
      router.push('/admin');
    } else if (session && role === 'BUYER') {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditProduct({
      title: product.title || '',
      description: product.description || '',
      basePrice: product.basePrice || '',
      flashSalePrice: product.flashSalePrice || '',
      categoryId: product.categoryId || ''
    });
    setEditVariants(product.variants?.map((v: ProductVariant) => ({
      color: (JSON.parse(v.attributes || '{}') as { color?: string }).color || v.title || '',
      stock: v.stockCount || 0,
      price: v.price || '',
      image: (product.images?.find(img => img.isPrimary) || product.images?.[0])?.url || ''
    })) || []);
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!editProduct.categoryId) throw new Error("Please select a category");
      if (!editProduct.basePrice || Number(editProduct.basePrice) <= 0) throw new Error("Base price is required");
      if (editVariants.some((v: VariantState) => !v.price || Number(v.price) <= 0)) throw new Error("All variant prices are required");
      
      if (!editingProduct) return;

      // Call API to update
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editProduct,
          basePrice: Number(editProduct.basePrice),
          variants: editVariants.map((v: VariantState) => ({
            color: v.color,
            stock: Number(v.stock),
            price: Number(v.price)
          }))
        })
      });
      
      if (!res.ok) throw new Error("Failed to update product");
      
      setShowEditModal(false);
      setEditingProduct(null);
      await refreshData();
    } catch (error: unknown) {
      const err = error as Error;
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [newProduct, setNewProduct] = useState<NewProductState>({ 
    title: '', 
    description: '', 
    basePrice: '', 
    flashSalePrice: '',
    categoryId: ''
  });
  
  const [variants, setVariants] = useState<VariantState[]>([
    { color: 'Default', stock: 10, price: '', image: '' }
  ]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await getDashboardStats() as DashboardData;
      if (!res) {
        window.location.href = '/login?callbackUrl=/seller-hub';
        return;
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      setData(res);
    } catch (error: unknown) {
      const err = error as Error;
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show an immediate preview using a local object URL — much cheaper than
    // base64 and avoids the FileReader race condition.
    const previewUrl = URL.createObjectURL(file);
    setVariants((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], image: previewUrl, uploading: true };
      return next;
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({} as { url?: string; message?: string }));

      if (!res.ok || !data.url) {
        throw new Error(data.message || 'Upload failed');
      }

      // Swap the local preview for the uploaded URL.
      setVariants((prev) => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], image: data.url, uploading: false };
        return next;
      });
    } catch (err) {
      console.error('Upload failed:', err);
      // Mark as not uploading but keep the local preview so the user can
      // re-upload without losing what they already selected.
      setVariants((prev) => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], uploading: false };
        return next;
      });
    } finally {
      // The object URL is kept alive while the preview is shown; it'll be
      // garbage-collected when the component unmounts.
    }
  };

  const addVariant = () => {
    setVariants([...variants, { color: '', stock: 0, price: 0, image: '' }]);
  };

  const updateVariant = <K extends keyof VariantState>(
    index: number,
    field: K,
    value: VariantState[K]
  ) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setVariants(updatedVariants);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!newProduct.categoryId) throw new Error("Please select a category");
      if (!newProduct.basePrice || Number(newProduct.basePrice) <= 0) throw new Error("Base price is required");
      if (variants.some((v: VariantState) => !v.price || Number(v.price) <= 0)) throw new Error("All variant prices are required");
      
      const res = await createProduct({
        ...newProduct,
        basePrice: Number(newProduct.basePrice),
        flashSalePrice: Number(newProduct.flashSalePrice) > 0 ? Number(newProduct.flashSalePrice) : undefined,
        variants: variants.map(v => ({
           ...v,
           stock: Number(v.stock),
           price: Number(v.price) || Number(newProduct.basePrice)
        })),
        published: true
      }) as { error?: string };

      if (res?.error) {
        alert(res.error);
        return;
      }

      setShowAddModal(false);
      resetForm();
      await refreshData();
    } catch (error: unknown) {
      const err = error as Error;
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await deleteProduct(id) as { error?: string };
      if (res?.error) {
        alert(res.error);
        return;
      }
      await refreshData();
    } catch (error: unknown) {
      const err = error as Error;
      alert(err.message);
    }
  };

  const handleFulfill = async (itemId: string) => {
    try {
      const res = await updateOrderItemStatus(itemId, 'SHIPPED') as { error?: string };
      if (res?.error) {
        alert(res.error);
        return;
      }
      await refreshData();
    } catch (error: unknown) {
      const err = error as Error;
      alert(err.message);
    }
  };

  const resetForm = () => {
      setNewProduct({ title: '', description: '', basePrice: '', flashSalePrice: '', categoryId: '' });
      setVariants([{ color: 'Default', stock: 10, price: '', image: '' }]);
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (loading && !data) return <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-[#0F6E56] font-medium">Loading SellerHub...</div>;
  if (error) return <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-red-600 font-bold">{error}</div>;

  const stats: DashboardStats = data?.stats || {
    totalProducts: 0,
    totalOrders: 0,
    balance: 0,
    revenue: 0,
    dailyRevenue: [],
    avgRating: 0,
    reviewCount: 0,
    todayOrdersCount: 0,
    thisMonthRevenue: 0,
    monthlyChangePct: 0,
    performance: {
      orderAcceptance: 100,
      returnRate: 0,
      shippingSpeed: 95
    }
  };
  const myProducts = data?.myProducts || [];
  const myOrders = data?.myOrders || [];

  return (
    <div className="db">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo flex items-center gap-2 px-4 py-4 text-white font-black text-base">
          <ShoppingBag size={20} />
          <span>SellerHub</span>
        </div>
        
        <NavItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" icon={<LayoutDashboard size={18} />} />
        <NavItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} label="Orders" icon={<Package size={18} />} />
        <NavItem active={activeTab === 'products'} onClick={() => setActiveTab('products')} label="Inventory" icon={<ShoppingBag size={18} />} />
        <NavItem active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} label="Analytics" icon={<BarChart3 size={18} />} />
        <NavItem active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} label="Wallet" icon={<Wallet size={18} />} />
        <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Settings" icon={<Settings size={18} />} />

        <div className="mt-auto px-4 pb-6">
           <div className="store-label truncate max-w-full">{data?.currentSeller?.storeName || 'Store'}</div>
           <div className="active-dot-row flex items-center gap-2 text-[10px] text-white/60">
              <div className="active-dot w-2 h-2 rounded-full bg-green-400"></div>
              Active seller
           </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="main">
        <div className="topbar">
          <div className="page-title">{TITLES[activeTab] || 'Dashboard'}</div>
          <button className="add-product-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add product
          </button>
        </div>

        <div className="tab-content animate-fadeIn">
          {activeTab === 'overview' && <OverviewTab stats={stats} myOrders={myOrders} myProducts={myProducts} data={data!} />}
          {activeTab === 'orders' && <OrdersTab orders={myOrders} onFulfill={handleFulfill} />}
          {activeTab === 'products' && <ProductsTab products={myProducts} onDelete={handleDeleteProduct} onAdd={() => setShowAddModal(true)} onEdit={handleEditProduct} />}
          {activeTab === 'analytics' && <AnalyticsTab stats={stats} orders={myOrders} />}
          {activeTab === 'wallet' && <WalletTab data={data!} />}
          {activeTab === 'settings' && <SettingsTab data={data!} />}
        </div>
      </div>

      {/* Modals remain same but use Lucide for close/etc */}
      {showAddModal && (
        <AddProductModal 
          onClose={() => setShowAddModal(false)} 
          onSubmit={handleCreateProduct}
          newProduct={newProduct}
          setNewProduct={setNewProduct}
          variants={variants}
          setVariants={setVariants}
          categories={data?.categories}
          isSubmitting={isSubmitting}
          handleImageUpload={handleImageUpload}
          addVariant={addVariant}
          updateVariant={updateVariant}
        />
      )}

      {/* Edit Modal truncated for brevity but assuming same logic */}
      {showEditModal && editingProduct && (
        <div className="modal-overlay fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
          <div className="modal-content bg-white w-full max-w-2xl rounded-2xl p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Edit Product</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-900"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleUpdateProduct} className="flex flex-col gap-6">
              {/* Form fields... */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Title</label>
                  <input required type="text" value={editProduct.title} onChange={e => setEditProduct({...editProduct, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Category</label>
                  <select required value={editProduct.categoryId} onChange={e => setEditProduct({...editProduct, categoryId: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="">Select Category...</option>
                    {data?.categories?.map((c: Category) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Base Price (EGP)</label>
                  <input required type="number" value={editProduct.basePrice} onChange={e => setEditProduct({...editProduct, basePrice: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 border border-gray-100 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-[#0F6E56] text-white rounded-xl font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        * { box-sizing: border-box; }
        /* Whole page scrolls naturally — sidebar stays in view via position:sticky,
           main content grows as tall as it needs to. */
        .db { display: flex; min-height: 100vh; background: #f8fafc; }
        .sidebar { width: 200px; min-width: 200px; background: #0F6E56; padding: 0; display: flex; flex-direction: column; flex-shrink: 0; position: sticky; top: 0; align-self: flex-start; max-height: 100vh; overflow-y: auto; }
        .main { flex: 1; min-width: 0; display: flex; flex-direction: column; padding-bottom: 32px; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; position: sticky; top: 0; z-index: 5; }
        .page-title { font-size: 18px; font-weight: 900; color: #0f172a; }
        .add-product-btn { background: #0F6E56; color: #fff; padding: 8px 16px; border-radius: 12px; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px; border: none; cursor: pointer; }
        .add-product-btn:hover { opacity: 0.9; }
        .tab-content { display: flex; flex-direction: column; padding: 16px 20px 16px; gap: 12px; }
        .overview-wrap { display: flex; flex-direction: column; gap: 12px; }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .bottom-row { display: grid; grid-template-columns: 2fr 1fr; gap: 10px; }
        .chart-card { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.04); padding: 16px; display: flex; flex-direction: column; }
        .chart-bars { display: flex; align-items: flex-end; gap: 6px; min-height: 180px; }
        .health-card { background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.04); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        @media (max-width: 900px) {
          .db { flex-direction: column; }
          .sidebar { width: 100%; min-width: 0; max-height: none; position: static; flex-direction: row; flex-wrap: wrap; padding: 8px; gap: 4px; overflow-x: auto; overflow-y: visible; }
          .sidebar .nav-item { padding: 6px 10px !important; font-size: 12px !important; }
          .sidebar .logo { padding: 8px 12px !important; }
          .topbar { position: static; }
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .bottom-row { grid-template-columns: 1fr; }
          .chart-bars { min-height: 140px; }
        }
        .nav-item { padding: 10px 16px; color: #fff; opacity: 0.7; transition: 0.2s; cursor: pointer; display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 13px; }
        .nav-item:hover { opacity: 1; background: rgba(255,255,255,0.05); }
        .nav-item.active { opacity: 1; background: rgba(255,255,255,0.1); font-weight: 700; border-right: 4px solid #4ADE80; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

const TITLES: Record<string, string> = {
  overview: 'Dashboard',
  products: 'Inventory',
  orders: 'Orders',
  analytics: 'Analytics',
  wallet: 'Wallet',
  settings: 'Store Settings'
};

function NavItem({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <div onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>
      {icon}
      {label}
    </div>
  );
}

function OverviewTab({ stats, myOrders, myProducts, data }: OverviewTabProps) {
  return (
    <div className="overview-wrap">
      {/* Top Stats Row */}
      <div className="stats-row">
        <StatCard
          label="Total Revenue"
          value={`${stats.revenue.toLocaleString()} EGP`}
          subText={`${stats.monthlyChangePct > 0 ? '+' : ''}${stats.monthlyChangePct}% from last month`}
          trend={stats.monthlyChangePct >= 0 ? 'up' : 'down'}
          icon={<TrendingUp className="text-emerald-500" size={16} />}
        />
        <StatCard
          label="Orders"
          value={stats.totalOrders.toString()}
          subText={`${stats.todayOrdersCount} today`}
          trend="neutral"
          icon={<ShoppingBag className="text-blue-500" size={16} />}
        />
        <StatCard
          label="Available Balance"
          value={`${stats.balance.toLocaleString()} EGP`}
          subText="Ready for withdrawal"
          trend="neutral"
          icon={<Wallet className="text-orange-500" size={16} />}
        />
        <StatCard
          label="Store Rating"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'New'}
          subText={`${stats.reviewCount} total reviews`}
          trend="up"
          icon={<Star className="text-yellow-500 fill-yellow-500" size={16} />}
        />
      </div>

      {/* Bottom stretch row */}
      <div className="bottom-row">
        {/* Chart */}
        <div className="chart-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexShrink:0}}>
            <span style={{fontWeight:900,fontSize:14}}>Weekly Performance</span>
            <span style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:700,color:'#94a3b8'}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#10b981',display:'inline-block'}}></span>Revenue
            </span>
          </div>
          <div className="chart-bars">
            {stats.dailyRevenue.map((val, i) => {
              const max = Math.max(...stats.dailyRevenue, 1);
              const pct = (val / max) * 100;
              return (
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,minWidth:0,height:'100%'}}>
                  <div style={{width:'100%',flex:1,background:'#ecfdf5',borderRadius:8,position:'relative',minHeight:20}} className="group">
                    <div style={{position:'absolute',bottom:0,left:0,width:'100%',height:`${pct}%`,background:'#10b981',borderRadius:8,transition:'height 0.6s ease'}} />
                    <div style={{position:'absolute',top:-28,left:'50%',transform:'translateX(-50%)',background:'#0f172a',color:'#fff',fontSize:9,padding:'2px 6px',borderRadius:4,whiteSpace:'nowrap',pointerEvents:'none',opacity:0}} className="group-hover:opacity-100 transition-opacity">
                      {val.toLocaleString()} EGP
                    </div>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase'}}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][(new Date().getDay() + i + 1) % 7]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Health */}
        <div className="health-card">
          <span style={{fontWeight:900,fontSize:14,flexShrink:0}}>Operational Health</span>
          <div style={{display:'flex',flexDirection:'column',gap:10,flex:1}}>
            <MetricRow label="Order Acceptance" value={stats.performance.orderAcceptance} color="#0F6E56" icon={<CheckCircle2 size={14} />} />
            <MetricRow label="Shipping Speed" value={stats.performance.shippingSpeed} color="#3B82F6" icon={<Clock size={14} />} />
            <MetricRow label="Return Rate" value={stats.performance.returnRate} color="#EF4444" inverse icon={<XCircle size={14} />} />
          </div>
          <div style={{paddingTop:12,borderTop:'1px solid #f8fafc',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:11,fontWeight:700,color:'#94a3b8',marginBottom:6}}>
              <span>Account Status</span>
              <span style={{color:'#10b981',textTransform:'uppercase'}}>{data.currentSeller?.status}</span>
            </div>
            <div style={{width:'100%',height:6,background:'#f8fafc',borderRadius:99,overflow:'hidden'}}>
              <div style={{height:'100%',width:'100%',background:'#10b981'}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subText, trend, icon }: { label: string, value: string, subText: string, trend: 'up' | 'down' | 'neutral', icon: React.ReactNode }) {
  return (
    <div style={{background:'#fff',padding:'12px 14px',borderRadius:16,border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <div style={{width:28,height:28,borderRadius:10,background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center'}}>{icon}</div>
        {trend !== 'neutral' && (
          <span style={{fontSize:9,fontWeight:900,padding:'2px 7px',borderRadius:99,background:trend==='up'?'#ecfdf5':'#fef2f2',color:trend==='up'?'#10b981':'#ef4444'}}>
            {trend === 'up' ? '▲' : '▼'}
          </span>
        )}
      </div>
      <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:2}}>{label}</div>
      <div style={{fontSize:16,fontWeight:900,color:'#0f172a',marginBottom:2,lineHeight:1.2}}>{value}</div>
      <div style={{fontSize:10,color:'#94a3b8',fontWeight:500}}>{subText}</div>
    </div>
  );
}

function MetricRow({ label, value, color, inverse = false, icon }: { label: string, value: number, color: string, inverse?: boolean, icon: React.ReactNode }) {
  const isGood = inverse ? value <= 5 : value >= 90;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-600">
           {icon} {label}
        </div>
        <span className={`font-black ${isGood ? 'text-emerald-500' : 'text-amber-500'}`}>{value}%</span>
      </div>
      <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
        <div className="h-full transition-all duration-1000" style={{width: `${value}%`, backgroundColor: color}}></div>
      </div>
    </div>
  );
}

// Sub-tabs simplified for this view
function OrdersTab({ orders, onFulfill }: { orders: Order[], onFulfill: (id: string) => void }) {
  const orderItems = orders.flatMap(o => (o.items || []).map(i => ({...i, orderId: o.id, date: o.createdAt})));
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
          <tr>
            <th className="px-6 py-4">Item</th>
            <th className="px-6 py-4">Order ID</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {orderItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="text-sm font-bold text-slate-900">{item.productTitleSnapshot}</div>
                <div className="text-[11px] text-slate-400">{new Date(item.date).toLocaleDateString()}</div>
              </td>
              <td className="px-6 py-4 text-xs font-mono text-slate-500">#{item.orderId.slice(0, 8)}</td>
              <td className="px-6 py-4">
                 <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${item.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{item.status}</span>
              </td>
              <td className="px-6 py-4 text-right">
                {item.status === 'PENDING' && (
                  <button onClick={() => onFulfill(item.id)} className="text-xs font-bold text-[#0F6E56] hover:underline">Fulfill</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orderItems.length === 0 && <div className="p-20 text-center text-slate-400 text-sm">No orders to show.</div>}
    </div>
  );
}

function ProductsTab({ products, onDelete, onAdd, onEdit }: { products: Product[], onDelete: (id: string) => void, onAdd: () => void, onEdit: (p: Product) => void }) {
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out' | 'low'>('all');

  const q = search.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (q) {
      const hay = `${p.title || ''} ${p.id || ''} ${p.category?.name || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const stock = (p.variants || []).reduce((a, b) => a + (b.stockCount || 0), 0);
    if (stockFilter === 'in'  && stock <= 0)            return false;
    if (stockFilter === 'out' && stock !== 0)           return false;
    if (stockFilter === 'low' && (stock === 0 || stock > 5)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
        <div className="relative flex-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, category or ID…"
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-base px-1"
            >×</button>
          )}
        </div>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All stock</option>
          <option value="in">In stock</option>
          <option value="low">Low stock (≤5)</option>
          <option value="out">Out of stock</option>
        </select>
        <div className="text-xs text-slate-500 whitespace-nowrap px-1">
          {filtered.length} / {products.length}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          {q ? `No products match "${search}".` : 'No products yet — add your first one.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product) => {
            const stock = (product.variants || []).reduce((a, b) => a + (b.stockCount || 0), 0);
            return (
              <div key={product.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 group">
                <div className="aspect-square rounded-xl bg-slate-50 mb-4 overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                  <img src={product.images?.[0]?.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => onEdit(product)} aria-label="Edit product" className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-blue-500 hover:bg-white"><Settings size={14} /></button>
                    <button onClick={() => onDelete(product.id)} aria-label="Delete product" className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-red-500 hover:bg-white"><Trash2 size={14} /></button>
                  </div>
                  {stock === 0 && (
                    <span className="absolute bottom-2 left-2 text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-md uppercase">Out of stock</span>
                  )}
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1 truncate">{product.title}</h4>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-emerald-600">{product.basePrice} EGP</span>
                  <span className={`font-bold ${stock === 0 ? 'text-red-500' : stock <= 5 ? 'text-amber-500' : 'text-slate-400'}`}>{stock} in stock</span>
                </div>
              </div>
            );
          })}
          <button onClick={onAdd} className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-slate-400 hover:border-emerald-300 hover:bg-emerald-50 transition-all gap-2 min-h-[200px]">
            <Plus size={32} />
            <span className="text-sm font-bold">Add Product</span>
          </button>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ stats, orders }: { stats: DashboardStats, orders: Order[] }) {
  // Compute product-wise top-sellers & status breakdown from real data
  const totalRevenue = stats.revenue;
  const avgOrderValue = orders.length > 0
    ? totalRevenue / orders.length
    : 0;

  const statusBreakdown = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const topProducts = (() => {
    const map = new Map<string, { title: string, count: number, revenue: number }>();
    for (const o of orders) {
      for (const item of o.items || []) {
        const key = item.productTitleSnapshot;
        const entry = map.get(key) || { title: key, count: 0, revenue: 0 };
        entry.count += item.quantity;
        entry.revenue += item.priceAtPurchase * item.quantity;
        map.set(key, entry);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Revenue</div>
          <div className="text-3xl font-black text-slate-900">{totalRevenue.toLocaleString()} EGP</div>
          <div className="text-[11px] text-slate-400 mt-2">
            {stats.monthlyChangePct > 0 ? '+' : ''}{stats.monthlyChangePct}% MoM
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Order Value</div>
          <div className="text-3xl font-black text-slate-900">{Math.round(avgOrderValue).toLocaleString()} EGP</div>
          <div className="text-[11px] text-slate-400 mt-2">Across {orders.length} orders</div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Store Rating</div>
          <div className="text-3xl font-black text-slate-900">
            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'New'}
            <span className="text-yellow-500 ml-1">★</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">{stats.reviewCount} reviews</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
          <h3 className="font-black text-lg mb-6">Order Status Breakdown</h3>
          {Object.entries(statusBreakdown).length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No orders to analyze yet.</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(statusBreakdown).map(([status, count]) => {
                const pct = Math.round((count / orders.length) * 100);
                return (
                  <div key={status}>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-slate-600">{status}</span>
                      <span className="text-slate-400">{count} orders ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
          <h3 className="font-black text-lg mb-6">Top Products</h3>
          {topProducts.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No sales data yet.</div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.title} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black flex items-center justify-center">{i + 1}</div>
                    <div className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{p.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">{Math.round(p.revenue).toLocaleString()} EGP</div>
                    <div className="text-[10px] text-slate-400">{p.count} units sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WalletTab({ data }: { data: DashboardData }) {
  const [balance, setBalance] = useState(data?.currentSeller?.balance || 0);
  const [payouts, setPayouts] = useState<Array<{ id: string; amount: number; status: string; bankDetails: string | null; createdAt: string }>>([]);
  const [bankAccount, setBankAccount] = useState(data?.currentSeller?.bankAccount || '');
  const [requestAmount, setRequestAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPayouts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/payouts/request');
      if (res.ok) {
        const d = await res.json();
        setBalance(d.balance || 0);
        setPayouts(d.payouts || []);
        if (d.bankAccount) setBankAccount(d.bankAccount);
      }
    } catch {
      // swallow
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadPayouts(); }, []);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsRequesting(true);
    try {
      const amount = requestAmount ? Number(requestAmount) : undefined;
      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, bankDetails: bankAccount || undefined }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: d.message || 'Request failed' });
      } else {
        setMessage({ type: 'success', text: 'Payout request submitted! It will be processed shortly.' });
        setRequestAmount('');
        await loadPayouts();
      }
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Available Balance</div>
              <div className="text-4xl font-black text-emerald-600">{balance.toLocaleString()} <span className="text-lg text-slate-400">EGP</span></div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <Wallet className="text-emerald-600" />
            </div>
          </div>

          <form onSubmit={handleRequestPayout} className="border-t border-slate-50 pt-6 space-y-4">
            <h3 className="font-black text-sm">Request Payout</h3>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Amount (EGP) — leave empty to withdraw full balance</label>
              <input
                type="number"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                placeholder={`Max: ${balance.toFixed(2)}`}
                min="1"
                max={balance}
                step="0.01"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Bank Account / IBAN</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="e.g. NBE-EG12-3456-7890..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            {message && (
              <div className={`px-4 py-3 rounded-xl text-xs font-bold ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>{message.text}</div>
            )}
            <button
              type="submit"
              disabled={isRequesting || balance <= 0}
              className="w-full py-3 bg-[#0F6E56] text-white rounded-xl font-bold disabled:opacity-50"
            >
              {isRequesting ? 'Submitting...' : 'Request Payout'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-black text-sm mb-4">Your Commission Rate</h3>
          <div className="text-3xl font-black text-slate-900">
            {((data?.currentSeller?.commissionRate || 0.15) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Platform fee per order</div>
          <div className="mt-6 pt-6 border-t border-slate-50 text-[11px] text-slate-500 leading-relaxed">
            Payouts are held in escrow for 7 days after delivery to allow for returns. After clearance, funds are available for withdrawal.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h3 className="font-black text-sm">Payout History</h3>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-400">Loading history…</div>
        ) : payouts.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">No payouts yet.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Bank</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-3 font-black text-slate-900">{p.amount.toLocaleString()} EGP</td>
                  <td className="px-6 py-3 text-xs text-slate-400 truncate max-w-[160px]">{p.bankDetails || '—'}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                      p.status === 'PAID' ? 'bg-emerald-50 text-emerald-600'
                      : p.status === 'PENDING' ? 'bg-amber-50 text-amber-600'
                      : p.status === 'PROCESSING' ? 'bg-blue-50 text-blue-600'
                      : 'bg-slate-50 text-slate-500'
                    }`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SettingsTab({ data }: { data: DashboardData }) {
  const [form, setForm] = useState({
    storeName: data?.currentSeller?.storeName || '',
    description: data?.currentSeller?.description || '',
    logoUrl: data?.currentSeller?.logoUrl || '',
    city: data?.currentSeller?.city || '',
    governorate: data?.currentSeller?.governorate || '',
    bankAccount: data?.currentSeller?.bankAccount || '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await res.json();
      if (d.url) setForm((f) => ({ ...f, logoUrl: d.url }));
    } catch (err) {
      console.error('Logo upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/seller/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: d.message || 'Update failed' });
      } else {
        setMessage({ type: 'success', text: 'Settings saved successfully.' });
      }
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm space-y-6">
        <h3 className="font-black text-lg">Store Settings</h3>

        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Store logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-slate-300">🏪</span>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Store Logo</label>
            <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} className="text-xs" />
            {isUploading && <div className="text-[10px] text-slate-400 mt-1">Uploading…</div>}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Store Name</label>
          <input
            required
            type="text"
            value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Description</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            placeholder="Tell customers what makes your store unique..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Governorate</label>
            <input
              type="text"
              value={form.governorate}
              onChange={(e) => setForm({ ...form, governorate: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Bank Account / IBAN for Payouts</label>
          <input
            type="text"
            value={form.bankAccount}
            onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
            placeholder="Enter your IBAN or account details"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
          />
          <div className="text-[11px] text-slate-400 mt-1">This info is stored securely and only visible to admins during payout processing.</div>
        </div>

        {message && (
          <div className={`px-4 py-3 rounded-xl text-xs font-bold ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>{message.text}</div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3 bg-[#0F6E56] text-white rounded-xl font-bold disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

interface AddProductModalProps {
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  newProduct: NewProductState;
  setNewProduct: (p: NewProductState) => void;
  variants: VariantState[];
  setVariants: (v: VariantState[]) => void;
  categories?: Category[];
  isSubmitting: boolean;
  handleImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  addVariant: () => void;
  updateVariant: <K extends keyof VariantState>(index: number, field: K, value: VariantState[K]) => void;
}

function AddProductModal({
  onClose,
  onSubmit,
  newProduct,
  setNewProduct,
  variants,
  setVariants,
  categories,
  isSubmitting,
  handleImageUpload,
  addVariant,
  updateVariant,
}: AddProductModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl p-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black">New Product</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <XCircle size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Title</label>
              <input
                required
                type="text"
                value={newProduct.title}
                onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Description</label>
              <textarea
                rows={3}
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Category</label>
              <select
                required
                value={newProduct.categoryId}
                onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">Select Category...</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Base Price (EGP)</label>
              <input
                required
                type="number"
                min="1"
                value={newProduct.basePrice}
                onChange={(e) => setNewProduct({ ...newProduct, basePrice: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold text-gray-500 uppercase">Variants</label>
              <button type="button" onClick={addVariant} className="text-xs font-bold text-emerald-600 hover:underline">
                + Add variant
              </button>
            </div>
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-xl p-3">
                  <input
                    type="text"
                    value={v.color}
                    onChange={(e) => updateVariant(i, 'color', e.target.value)}
                    placeholder="Color / Variant"
                    className="col-span-3 px-3 py-2 bg-white border border-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    value={v.stock}
                    onChange={(e) => updateVariant(i, 'stock', Number(e.target.value))}
                    placeholder="Stock"
                    min="0"
                    className="col-span-2 px-3 py-2 bg-white border border-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    value={v.price}
                    onChange={(e) => updateVariant(i, 'price', Number(e.target.value))}
                    placeholder="Price"
                    min="1"
                    className="col-span-3 px-3 py-2 bg-white border border-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(i, e)}
                    className="col-span-3 text-[10px]"
                  />
                  <button
                    type="button"
                    onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
                    disabled={variants.length === 1}
                    className="col-span-1 text-red-500 disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                  {v.image && (
                    <div className="col-span-12 pt-2 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.image}
                        alt={`Variant ${i + 1} preview`}
                        className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                      />
                      <div className="text-xs">
                        {v.uploading ? (
                          <span className="text-amber-600 font-semibold">Uploading…</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">✓ Image ready</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-100 rounded-xl font-bold">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-[#0F6E56] text-white rounded-xl font-bold disabled:opacity-50">
              {isSubmitting ? 'Creating…' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface OverviewTabProps {
  stats: DashboardStats;
  myOrders: Order[];
  myProducts: Product[];
  data: DashboardData;
}
