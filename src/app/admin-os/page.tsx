'use client';

import React, { useState, useEffect } from 'react';
import { 
  getDashboardStats, 
  updateSellerStatus, 
  seedTestData,
  createTaxonomy,
  deleteTaxonomy,
  adminCreateUser,
  adminDeleteUser,
} from '../actions/seller';

export default function AdminOS() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);

  // Taxonomy Form State
  const [taxType, setTaxType] = useState<'category' | 'tag' | 'collection'>('category');
  const [taxName, setTaxName] = useState('');

  // Create User Modal State
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: '', email: '', password: '', role: 'BUYER' as 'ADMIN' | 'SELLER' | 'BUYER', storeName: ''
  });
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await getDashboardStats();
      if (res?.error) {
        setError(res.error);
        return;
      }
      setData(res);
    } catch (err: any) {
      setError(err.message || "Unauthorized");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (sellerId: string, status: string) => {
    setActionLoading(sellerId);
    try {
      await updateSellerStatus(sellerId, status as any);
      await refreshData();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateTaxonomy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTaxonomy(taxType, { name: taxName });
      setTaxName('');
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTaxonomy = async (type: any, id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteTaxonomy(type, id);
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSeed = async () => {
    setSeedLoading(true);
    try {
      const res = await seedTestData() as any;
      if (res?.error) { alert(res.error); return; }
      await refreshData();
      alert("System seeded with full operational data.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSeedLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserLoading(true);
    setCreateUserError(null);
    try {
      const res = await adminCreateUser(createUserForm) as any;
      if (res?.error) { setCreateUserError(res.error); return; }
      setShowCreateUser(false);
      setCreateUserForm({ name: '', email: '', password: '', role: 'BUYER', storeName: '' });
      await refreshData();
    } catch (err: any) {
      setCreateUserError(err.message || 'Failed to create user.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete account "${email}"? This cannot be undone.`)) return;
    const res = await adminDeleteUser(userId) as any;
    if (res?.error) { alert(res.error); return; }
    await refreshData();
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (loading && !data) return <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-[#1a1a2e] font-medium">Initializing AdminOS...</div>;
  if (error) return <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-red-600 font-bold">{error}</div>;

  const stats = data?.stats || {};

  return (
    <div className="db">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo">Admin<span>OS</span></div>
        
        <div className="nav-section">Main</div>
        <NavItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" icon={<OverviewIcon />} />
        <NavItem active={activeTab === 'sellers'} onClick={() => setActiveTab('sellers')} label="Sellers" icon={<SellersIcon />} />
        <NavItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="Users" icon={<UsersIcon />} />
        <NavItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} label="Orders" icon={<OrdersIcon />} />
        
        <div className="nav-section">Finance</div>
        <NavItem active={activeTab === 'payouts'} onClick={() => setActiveTab('payouts')} label="Payouts" icon={<PayoutsIcon />} />
        <NavItem active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} label="Analytics" icon={<AnalyticsIcon />} />
        
        <div className="nav-section">System</div>
        <NavItem active={activeTab === 'taxonomy'} onClick={() => setActiveTab('taxonomy')} label="Taxonomy" icon={<ModerationIcon />} />
        <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Settings" icon={<SettingsIcon />} />

        <div className="mt-auto px-4 pb-4 flex flex-col gap-2">
           <button onClick={handleSeed} disabled={seedLoading} className="seed-btn">{seedLoading ? 'Seeding...' : 'Seed Data'}</button>
           <div className="user-label">{data?.user?.email}</div>
           <button onClick={() => window.location.href='/api/auth/signout'} className="signout-btn">Sign out</button>
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
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={loading ? 'animate-spin' : ''}><path d="M8 1.5A4.5 4.5 0 003.5 6c0 1.5-.5 3-1.5 4h12c-1-1-1.5-2.5-1.5-4A4.5 4.5 0 008 1.5z" fill="#534AB7" opacity=".8"/><path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="#534AB7" strokeWidth="1.2" fill="none"/></svg>
            </div>
          </div>
        </div>

        <div className="tab-content animate-fadeIn">
          {activeTab === 'overview' && <OverviewTab data={data} handleStatusUpdate={handleStatusUpdate} actionLoading={actionLoading} />}
          {activeTab === 'sellers' && <SellersTab data={data} handleStatusUpdate={handleStatusUpdate} actionLoading={actionLoading} />}
          {activeTab === 'users' && <UsersTab data={data} onDelete={handleDeleteUser} onCreateClick={() => setShowCreateUser(true)} />}
          {activeTab === 'orders' && <OrdersTab data={data} />}
          {activeTab === 'payouts' && <PayoutsTab data={data} />}
          {activeTab === 'analytics' && <AnalyticsTab data={data} />}
          {activeTab === 'taxonomy' && <TaxonomyTab data={data} onTypeChange={setTaxType} currentType={taxType} onNameChange={setTaxName} nameValue={taxName} onCreate={handleCreateTaxonomy} onDelete={handleDeleteTaxonomy} />}
          {activeTab === 'settings' && <SettingsTab data={data} />}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <CreateUserModal
          form={createUserForm}
          onChange={(f: any) => setCreateUserForm(f)}
          onSubmit={handleCreateUser}
          onClose={() => { setShowCreateUser(false); setCreateUserError(null); }}
          loading={createUserLoading}
          error={createUserError}
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
  orders: 'Order oversight',
  payouts: 'Financial settlements',
  analytics: 'Revenue analytics',
  taxonomy: 'Classification systems',
  settings: 'System configuration'
};

function NavItem({ active, onClick, label, icon }: any) {
  return (
    <div onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>
      <div className="nav-icon">{icon}</div>
      {label}
    </div>
  );
}

function OverviewTab({ data, handleStatusUpdate, actionLoading }: any) {
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
          <div className="stat-val" style={{color:'#534AB7'}}>{(stats.revenue * 0.08 || 0).toLocaleString()}</div>
          <div className="stat-sub" style={{color:'var(--color-text-secondary)'}}>EGP (8% avg)</div>
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
          <div className="card-header"><div className="card-title">Recent Audit Log</div></div>
          {data?.auditLogs?.slice(0, 5).map((log: any) => (
            <div key={log.id} className="row-item" style={{fontSize:'11px'}}>
               <div style={{width:'6px',height:'6px',borderRadius:'50%',background:log.action.includes('SUSPENDED') ? '#E24B4A' : '#1D9E75'}} />
               <div style={{flex:1}}>
                  <span style={{fontWeight:600}}>{log.admin?.name}</span>
                  <span style={{color:'#64748b'}}> {log.action.replace(/_/g, ' ').toLowerCase()} </span>
                  <span style={{fontWeight:500}}>{log.details}</span>
               </div>
               <div style={{color:'#94a3b8'}}>{new Date(log.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            </div>
          ))}
          {!data?.auditLogs?.length && <div className="py-10 text-center text-xs text-slate-400">No logs yet. Seed data to test.</div>}
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Pending Approvals</div></div>
          {data?.pendingSellers?.slice(0,3).map((s: any) => (
            <div key={s.id} className="row-item">
              <div style={{flex:1}}>
                <div style={{fontSize:'12px',fontWeight:500}}>{s.storeName}</div>
                <div style={{fontSize:'11px',color:'#64748b'}}>{s.user?.email}</div>
              </div>
              <div style={{display:'flex',gap:'5px'}}>
                <button disabled={actionLoading === s.id} onClick={() => handleStatusUpdate(s.id, 'ACTIVE')} className="action-btn" style={{borderColor:'#0F6E56',color:'#085041'}}>Approve</button>
                <button disabled={actionLoading === s.id} onClick={() => handleStatusUpdate(s.id, 'SUSPENDED')} className="action-btn" style={{borderColor:'#A32D2D',color:'#791F1F'}}>Reject</button>
              </div>
            </div>
          ))}
          {!data?.pendingSellers?.length && <div className="py-10 text-center text-xs text-slate-400">Queue clear.</div>}
        </div>
      </div>
    </>
  );
}

function SellersTab({ data, handleStatusUpdate, actionLoading }: any) {
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">All Sellers</div></div>
      <div className="row-item font-bold text-[11px] text-slate-400 uppercase">
         <span className="flex-1">Store Name / Owner</span>
         <span className="w-32 text-center">Status</span>
         <span className="w-32 text-right">Balance</span>
         <span className="w-24"></span>
      </div>
      {data?.sellers?.map((s: any) => (
        <div key={s.id} className="row-item">
          <div style={{flex:1}}>
            <div style={{fontSize:'12px',fontWeight:500}}>{s.storeName}</div>
            <div style={{fontSize:'11px',color:'#64748b'}}>{s.user?.name}</div>
          </div>
          <div className="w-32 flex justify-center">
             <span className={`badge ${s.status === 'ACTIVE' ? 'b-active' : s.status === 'PENDING_APPROVAL' ? 'b-pending' : 'b-banned'}`}>{s.status}</span>
          </div>
          <div className="w-32 text-right text-sm font-medium">{s.balance?.toLocaleString()} EGP</div>
          <div className="w-24 text-right">
             <button disabled={actionLoading === s.id} onClick={() => handleStatusUpdate(s.id, s.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')} className="action-btn">
                {s.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
             </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab({ data, onDelete, onCreateClick }: any) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">User Registry</div>
        <button onClick={onCreateClick} style={{background:'#534AB7',color:'#fff',fontSize:'11px',fontWeight:600,padding:'6px 14px',borderRadius:'6px',border:'none',cursor:'pointer'}}>
          + Create Account
        </button>
      </div>
      <div className="row-item" style={{fontSize:'10px',color:'#94a3b8',fontWeight:600,textTransform:'uppercase'}}>
        <div style={{width:28}} />
        <div style={{flex:1}}>Name / Email</div>
        <div style={{width:80,textAlign:'center'}}>Role</div>
        <div style={{width:100,textAlign:'right'}}>Joined</div>
        <div style={{width:60}} />
      </div>
      {data?.users?.map((u: any) => (
        <div key={u.id} className="row-item">
          <div className="avatar-sm" style={{background: u.role==='ADMIN' ? '#EEEDFE' : u.role==='SELLER' ? '#E1F5EE' : '#FFF7ED', color: u.role==='ADMIN' ? '#534AB7' : u.role==='SELLER' ? '#085041' : '#92400E'}}>{(u.name||'?')[0].toUpperCase()}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:'12px',fontWeight:500}}>{u.name}</div>
            <div style={{fontSize:'11px',color:'#64748b'}}>{u.email}</div>
          </div>
          <div style={{width:80,textAlign:'center'}}>
            <span className={`badge ${u.role==='ADMIN' ? 'b-new' : u.role==='SELLER' ? 'b-active' : 'b-pending'}`}>{u.role}</span>
          </div>
          <div style={{fontSize:'11px',color:'#94a3b8',width:100,textAlign:'right'}}>{new Date(u.createdAt).toLocaleDateString()}</div>
          <div style={{width:60,textAlign:'right'}}>
            <button className="del-btn" onClick={() => onDelete(u.id, u.email)}>Delete</button>
          </div>
        </div>
      ))}
      {!data?.users?.length && <div className="py-10 text-center text-xs text-slate-400">No users found.</div>}
    </div>
  );
}

function OrdersTab({ data }: any) {
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Platform Orders</div></div>
      {data?.orders?.map((o: any) => (
        <div key={o.id} className="row-item">
          <div style={{flex:1}}>
            <div style={{fontSize:'12px',fontWeight:600}}>#ORD-{o.id.substring(0,8)}</div>
            <div style={{fontSize:'11px',color:'#64748b'}}>{o.user?.name || 'Guest'} · {o.items?.length || 0} items</div>
          </div>
          <div className="text-right mr-8">
             <div style={{fontSize:'12px',fontWeight:600}}>{o.totalAmount?.toLocaleString()} EGP</div>
             <div style={{fontSize:'10px',color:'#94a3b8'}}>{o.paymentMethod}</div>
          </div>
          <span className="badge b-active">{o.status}</span>
        </div>
      ))}
    </div>
  );
}

function PayoutsTab({ data }: any) {
  return (
    <div className="card">
       <div className="card-header"><div className="card-title">Pending Payout Requests</div></div>
       {data?.payouts?.map((p: any) => (
         <div key={p.id} className="row-item">
            <div style={{flex:1}}>
               <div style={{fontSize:'12px',fontWeight:600}}>{p.seller?.storeName}</div>
               <div style={{fontSize:'11px',color:'#64748b'}}>{new Date(p.createdAt).toLocaleDateString()}</div>
            </div>
            <div style={{fontSize:'14px',fontWeight:600,marginRight:'20px'}}>{p.amount?.toLocaleString()} EGP</div>
            <button className="action-btn" style={{borderColor:'#0F6E56',color:'#085041'}}>Release Payment</button>
         </div>
       ))}
       {!data?.payouts?.length && <div className="py-20 text-center text-xs text-slate-400">No payout requests in queue.</div>}
    </div>
  );
}

function AnalyticsTab({ data }: any) {
  return (
    <div className="grid grid-cols-2 gap-6">
       <div className="card">
          <div className="card-title mb-4">Volume Distribution</div>
          <div className="flex flex-col gap-4">
             <MetricBar label="Direct Sales" value={65} color="#534AB7" />
             <MetricBar label="Flash Sales" value={25} color="#E24B4A" />
             <MetricBar label="Partner Referrals" value={10} color="#1D9E75" />
          </div>
       </div>
       <div className="card">
          <div className="card-title mb-4">Top Categories</div>
          {data?.categories?.slice(0,5).map((c: any) => (
             <div key={c.id} className="flex justify-between items-center py-2 border-bottom border-slate-50">
                <span className="text-xs text-slate-600">{c.name}</span>
                <span className="text-xs font-bold">{Math.floor(Math.random() * 500) + 100} units</span>
             </div>
          ))}
       </div>
    </div>
  );
}

function TaxonomyTab({ data, currentType, onTypeChange, onNameChange, nameValue, onCreate, onDelete }: any) {
  const items = currentType === 'category' ? data.categories : currentType === 'tag' ? data.tags : data.collections;
  return (
    <div className="grid grid-cols-3 gap-6">
       <div className="card col-span-1">
          <div className="card-title mb-4">Add Taxonomy</div>
          <form onSubmit={onCreate} className="flex flex-col gap-4">
             <select value={currentType} onChange={(e:any) => onTypeChange(e.target.value)} className="input-tax bg-white">
                <option value="category">Category</option>
                <option value="tag">Tag</option>
                <option value="collection">Collection</option>
             </select>
             <input required placeholder="Name" value={nameValue} onChange={(e) => onNameChange(e.target.value)} className="input-tax" />
             <button type="submit" className="action-btn bg-slate-900 text-white hover:bg-slate-800 py-2 border-none">Create Entry</button>
          </form>
       </div>
       <div className="card col-span-2">
          <div className="card-title mb-4">Existing {currentType}s</div>
          <div className="flex flex-col gap-1">
             {items?.map((item: any) => (
                <div key={item.id} className="row-item">
                   <div className="flex-1 text-xs font-medium">{item.name}</div>
                   <div className="text-[10px] text-slate-400 mr-4">slug: {item.slug}</div>
                   <button onClick={() => onDelete(currentType, item.id)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
             ))}
             {!items?.length && <div className="py-10 text-center text-xs text-slate-400">Empty set.</div>}
          </div>
       </div>
    </div>
  );
}

function SettingsTab({ data }: any) {
  return (
    <div className="card max-w-xl">
       <div className="card-title mb-6">Global Platform Settings</div>
       {data?.systemSettings?.map((s: any) => (
          <div key={s.key} className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
             <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">{s.key}</span>
                <span className="text-[10px] text-slate-300">Updated {new Date(s.updatedAt).toLocaleDateString()}</span>
             </div>
             <div className="flex gap-4 items-center">
                <input defaultValue={s.value} className="input-tax flex-1" />
                <button className="action-btn bg-white">Save</button>
             </div>
             <div className="text-[11px] text-slate-500 mt-2">{s.description}</div>
          </div>
       ))}
       {!data?.systemSettings?.length && <div className="py-10 text-center text-xs text-slate-400">No settings found. Seed data to initialize.</div>}
    </div>
  );
}

function MetricBar({ label, value, color }: any) {
   return (
      <div>
         <div className="flex justify-between text-[11px] mb-1">
            <span>{label}</span>
            <span className="font-bold">{value}%</span>
         </div>
         <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full" style={{width:`${value}%`, background:color}}></div>
         </div>
      </div>
   );
}

// SVGs matched from mockup
function OverviewIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".6"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".3"/></svg>; }
function SellersIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".7"/><path d="M1 14c0-2.8 2.2-5 5-5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".6"/><path d="M11 9l1.5 1.5L15 8" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8"/></svg>; }
function UsersIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.1" fill="none" opacity=".6"/><circle cx="11" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.1" fill="none" opacity=".6"/><path d="M1 14c0-2.5 1.8-4 4-4M7 14c0-2.5 1.8-4 4-4s4 1.5 4 4" stroke="currentColor" strokeWidth="1.1" fill="none" opacity=".5"/></svg>; }
function OrdersIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".7"/><rect x="5" y="5" width="6" height="1" rx=".5" fill="currentColor" opacity=".5"/><rect x="5" y="8" width="4" height="1" rx=".5" fill="currentColor" opacity=".4"/></svg>; }
function PayoutsIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="9" rx="2" fill="currentColor" opacity=".5"/><rect x="1" y="4" width="14" height="3" rx="1" fill="currentColor" opacity=".7"/><circle cx="11.5" cy="9.5" r="1.5" fill="#7F77DD"/></svg>; }
function AnalyticsIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><polyline points="1,12 5,7 8,10 11,4 15,8" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".7"/></svg>; }
function ModerationIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".6"/><path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8"/></svg>; }
function SettingsIcon() { return <svg className="nav-icon" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".7"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" stroke="currentColor" strokeWidth="1.2" stroke-linecap="round" fill="none" opacity=".5"/></svg>; }

function CreateUserModal({ form, onChange, onSubmit, onClose, loading, error }: any) {
  const update = (field: string, val: string) => onChange({ ...form, [field]: val });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Create New Account</div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input required className="form-input" placeholder="e.g. Ahmed Hassan" value={form.name} onChange={e => update('name', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input required type="email" className="form-input" placeholder="user@example.com" value={form.email} onChange={e => update('email', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input required type="password" className="form-input" placeholder="Min. 8 characters" minLength={8} value={form.password} onChange={e => update('password', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Account Role</label>
            <select className="form-input role-select" value={form.role} onChange={e => update('role', e.target.value)}>
              <option value="BUYER">🛍️ Buyer (Customer)</option>
              <option value="SELLER">🏪 Seller (Merchant)</option>
              <option value="ADMIN">🛡️ Admin (Staff)</option>
            </select>
          </div>

          {form.role === 'SELLER' && (
            <div className="form-group">
              <label className="form-label">Store Name</label>
              <input className="form-input" placeholder="e.g. Ahmed's Electronics" value={form.storeName} onChange={e => update('storeName', e.target.value)} />
              <div style={{fontSize:'10px',color:'#94a3b8',marginTop:4}}>Leave blank to auto-generate from name</div>
            </div>
          )}

          <div style={{display:'flex',gap:10,marginTop:20}}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : `Create ${form.role === 'BUYER' ? 'Customer' : form.role === 'SELLER' ? 'Seller' : 'Admin'} Account`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
