'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardStats, toggleWishlist, updateProfile } from '../actions/seller';
import Link from 'next/link';

export default function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await getDashboardStats();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Unauthorized");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWishlist = async (id: string) => {
    try {
      await toggleWishlist(id);
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const payload = Object.fromEntries(formData);
    try {
      await updateProfile(payload);
      alert("Profile updated successfully!");
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (loading && !data) return <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-[#1a1a2e] font-medium">Initializing Dashboard...</div>;
  if (error) return <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-red-600 font-bold">{error}</div>;

  const myOrders = data?.myOrders || [];
  const wishlist = data?.wishlist || [];
  const notifications = data?.notifications || [];

  return (
    <div className="db">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo">My<span>LB</span></div>
        
        <div className="nav-section">Personal</div>
        <NavItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" icon={<OverviewIcon />} />
        <NavItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} label="My Orders" icon={<OrdersIcon />} />
        <NavItem active={activeTab === 'wishlist'} onClick={() => setActiveTab('wishlist')} label="Wishlist" icon={<WishlistIcon />} />
        <NavItem active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} label="Alerts" icon={<ModerationIcon />} />
        
        <div className="nav-section">Finance</div>
        <NavItem active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} label="Wallet" icon={<PayoutsIcon />} />
        
        <div className="nav-section">System</div>
        <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Settings" icon={<SettingsIcon />} />

        <div className="mt-auto px-4 pb-4">
           <div className="user-label">{data?.user?.name}</div>
           <button onClick={() => window.location.href='/api/auth/signout'} className="signout-btn">Sign out</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main">
        <div className="topbar">
          <div className="page-title">{TITLES[activeTab] || 'Dashboard'}</div>
          <div className="top-actions">
            <div className="tier-badge">Member Tier: <span className="badge b-new">PREMIUM</span></div>
            <div onClick={refreshData} className="refresh-btn">
               <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={loading ? 'animate-spin' : ''}><path d="M8 1.5A4.5 4.5 0 003.5 6c0 1.5-.5 3-1.5 4h12c-1-1-1.5-2.5-1.5-4A4.5 4.5 0 008 1.5z" fill="#534AB7" opacity=".8"/><path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="#534AB7" strokeWidth="1.2" fill="none"/></svg>
            </div>
          </div>
        </div>

        <div className="tab-content animate-fadeIn">
          {activeTab === 'overview' && <OverviewTab data={data} wishlist={wishlist} myOrders={myOrders} />}
          {activeTab === 'orders' && <OrdersTab orders={myOrders} />}
          {activeTab === 'wishlist' && <WishlistTab items={wishlist} onToggle={handleToggleWishlist} />}
          {activeTab === 'notifications' && <NotificationsTab items={notifications} />}
          {activeTab === 'wallet' && <WalletTab user={data.user} />}
          {activeTab === 'settings' && <SettingsTab user={data.user} onUpdate={handleUpdateProfile} isUpdating={isUpdating} />}
        </div>
      </div>

      <style jsx global>{`
        :root {
          --color-background-primary: #ffffff;
          --color-background-secondary: #f8fafc;
          --color-text-primary: #1e293b;
          --color-text-secondary: #64748b;
          --color-text-tertiary: #94a3b8;
          --color-border-tertiary: rgba(0,0,0,0.08);
        }
        *{box-sizing:border-box;margin:0;padding:0}
        .db{display:flex;min-height:100vh;background:var(--color-background-secondary);font-family: 'Inter', sans-serif;}
        .sidebar{width:186px;flex-shrink:0;background:#1a1a2e;padding:16px 0;display:flex;flex-direction:column;height:100vh;position:sticky;top:0}
        .logo{padding:0 16px 20px;font-size:15px;font-weight:500;color:#fff}
        .logo span{color:#7F77DD}
        .nav-section{font-size:10px;font-weight:500;color:#444;letter-spacing:.08em;padding:10px 16px 4px;text-transform:uppercase}
        .nav-item{display:flex;align-items:center;gap:9px;padding:8px 16px;cursor:pointer;font-size:12px;color:#888;transition:all .12s}
        .nav-item:hover{background:rgba(255,255,255,.05);color:#ccc}
        .nav-item.active{background:rgba(127,119,221,.15);color:#AFA9EC}
        .nav-icon{width:15px;height:15px;flex-shrink:0}
        .main{flex:1;min-width:0;padding:18px;background:var(--color-background-secondary);overflow:auto}
        .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .page-title{font-size:17px;font-weight:500;color:var(--color-text-primary)}
        .user-label { font-size: 10px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .signout-btn { font-size: 10px; color: rgba(239,68,68,0.6); margin-top: 4px; background: none; border: none; cursor: pointer; display: block; }
        .tier-badge { display:flex;align-items:center;gap:5px;font-size:12px;color:var(--color-text-secondary); }
        .refresh-btn { width:34px;height:34px;borderRadius:6px;background:#EEEDFE;display:flex;align-items:center;justify-content:center;cursor:pointer; }
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:14px}
        .stat{background:var(--color-background-primary);border-radius:8px;padding:12px;border:1px solid var(--color-border-tertiary)}
        .stat-label{font-size:10px;color:var(--color-text-secondary);margin-bottom:5px;text-transform:uppercase;letter-spacing:.04em}
        .stat-val{font-size:20px;font-weight:500;color:var(--color-text-primary);line-height:1}
        .stat-sub{font-size:11px;margin-top:4px}
        .card{background:var(--color-background-primary);border-radius:12px;border:1px solid var(--color-border-tertiary);padding:14px;margin-bottom:11px}
        .card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px}
        .card-title{font-size:13px;font-weight:500;color:var(--color-text-primary)}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:11px}
        .badge{font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;flex-shrink:0}
        .b-active{background:#E1F5EE;color:#085041}
        .b-new{background:#EEEDFE;color:#3C3489}
        .action-btn{font-size:11px;padding:3px 9px;border-radius:4px;cursor:pointer;border:1px solid #e2e8f0;background:transparent;color:var(--color-text-secondary);transition:all .15s}
        .row-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--color-border-tertiary)}
        .row-item:last-child{border-bottom:none}
        .avatar-sm{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;flex-shrink:0}
        .input-profile { width:100%; border:1px solid #e2e8f0; padding:8px 12px; border-radius:6px; font-size:12px; outline:none; margin-bottom:10px; }
        .input-profile:focus { border-color: #534AB7; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
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
  settings: 'Profile management'
};

function NavItem({ active, onClick, label, icon }: any) {
  return (
    <div onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>
      <div className="nav-icon">{icon}</div>
      {label}
    </div>
  );
}

function OverviewTab({ data, wishlist, myOrders }: any) {
  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Orders</div>
          <div className="stat-val">{myOrders.length}</div>
          <div className="stat-sub" style={{color:'#1D9E75'}}>Total purchases</div>
        </div>
        <div className="stat">
          <div className="stat-label">Wishlist</div>
          <div className="stat-val">{wishlist.length}</div>
          <div className="stat-sub" style={{color:'#534AB7'}}>Saved items</div>
        </div>
        <div className="stat">
          <div className="stat-label">Loyalty Points</div>
          <div className="stat-val" style={{color:'#534AB7'}}>{data?.user?.loyaltyPoints || 0}</div>
          <div className="stat-sub">Redeemable credits</div>
        </div>
        <div className="stat">
          <div className="stat-label">Wallet</div>
          <div className="stat-val">0.00</div>
          <div className="stat-sub">EGP available</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-header"><div className="card-title">Recent Orders</div></div>
          {myOrders.slice(0,3).map((o: any) => (
            <div key={o.id} className="row-item">
              <div style={{flex:1}}>
                <div style={{fontSize:'12px',fontWeight:600}}>ORD-{o.id.substring(0,8)}</div>
                <div style={{fontSize:'11px',color:'#64748b'}}>{new Date(o.createdAt).toLocaleDateString()}</div>
              </div>
              <span className="badge b-active">{o.status}</span>
            </div>
          ))}
          {!myOrders.length && <div className="py-10 text-center text-xs text-slate-400">No orders yet.</div>}
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Wishlist Preview</div></div>
          {wishlist.slice(0,3).map((w: any) => (
            <div key={w.productId} className="row-item">
               <div className="avatar-sm" style={{borderRadius:'4px', overflow:'hidden', background:'#f1f5f9'}}>
                  {w.product?.images?.[0] && <img src={w.product.images[0].url} className="w-full h-full object-cover" />}
               </div>
               <span style={{fontSize:'12px',fontWeight:500}} className="truncate flex-1">{w.product?.title}</span>
               <div style={{fontSize:'12px',fontWeight:600}}>{w.product?.basePrice} EGP</div>
            </div>
          ))}
          {!wishlist.length && <div className="py-10 text-center text-xs text-slate-400">Wishlist empty.</div>}
        </div>
      </div>
    </>
  );
}

function OrdersTab({ orders }: any) {
  return (
    <div className="card">
       <div className="card-header"><div className="card-title">Full Purchase History</div></div>
       {orders.map((o: any) => (
         <div key={o.id} className="row-item" style={{flexDirection:'column', alignItems:'stretch', padding:'15px 0'}}>
            <div className="flex justify-between items-start mb-4">
               <div>
                  <div style={{fontSize:'13px',fontWeight:700}}>Order #ORD-{o.id.substring(0,8)}</div>
                  <div style={{fontSize:'11px',color:'#64748b'}}>Placed on {new Date(o.createdAt).toLocaleString()}</div>
               </div>
               <div className="text-right">
                  <div style={{fontSize:'15px',fontWeight:700}}>{o.totalAmount?.toLocaleString()} EGP</div>
                  <span className="badge b-active">{o.status}</span>
               </div>
            </div>
            {/* Tracking Step UI */}
            <div className="flex items-center gap-2 mb-4 px-2">
               <TrackStep active={true} label="Ordered" />
               <TrackLine active={['PROCESSING','SHIPPED','DELIVERED'].includes(o.status)} />
               <TrackStep active={['PROCESSING','SHIPPED','DELIVERED'].includes(o.status)} label="Processing" />
               <TrackLine active={['SHIPPED','DELIVERED'].includes(o.status)} />
               <TrackStep active={['SHIPPED','DELIVERED'].includes(o.status)} label="Shipped" />
               <TrackLine active={o.status === 'DELIVERED'} />
               <TrackStep active={o.status === 'DELIVERED'} label="Delivered" />
            </div>
            {o.items?.map((item:any) => (
               <div key={item.id} className="flex gap-3 mt-2 p-2 bg-slate-50 rounded">
                  <div className="w-10 h-10 rounded bg-white overflow-hidden shrink-0">
                     {item.variant?.product?.images?.[0] && <img src={item.variant.product.images[0].url} className="w-full h-full object-cover" />}
                  </div>
                  <div style={{flex:1}}>
                     <div style={{fontSize:'11px',fontWeight:600}}>{item.productTitleSnapshot}</div>
                     <div style={{fontSize:'10px',color:'#64748b'}}>Qty: {item.quantity} · Variant: {item.variant?.title}</div>
                  </div>
               </div>
            ))}
         </div>
       ))}
       {!orders.length && <div className="py-20 text-center text-xs text-slate-400">No orders found.</div>}
    </div>
  );
}

function WishlistTab({ items, onToggle }: any) {
  return (
    <div className="card">
       <div className="card-header"><div className="card-title">My Saved Items</div></div>
       {items.map((w: any) => (
         <div key={w.productId} className="row-item">
            <div className="w-12 h-12 rounded bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
               {w.product?.images?.[0] && <img src={w.product.images[0].url} className="w-full h-full object-cover" />}
            </div>
            <div style={{flex:1}}>
               <div style={{fontSize:'13px',fontWeight:500}}>{w.product?.title}</div>
               <div style={{fontSize:'11px',color:'#64748b'}}>{w.product?.category?.name}</div>
            </div>
            <div style={{textAlign:'right', padding:'0 20px'}}>
               <div style={{fontSize:'13px',fontWeight:600}}>{w.product?.basePrice} EGP</div>
            </div>
            <div className="flex gap-3">
               <Link href={`/product/${w.productId}`} className="action-btn">View</Link>
               <button onClick={() => onToggle(w.productId)} className="action-btn" style={{borderColor:'#A32D2D',color:'#791F1F'}}>Remove</button>
            </div>
         </div>
       ))}
       {!items.length && <div className="py-20 text-center text-xs text-slate-400">Wishlist empty.</div>}
    </div>
  );
}

function NotificationsTab({ items }: any) {
  return (
    <div className="card">
       <div className="card-header"><div className="card-title">System Alerts</div></div>
       {items.map((n: any) => (
         <div key={n.id} className="row-item">
            <div className="w-2 h-2 rounded-full shrink-0" style={{background: n.isRead ? '#cbd5e1' : '#534AB7'}} />
            <div style={{flex:1}}>
               <div style={{fontSize:'12px',fontWeight:600}}>{n.title}</div>
               <div style={{fontSize:'11px',color:'#64748b'}}>{n.message}</div>
            </div>
            <div style={{fontSize:'10px',color:'#94a3b8'}}>{new Date(n.createdAt).toLocaleDateString()}</div>
         </div>
       ))}
       {!items.length && <div className="py-20 text-center text-xs text-slate-400">No new notifications.</div>}
    </div>
  );
}

function WalletTab({ user }: any) {
  return (
    <div className="card max-w-xl mx-auto py-10 text-center">
       <div style={{fontSize:'10px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'10px'}}>Total Available Credits</div>
       <div style={{fontSize:'42px',fontWeight:800,color:'#534AB7'}}>{((user?.loyaltyPoints || 0) * 0.1).toFixed(2)} <span style={{fontSize:'20px'}}>EGP</span></div>
       <div style={{fontSize:'12px',color:'#64748b',marginTop:'10px'}}>Earned via platform activity and loyalty programs.</div>
       <button className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-full text-xs font-bold uppercase tracking-wider">Redeem for Coupon</button>
    </div>
  );
}

function SettingsTab({ user, onUpdate, isUpdating }: any) {
  return (
    <div className="card max-w-xl">
       <div className="card-title mb-6">Profile Management</div>
       <form onSubmit={onUpdate}>
          <div>
             <label className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Full Name</label>
             <input name="name" defaultValue={user?.name} className="input-profile" />
          </div>
          <div>
             <label className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Email Address</label>
             <input name="email" defaultValue={user?.email} className="input-profile" readOnly style={{background:'#f8fafc', color:'#94a3b8'}} />
          </div>
          <div>
             <label className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Phone Number</label>
             <input name="phone" defaultValue={user?.phone} className="input-profile" placeholder="+20 1XX XXX XXXX" />
          </div>
          <button disabled={isUpdating} type="submit" className="w-full py-3 bg-[#534AB7] text-white rounded font-bold mt-4 disabled:opacity-50">
             {isUpdating ? 'Updating...' : 'Save Changes'}
          </button>
       </form>
    </div>
  );
}

function TrackStep({ active, label }: any) {
   return (
      <div className="flex flex-col items-center gap-1 shrink-0">
         <div className={`w-3 h-3 rounded-full ${active ? 'bg-[#534AB7]' : 'bg-slate-200'}`} />
         <span className={`text-[9px] font-bold uppercase ${active ? 'text-[#534AB7]' : 'text-slate-300'}`}>{label}</span>
      </div>
   );
}

function TrackLine({ active }: any) {
   return <div className={`h-[2px] flex-1 ${active ? 'bg-[#534AB7]' : 'bg-slate-100'}`} />;
}

// SVGs
function OverviewIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>; }
function OrdersIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="2" width="10" height="12" rx="2"/><path d="M6 6h4M6 9h4"/></svg>; }
function WishlistIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 14.5s-6-3.5-6-8.5a3.5 3.5 0 016-3 3.5 3.5 0 016 3c0 5-6 8.5-6 8.5z"/></svg>; }
function PayoutsIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="12" height="8" rx="2"/><circle cx="11" cy="8" r="1.5"/></svg>; }
function ModerationIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v12M2 8h12"/></svg>; }
function SettingsIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="3"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2"/></svg>; }
