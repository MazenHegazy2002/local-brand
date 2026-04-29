'use client';

import React, { useState, useEffect } from 'react';
import { 
  getDashboardStats, 
  createProduct, 
  deleteProduct, 
  updateOrderItemStatus 
} from '../actions/seller';

export default function SellerHub() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Advanced Product State
  const [newProduct, setNewProduct] = useState({ 
    title: '', 
    description: '', 
    basePrice: 0, 
    flashSalePrice: 0,
    categoryId: ''
  });
  
  const [variants, setVariants] = useState<any[]>([
    { color: 'Default', stock: 10, price: 0, image: '' }
  ]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await getDashboardStats();
      if (!res) {
        window.location.href = '/login?callbackUrl=/seller-hub';
        return;
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show temporary local preview while uploading
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedVariants = [...variants];
      updatedVariants[index].image = reader.result as string;
      updatedVariants[index].uploading = true;
      setVariants(updatedVariants);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (data.url) {
        const updatedVariants = [...variants];
        updatedVariants[index].image = data.url;
        updatedVariants[index].uploading = false;
        setVariants(updatedVariants);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      // Keep local preview on failure
      const updatedVariants = [...variants];
      updatedVariants[index].uploading = false;
      setVariants(updatedVariants);
    }
  };

  const addVariant = () => {
    setVariants([...variants, { color: '', stock: 0, price: 0, image: '' }]);
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const updatedVariants = [...variants];
    updatedVariants[index][field] = value;
    setVariants(updatedVariants);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!newProduct.categoryId) throw new Error("Please select a category");
      const res = await createProduct({
        ...newProduct,
        basePrice: Number(newProduct.basePrice),
        flashSalePrice: newProduct.flashSalePrice > 0 ? Number(newProduct.flashSalePrice) : null,
        variants: variants.map(v => ({
           ...v,
           stock: Number(v.stock),
           price: Number(v.price) || Number(newProduct.basePrice)
        })),
        published: true
      }) as any;

      if (res?.error) {
        alert(res.error);
        return;
      }

      setShowAddModal(false);
      resetForm();
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await deleteProduct(id) as any;
      if (res?.error) {
        alert(res.error);
        return;
      }
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFulfill = async (itemId: string) => {
    try {
      const res = await updateOrderItemStatus(itemId, 'SHIPPED') as any;
      if (res?.error) {
        alert(res.error);
        return;
      }
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setNewProduct({ title: '', description: '', basePrice: 0, flashSalePrice: 0, categoryId: '' });
    setVariants([{ color: 'Default', stock: 10, price: 0, image: '' }]);
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (loading && !data) return <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-[#0F6E56] font-medium">Loading SellerHub...</div>;
  if (error) return <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-red-600 font-bold">{error}</div>;

  const stats = data?.stats || {};
  const myProducts = data?.myProducts || [];
  const myOrders = data?.myOrders || [];

  return (
    <div className="db">
      {/* Sidebar - Emerald Green Theme */}
      <div className="sidebar">
        <div className="logo">SellerHub</div>
        
        <NavItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" icon={<OverviewIcon />} />
        <NavItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} label="Orders" icon={<OrdersIcon />} />
        <NavItem active={activeTab === 'products'} onClick={() => setActiveTab('products')} label="Products" icon={<ProductsIcon />} />
        <NavItem active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} label="Analytics" icon={<AnalyticsIcon />} />
        <NavItem active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} label="Wallet" icon={<WalletIcon />} />
        <NavItem active={activeTab === 'returns'} onClick={() => setActiveTab('returns')} label="Returns" icon={<ReturnsIcon />} />
        <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Settings" icon={<SettingsIcon />} />

        <div className="mt-auto px-4 pb-6">
           <div className="store-label">{data?.currentSeller?.storeName || 'TechStore EG'}</div>
           <div className="active-dot-row">
              <div className="active-dot"></div>
              Active seller
           </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="main">
        <div className="topbar">
          <div className="page-title">{TITLES[activeTab] || 'Dashboard'}</div>
          <button className="add-product-btn" onClick={() => setShowAddModal(true)}>+ Add product</button>
        </div>

        <div className="tab-content animate-fadeIn">
          {activeTab === 'overview' && <OverviewTab stats={stats} myOrders={myOrders} myProducts={myProducts} data={data} />}
          {activeTab === 'orders' && <OrdersTab orders={myOrders} onFulfill={handleFulfill} />}
          {activeTab === 'products' && <ProductsTab products={myProducts} onDelete={handleDeleteProduct} onAdd={() => setShowAddModal(true)} />}
          {activeTab === 'analytics' && <AnalyticsTab stats={stats} orders={myOrders} />}
          {activeTab === 'wallet' && <WalletTab data={data} />}
          {activeTab === 'returns' && <ReturnsTab orders={myOrders} />}
          {activeTab === 'settings' && <SettingsTab data={data} />}
        </div>
      </div>

      {/* Add Product Modal */}
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

      <style jsx global>{`
        :root {
          --color-emerald: #0F6E56;
          --color-background-secondary: #f8fafc;
          --color-text-primary: #1e293b;
          --color-text-secondary: #64748b;
          --color-border-tertiary: rgba(0,0,0,0.06);
        }
        .db { display: flex; min-height: 100vh; background: var(--color-background-secondary); font-family: 'Inter', sans-serif; }
        .sidebar { width: 186px; flex-shrink: 0; background: var(--color-emerald); display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; padding-top: 16px; }
        .logo { padding: 0 16px 30px; font-size: 17px; font-weight: 500; color: #fff; letter-spacing: -0.02em; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.7); transition: all 0.2s; }
        .nav-item:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .nav-item.active { color: #fff; background: rgba(255,255,255,0.1); font-weight: 500; }
        .nav-icon { width: 16px; height: 16px; flex-shrink: 0; opacity: 0.8; }
        .store-label { font-size: 11px; color: rgba(255,255,255,0.8); font-weight: 500; }
        .active-dot-row { display:flex;align-items:center;gap:5px;font-size:10px;color:rgba(255,255,255,0.6);marginTop:2px; }
        .active-dot { width:6px;height:6px;border-radius:50%;background:#4ADE80; }
        .main { flex: 1; min-width: 0; padding: 24px 32px; overflow: auto; }
        .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
        .page-title { font-size: 20px; font-weight: 500; color: var(--color-text-primary); }
        .add-product-btn { background: var(--color-emerald); color: #fff; font-size: 12px; font-weight: 500; padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; transition: opacity 0.2s; }
        .add-product-btn:hover { opacity: 0.9; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 32px; }
        .stat { background: #fff; border-radius: 8px; padding: 20px; border: 1px solid var(--color-border-tertiary); }
        .stat-label { font-size: 11px; color: var(--color-text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.02em; }
        .stat-val { font-size: 24px; font-weight: 500; color: var(--color-text-primary); line-height: 1; }
        .stat-sub { font-size: 12px; margin-top: 6px; }
        .up { color: #0F6E56; }.down { color: #E24B4A; }
        .grid2 { display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; margin-bottom: 24px; }
        .card { background: #fff; border-radius: 8px; border: 1px solid var(--color-border-tertiary); padding: 20px; }
        .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .card-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
        .chart-bars { display: flex; align-items: flex-end; gap: 8px; height: 100px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
        .bar-w { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .bar { width: 100%; border-radius: 2px 2px 0 0; background: #f1f5f9; min-height: 4px; }
        .bar.emerald { background: var(--color-emerald); }
        .bar-l { font-size: 10px; color: var(--color-text-tertiary); }
        .row-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f8fafc; }
        .row-item:last-child { border-bottom: none; }
        .badge { font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 4px; }
        .input-field { width: 100%; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; font-size: 13px; outline: none; }
        .input-field:focus { border-color: #0F6E56; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-content { background: #fff; width: 100%; max-width: 800px; padding: 32px; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
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
  returns: 'Returns',
  settings: 'Store Settings'
};

function NavItem({ active, onClick, label, icon }: any) {
  return (
    <div onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>
      <div className="nav-icon">{icon}</div>
      {label}
    </div>
  );
}

function OverviewTab({ stats, myOrders, myProducts, data }: any) {
  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Revenue (Total)</div>
          <div className="stat-val">{(stats.revenue || 0).toLocaleString()}</div>
          <div className="stat-sub up">+18% vs last month</div>
        </div>
        <div className="stat">
          <div className="stat-label">Orders</div>
          <div className="stat-val">{myOrders.length}</div>
          <div className="stat-sub up">+12 today</div>
        </div>
        <div className="stat">
          <div className="stat-label">Wallet balance</div>
          <div className="stat-val" style={{color:'#0F6E56'}}>{(data.currentSeller?.balance || 0).toLocaleString()}</div>
          <div className="stat-sub" style={{color:'var(--color-text-secondary)'}}>EGP available</div>
        </div>
        <div className="stat">
          <div className="stat-label">Seller rating</div>
          <div className="stat-val">4.8</div>
          <div className="stat-sub" style={{color:'var(--color-text-secondary)'}}>312 reviews</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-header"><div className="card-title">Revenue — last 7 days</div></div>
          <div className="chart-bars">
            {[30, 45, 35, 60, 90, 70, 50].map((h, i) => (
              <div key={i} className="bar-w"><div className="bar emerald" style={{height:`${h}%`}}></div><div className="bar-l">{['M','T','W','T','F','S','S'][i]}</div></div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Performance score</div></div>
          <ProgressRow label="Shipping speed" value={92} color="#0F6E56" />
          <ProgressRow label="Order acceptance" value={98} color="#0F6E56" />
          <ProgressRow label="Return rate" value={4} color="#E24B4A" />
        </div>
      </div>
    </>
  );
}

function OrdersTab({ orders, onFulfill }: any) {
  return (
    <div className="card">
       <div className="card-header"><div className="card-title">Manage Orders</div></div>
       <div className="row-item font-bold text-[11px] text-slate-400 uppercase">
          <span className="flex-1">Product / Order ID</span>
          <span className="w-32 text-center">Date</span>
          <span className="w-32 text-right">Price</span>
          <span className="w-40 text-center">Status</span>
          <span className="w-32"></span>
       </div>
       {orders.map((o: any) => (
         <div key={o.id} className="row-item">
            <div style={{flex:1}}>
               <div style={{fontSize:'13px',fontWeight:600}}>{o.items?.[0]?.productTitleSnapshot || 'Untitled Item'}</div>
               <div style={{fontSize:'11px',color:'var(--color-text-secondary)'}}>ORD-{o.id.substring(0,8)}</div>
            </div>
            <div className="w-32 text-center text-xs">{new Date(o.createdAt).toLocaleDateString()}</div>
            <div className="w-32 text-right text-sm font-medium">{o.totalAmount?.toLocaleString()} EGP</div>
            <div className="w-40 flex justify-center">
               <span className={`badge ${o.status === 'SHIPPED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{o.status}</span>
            </div>
            <div className="w-32 text-right">
               {o.status !== 'SHIPPED' && (
                 <button onClick={() => onFulfill(o.id)} className="text-[11px] font-bold text-[#0F6E56] hover:underline">MARK SHIPPED</button>
               )}
            </div>
         </div>
       ))}
       {orders.length === 0 && <div className="py-20 text-center text-xs text-slate-400">No active orders found.</div>}
    </div>
  );
}

function ProductsTab({ products, onDelete, onAdd }: any) {
  return (
    <div className="card">
       <div className="card-header"><div className="card-title">Product Catalog</div><button onClick={onAdd} className="add-product-btn">+ New</button></div>
       {products.map((p: any) => (
         <div key={p.id} className="row-item">
            <div className="w-12 h-12 rounded bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
               {p.images?.[0] && <img src={p.images[0].url} className="w-full h-full object-cover" />}
            </div>
            <div style={{flex:1}}>
               <div style={{fontSize:'13px',fontWeight:500}}>{p.title}</div>
               <div style={{fontSize:'11px',color:'var(--color-text-secondary)'}}>{p.category?.name}</div>
            </div>
            <div className="text-right px-8">
               <div style={{fontSize:'13px',fontWeight:500}}>{p.basePrice} EGP</div>
               <div style={{fontSize:'11px',color: (p.variants?.[0]?.stockCount || 0) < 5 ? '#E24B4A' : '#0F6E56'}}>
                  {p.variants?.reduce((acc:any,v:any)=>acc+v.stockCount,0) || 0} in stock
               </div>
            </div>
            <div className="flex gap-4">
               <button className="text-xs text-blue-500 hover:underline">Edit</button>
               <button onClick={() => onDelete(p.id)} className="text-xs text-red-400 hover:underline">Delete</button>
            </div>
         </div>
       ))}
       {products.length === 0 && <div className="py-20 text-center text-xs text-slate-400">Inventory empty. Click "+ Add product" to start.</div>}
    </div>
  );
}

function AddProductModal({ onClose, onSubmit, newProduct, setNewProduct, variants, setVariants, categories, isSubmitting, handleImageUpload, addVariant, updateVariant }: any) {
   return (
    <div className="modal-overlay" onClick={onClose}>
       <div className="modal-content animate-fadeIn" style={{maxWidth:'800px', maxHeight:'90vh', overflowY:'auto'}} onClick={e => e.stopPropagation()}>
          <div className="card-title" style={{fontSize:'18px', marginBottom:'20px'}}>Create Multi-Variant Product</div>
          <form onSubmit={onSubmit} className="flex flex-col gap-6">
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[11px] text-slate-500 uppercase mb-1">Title</label>
                   <input required type="text" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} className="input-field" />
                </div>
                <div>
                   <label className="block text-[11px] text-slate-500 uppercase mb-1">Category</label>
                   <select required value={newProduct.categoryId} onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})} className="input-field bg-white">
                      <option value="">Select Category...</option>
                      {categories?.map((c: any) => (
                         <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                   </select>
                </div>
                <div className="col-span-2">
                   <label className="block text-[11px] text-slate-500 uppercase mb-1">Description</label>
                   <textarea required value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="input-field" rows={3} />
                </div>
             </div>

             <div>
                <div className="flex justify-between items-center mb-3">
                   <label className="text-[12px] font-bold text-slate-700 uppercase">Product Variants (Colors & Images)</label>
                   <button type="button" onClick={addVariant} className="text-[11px] text-[#0F6E56] font-bold">+ ADD VARIANT</button>
                </div>
                <div className="flex flex-col gap-3">
                   {variants.map((v:any, i:any) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex gap-4 items-start">
                         <div className="w-16 h-16 bg-white border border-slate-200 rounded flex items-center justify-center relative overflow-hidden group">
                            {v.image ? (
                               <img src={v.image} className="w-full h-full object-cover" />
                            ) : (
                               <span className="text-[10px] text-slate-400">Photo</span>
                            )}
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(i, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                         </div>
                         <div className="flex-1 grid grid-cols-3 gap-2">
                            <div>
                               <label className="text-[10px] text-slate-400 block">Color</label>
                               <input required type="text" value={v.color} onChange={(e) => updateVariant(i, 'color', e.target.value)} className="input-field py-1" placeholder="e.g. Red" />
                            </div>
                            <div>
                               <label className="text-[10px] text-slate-400 block">Stock</label>
                               <input required type="number" value={v.stock} onChange={(e) => updateVariant(i, 'stock', e.target.value)} className="input-field py-1" />
                            </div>
                            <div>
                               <label className="text-[10px] text-slate-400 block">Price (EGP)</label>
                               <input type="number" value={v.price} onChange={(e) => updateVariant(i, 'price', e.target.value)} className="input-field py-1" placeholder="Optional" />
                            </div>
                         </div>
                         {variants.length > 1 && (
                            <button type="button" onClick={() => setVariants(variants.filter((_:any, idx:any) => idx !== i))} className="text-red-400 hover:text-red-600 mt-4">✕</button>
                         )}
                      </div>
                   ))}
                </div>
             </div>

             <div className="flex gap-2">
                <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded hover:bg-slate-50 font-medium">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-[#0F6E56] text-white rounded hover:opacity-90 disabled:opacity-50 font-medium">
                   {isSubmitting ? 'Uploading Data...' : 'Save Product & Variants'}
                </button>
             </div>
          </form>
       </div>
    </div>
   );
}

function ProgressRow({ label, value, color }: any) {
  return (
    <div style={{marginBottom: '16px'}}>
       <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'6px'}}>
          <span style={{color: 'var(--color-text-secondary)'}}>{label}</span>
          <span style={{fontWeight: 500}}>{value}%</span>
       </div>
       <div style={{height:'4px',background:'#f1f5f9',borderRadius:'2px',overflow:'hidden'}}>
          <div style={{height:'100%',width:`${value}%`,background:color,borderRadius:'2px'}}></div>
       </div>
    </div>
  );
}

function AnalyticsTab({ stats, orders }: any) {
  const totalRevenue = orders?.reduce((acc: number, o: any) => acc + (o.totalAmount || 0), 0) || 0;
  const totalOrders = orders?.length || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Mock daily data for chart (in real app, aggregate from orders)
  const dailyData = [3200, 4500, 2800, 5100, 6200, 4800, 3900];
  const maxVal = Math.max(...dailyData);
  
  const recentOrders = orders?.slice(0, 5) || [];
  
  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-val">{totalRevenue.toLocaleString()}</div>
          <div className="stat-sub up">Lifetime earnings</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total Orders</div>
          <div className="stat-val">{totalOrders}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg Order Value</div>
          <div className="stat-val">{Math.round(avgOrderValue).toLocaleString()}</div>
          <div className="stat-sub">Per order</div>
        </div>
        <div className="stat">
          <div className="stat-label">This Month</div>
          <div className="stat-val" style={{color:'#0F6E56'}}>{Math.round(totalRevenue * 0.3).toLocaleString()}</div>
          <div className="stat-sub">Estimated</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-header"><div className="card-title">Revenue — Last 7 Days</div></div>
          <div className="chart-bars">
            {dailyData.map((h, i) => (
              <div key={i} className="bar-w">
                <div className="bar emerald" style={{height: `${(h / maxVal) * 100}%`}}></div>
                <div className="bar-l">{['M','T','W','T','F','S','S'][i]}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Performance Metrics</div></div>
          <ProgressRow label="Shipping Speed" value={92} color="#0F6E56" />
          <ProgressRow label="Order Acceptance" value={98} color="#0F6E56" />
          <ProgressRow label="Return Rate" value={4} color="#E24B4A" />
          <ProgressRow label="Response Time" value={88} color="#0F6E56" />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Recent Orders</div></div>
        {recentOrders.length > 0 ? recentOrders.map((o: any) => (
          <div key={o.id} className="row-item">
            <div style={{flex:1}}>
              <div style={{fontSize:'13px',fontWeight:600}}>ORD-{o.id.substring(0,8)}</div>
              <div style={{fontSize:'11px',color:'var(--color-text-secondary)'}}>{new Date(o.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="text-right font-medium">{o.totalAmount?.toLocaleString()} EGP</div>
          </div>
        )) : (
          <div className="py-10 text-center text-xs text-slate-400">No orders yet</div>
        )}
      </div>
    </>
  );
}

function WalletTab({ data }: any) { 
  return (
    <div className="card max-w-xl">
       <div className="card-title mb-6">Financial Overview</div>
       <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 mb-6">
          <div className="text-[11px] text-slate-500 uppercase mb-2">Available Balance</div>
          <div className="text-3xl font-bold text-[#0F6E56]">{(data.currentSeller?.balance || 0).toLocaleString()} EGP</div>
       </div>
       <div className="p-4 bg-slate-50 rounded-lg mb-4">
         <div className="text-sm font-medium text-slate-700 mb-2">Pending Earnings</div>
         <div className="text-xl font-bold text-slate-900">{(data.stats?.revenue || 0 - data.currentSeller?.balance || 0).toLocaleString()} EGP</div>
       </div>
       <button className="w-full py-3 bg-[#0F6E56] text-white rounded font-bold">Request Payout</button>
       <p className="text-xs text-slate-400 text-center mt-3">Payouts are processed within 5-7 business days</p>
    </div>
  ); 
}

function ReturnsTab({ orders }: any) {
  // Filter orders with return requests
  const returnItems = orders?.flatMap((o: any) => 
    (o.items || []).filter((item: any) => item.status === 'RETURN_REQUESTED' || item.status === 'RETURNED')
  ) || [];
  
  return (
    <div className="card">
       <div className="card-header">
         <div className="card-title">Return Requests</div>
         <span className="text-xs text-slate-500">{returnItems.length} active</span>
       </div>
       {returnItems.length > 0 ? returnItems.map((item: any) => (
         <div key={item.id} className="row-item">
            <div style={{flex:1}}>
              <div style={{fontSize:'13px',fontWeight:600}}>{item.productTitleSnapshot}</div>
              <div style={{fontSize:'11px',color:'var(--color-text-secondary)'}}>Qty: {item.quantity}</div>
            </div>
            <span className="badge bg-amber-100 text-amber-800">{item.status}</span>
         </div>
       )) : (
         <div className="py-20 text-center text-xs text-slate-400">No active return requests.</div>
       )}
    </div>
  );
}

function SettingsTab({ data }: any) {
  return (
    <div className="card max-w-xl">
       <div className="card-title mb-6">Store Configuration</div>
       <div className="flex flex-col gap-6">
          <div>
             <label className="block text-[11px] text-slate-500 uppercase mb-1">Store Name</label>
             <input defaultValue={data.currentSeller?.storeName} className="input-field" />
          </div>
          <div>
             <label className="block text-[11px] text-slate-500 uppercase mb-1">Store Description</label>
             <textarea defaultValue={data.currentSeller?.description} className="input-field" rows={4} />
          </div>
          <div>
             <label className="block text-[11px] text-slate-500 uppercase mb-1">Bank Account (IBAN)</label>
             <input defaultValue={data.currentSeller?.bankAccount} className="input-field" placeholder="EG00 0000 0000..." />
          </div>
          <button className="py-3 bg-slate-900 text-white rounded font-bold">Update Profile</button>
       </div>
    </div>
  );
}

// Icons
function OverviewIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>; }
function OrdersIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="2" width="10" height="12" rx="2"/><path d="M6 6h4M6 9h4"/></svg>; }
function ProductsIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5l6-3 6 3-6 3-6-3zM2 11l6 3 6-3M2 8l6 3 6-3"/></svg>; }
function AnalyticsIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13l4-7 3 3 5-7"/></svg>; }
function WalletIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="12" height="8" rx="2"/><circle cx="11" cy="8" r="1.5"/></svg>; }
function ReturnsIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8h8M4 8l3-3M4 8l3 3"/></svg>; }
function SettingsIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="3"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2"/></svg>; }
