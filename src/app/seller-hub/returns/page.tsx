'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ReturnRequest {
  id: string;
  reason: string;
  details: string;
  status: string;
  createdAt: string;
  orderItem: {
    id: string;
    productTitleSnapshot: string;
    quantity: number;
    variant?: { title: string };
    order: {
      id: string;
      user: { name: string };
      createdAt: string;
    };
  };
}

export default function ReturnsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'>('all');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/seller-hub');
    } else if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (role !== 'SELLER') router.push('/dashboard');
    }
  }, [status, session, router]);

  const fetchReturns = async () => {
    try {
      const res = await fetch('/api/rma');
      if (res.ok) {
        const data = await res.json();
        setReturns(data.returns || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/rma', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, notes })
      });
      if (res.ok) {
        await fetchReturns();
        setSelectedReturn(null);
        setNotes('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const filteredReturns = returns.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { bg: 'bg-amber-100', text: 'text-amber-800' };
      case 'APPROVED':
        return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'REJECTED':
        return { bg: 'bg-red-100', text: 'text-red-800' };
      case 'COMPLETED':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-800' };
    }
  };

  if (loading) {
    return <div className="db"><div className="main">Loading...</div></div>;
  }

  return (
    <div className="db">
      <div className="sidebar">
        <div className="logo">SellerHub</div>
        <Link href="/seller-hub" className="nav-item">Overview</Link>
        <Link href="/seller-hub/orders" className="nav-item">Orders</Link>
        <Link href="/seller-hub/products" className="nav-item">Products</Link>
        <Link href="/seller-hub/returns" className="nav-item active">Returns</Link>
        <Link href="/seller-hub/settings" className="nav-item">Settings</Link>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="page-title">Return Requests</div>
          <span className="text-xs text-slate-500">{returns.length} total</span>
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-[#0F6E56] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-[#0F6E56]'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="hidden md:flex row-item font-bold text-[11px] text-slate-400 uppercase mb-2">
            <span className="flex-1">Product</span>
            <span className="w-32">Customer</span>
            <span className="w-24">Reason</span>
            <span className="w-24">Date</span>
            <span className="w-24 text-center">Status</span>
            <span className="w-32"></span>
          </div>
          {filteredReturns.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400">No return requests</div>
          ) : (
            filteredReturns.map(ret => {
              const badge = getStatusBadge(ret.status);
              return (
                <div key={ret.id} className="row-item flex-col items-start">
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{ret.orderItem?.productTitleSnapshot}</div>
                      <div className="text-xs text-slate-500">Qty: {ret.orderItem?.quantity} · ORD-{ret.orderItem?.order?.id?.slice(0,8)}</div>
                    </div>
                    <div className="w-32 text-sm text-slate-600">{ret.orderItem?.order?.user?.name}</div>
                    <div className="w-24 text-xs text-slate-500">{ret.reason}</div>
                    <div className="w-24 text-xs text-slate-500">{new Date(ret.createdAt).toLocaleDateString()}</div>
                    <div className="w-24 flex justify-center">
                      <span className={`badge ${badge.bg} ${badge.text}`}>{ret.status}</span>
                    </div>
                    <div className="w-32">
                      <button onClick={() => setSelectedReturn(ret)} className="text-xs text-[#0F6E56] hover:underline">View Details</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedReturn && (
        <div className="modal-overlay" onClick={() => setSelectedReturn(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="card-title mb-4">Return Request Details</h3>
            <div className="space-y-4 mb-6">
              <div>
                <div className="text-xs text-slate-500">Product</div>
                <div className="font-medium">{selectedReturn.orderItem?.productTitleSnapshot}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Customer</div>
                <div className="font-medium">{selectedReturn.orderItem?.order?.user?.name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Reason</div>
                <div className="font-medium">{selectedReturn.reason}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Details</div>
                <div className="text-sm">{selectedReturn.details || 'No additional details'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Status</div>
                <span className={`badge ${getStatusBadge(selectedReturn.status).bg} ${getStatusBadge(selectedReturn.status).text}`}>
                  {selectedReturn.status}
                </span>
              </div>
            </div>
            {selectedReturn.status === 'PENDING' && (
              <>
                <div className="mb-4">
                  <label className="block text-xs text-slate-500 mb-1">Processing Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="input-field"
                    rows={3}
                    placeholder="Add notes..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(selectedReturn.id, 'APPROVED')}
                    disabled={processing}
                    className="flex-1 py-3 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(selectedReturn.id, 'REJECTED')}
                    disabled={processing}
                    className="flex-1 py-3 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </>
            )}
            {selectedReturn.status === 'APPROVED' && (
              <button
                onClick={() => updateStatus(selectedReturn.id, 'COMPLETED')}
                disabled={processing}
                className="w-full py-3 bg-[#0F6E56] text-white rounded font-medium hover:opacity-90 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Mark Complete (Refund Processed)'}
              </button>
            )}
            <button onClick={() => setSelectedReturn(null)} className="w-full py-3 border border-slate-200 rounded font-medium mt-2">
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .db { display: flex; min-height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif; }
        .sidebar { width: 186px; flex-shrink: 0; background: #0F6E56; padding: 16px 0; display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; }
        .logo { padding: 0 16px 20px; font-size: 17px; font-weight: 500; color: #fff; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.7); transition: all 0.2s; }
        .nav-item:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .nav-item.active { color: #fff; background: rgba(255,255,255,0.1); font-weight: 500; }
        .main { flex: 1; min-width: 0; padding: 24px 32px; overflow: auto; }
        .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
        .page-title { font-size: 20px; font-weight: 500; color: #1e293b; }
        .card { background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.06); padding: 20px; }
        .row-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f8fafc; }
        .row-item:last-child { border-bottom: none; }
        .row-item.flex-col { flex-direction: column; align-items: stretch; }
        .badge { font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 4px; }
        .input-field { width: 100%; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; font-size: 13px; outline: none; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-content { background: #fff; width: 100%; max-width: 500px; padding: 32px; border-radius: 16px; }
        .card-title { font-size: 16px; font-weight: 600; color: #1e293b; }
      `}</style>
    </div>
  );
}