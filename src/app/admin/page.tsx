'use client';

import { useState, useEffect } from 'react';
import Navbar from "@/components/Navbar";
import { getDashboardStats, updateSellerStatus } from "../actions/seller";
import { updateTaxSettings } from "../actions/admin";

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await getDashboardStats();
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

  useEffect(() => {
    refreshData();
  }, []);

  const handleApproveSeller = async (sellerId: string) => {
    try {
      await updateSellerStatus(sellerId, 'ACTIVE');
      await refreshData();
    } catch (err) {
      alert("Failed to approve seller");
    }
  };

  const handleSuspendSeller = async (sellerId: string) => {
    try {
      await updateSellerStatus(sellerId, 'SUSPENDED');
      await refreshData();
    } catch (err) {
      alert("Failed to suspend seller");
    }
  };

  if (loading && !data) {
    return (
      <main className="min-h-screen bg-[hsl(var(--background))]">
        <Navbar />
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-[#1e3b8a] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading Admin Dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[hsl(var(--background))]">
        <Navbar />
        <div className="flex h-screen items-center justify-center">
          <div className="text-red-600 font-bold">{error}</div>
        </div>
      </main>
    );
  }

  const { stats, sellers, orders, users, pendingSellers, categories, auditLogs, payouts } = data || {};

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      
      <div className="container py-12">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">
              Platform <span className="text-[hsl(var(--accent))]">Control</span>
            </h1>
            <p className="text-gray-400 text-sm tracking-widest uppercase font-bold">Administrative Oversight</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={refreshData}
              className="bg-white border border-gray-200 text-gray-700 px-6 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="glass p-8 rounded-3xl border border-gray-200 bg-white">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest block mb-4">Total Revenue</span>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-serif font-bold text-[hsl(var(--accent))]">
                {(stats?.revenue || 0).toLocaleString()}
              </span>
              <span className="text-sm text-gray-400">EGP</span>
            </div>
            <span className="text-emerald-500 text-xs">{stats?.totalOrders || 0} orders</span>
          </div>

          <div className="glass p-8 rounded-3xl border border-gray-200 bg-white">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest block mb-4">Active Sellers</span>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-serif font-bold text-gray-900">{stats?.totalSellers || 0}</span>
            </div>
            <span className="text-amber-500 text-xs">{pendingSellers?.length || 0} pending approval</span>
          </div>

          <div className="glass p-8 rounded-3xl border border-gray-200 bg-white">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest block mb-4">Total Users</span>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-serif font-bold text-gray-900">{stats?.totalUsers || 0}</span>
            </div>
            <span className="text-gray-400 text-xs">Registered accounts</span>
          </div>

          <div className="glass p-8 rounded-3xl border border-gray-200 bg-white">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest block mb-4">Products</span>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-serif font-bold text-gray-900">{stats?.totalProducts || 0}</span>
            </div>
            <span className="text-gray-400 text-xs">Active listings</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seller Approval Queue */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-serif font-bold text-gray-900">
                Seller <span className="text-gray-300">Queue</span>
              </h2>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                {pendingSellers?.length || 0} Pending
              </span>
            </div>
            
            {pendingSellers && pendingSellers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-widest font-bold">
                      <th className="pb-6">Store Name</th>
                      <th className="pb-6">Owner</th>
                      <th className="pb-6">Email</th>
                      <th className="pb-6">Status</th>
                      <th className="pb-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {pendingSellers.map((seller: any) => (
                      <tr key={seller.id} className="border-b border-gray-50 group hover:bg-gray-50 transition-colors">
                        <td className="py-6 font-bold text-gray-900">{seller.storeName}</td>
                        <td className="py-6 text-gray-600">{seller.user?.name}</td>
                        <td className="py-6 text-gray-500">{seller.user?.email}</td>
                        <td className="py-6">
                          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded">
                            {seller.status}
                          </span>
                        </td>
                        <td className="py-6">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleApproveSeller(seller.id)}
                              className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-all"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleSuspendSeller(seller.id)}
                              className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">✓</div>
                <p className="font-medium">No pending sellers</p>
                <p className="text-sm mt-1">All seller applications have been processed</p>
              </div>
            )}
          </div>

          {/* Recent Activity Log */}
          <div className="bg-white rounded-3xl border border-gray-200 p-10">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-8">
              Recent <span className="text-gray-300">Activity</span>
            </h2>
            
            <div className="space-y-6">
              {auditLogs && auditLogs.slice(0, 8).map((log: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <div className="w-2 h-2 rounded-full bg-[hsl(var(--accent))] mt-2 shrink-0"></div>
                  <div>
                    <p className="text-sm text-gray-800 font-medium">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      by {log.admin?.name || 'System'} • {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {(!auditLogs || auditLogs.length === 0) && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No recent activity
                </div>
              )}
            </div>
            
            <button className="w-full mt-8 py-4 border border-gray-200 rounded-2xl text-xs uppercase tracking-widest text-gray-400 font-bold hover:bg-gray-50 transition-all">
              View All Activity
            </button>
          </div>
        </div>

        {/* Quick Stats - Orders & Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Recent Orders */}
          <div className="bg-white rounded-3xl border border-gray-200 p-10">
            <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">Recent Orders</h2>
            <div className="space-y-4">
              {orders && orders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex justify-between items-center py-3 border-b border-gray-50">
                  <div>
                    <div className="font-medium text-gray-900">ORD-{order.id.substring(0, 8)}</div>
                    <div className="text-xs text-gray-500">{order.user?.name || 'Guest'} • {new Date(order.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{order.totalAmount?.toLocaleString()} EGP</div>
                    <span className={`text-xs px-2 py-0.5 rounded ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!orders || orders.length === 0) && (
                <p className="text-gray-400 text-sm text-center py-4">No orders yet</p>
              )}
            </div>
          </div>

          {/* Categories Overview */}
          <div className="bg-white rounded-3xl border border-gray-200 p-10">
            <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">Categories</h2>
            <div className="space-y-3">
              {categories && categories.slice(0, 6).map((cat: any) => (
                <div key={cat.id} className="flex justify-between items-center py-2">
                  <span className="text-gray-700">{cat.name}</span>
                  <span className="text-gray-400 text-sm">{cat.children?.length || 0} subcategories</span>
                </div>
              ))}
              {(!categories || categories.length === 0) && (
                <p className="text-gray-400 text-sm text-center py-4">No categories</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}