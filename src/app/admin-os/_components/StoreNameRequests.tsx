'use client';

// Sellers' store-name change requests: approve applies the new name, reject keeps the old one.
// Shows nothing when there are no open requests.

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

interface NameRequest {
  id: string;
  storeName: string;
  pendingStoreName: string;
  pendingStoreNameAt: string | null;
  user: { name: string | null; email: string | null } | null;
}

export default function StoreNameRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<NameRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/store-name-requests');
      if (res.ok) setRequests((await res.json()).requests || []);
    } catch {}
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const decide = async (r: NameRequest, action: 'approve' | 'reject') => {
    setBusy(r.id + action);
    try {
      const res = await fetch('/api/admin/store-name-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId: r.id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast({ variant: 'success', title: action === 'approve' ? `Renamed to "${r.pendingStoreName}"` : 'Request declined' });
      await load();
    } catch (e) {
      toast({ variant: 'error', title: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  if (!requests.length) return null;
  return (
    <div style={{ border: '1px solid #fcd34d', background: '#fffbeb', borderRadius: 12, padding: 12, margin: '0 0 12px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
        ✏️ Store name change requests ({requests.length})
      </div>
      {requests.map(r => (
        <div key={r.id} className="flex items-center gap-3 flex-wrap" style={{ padding: '6px 0', borderTop: '1px solid #fde68a' }}>
          <div style={{ flex: 1, minWidth: 220, fontSize: 12 }}>
            <b>{r.storeName}</b> → <b style={{ color: '#0f6b50' }}>{r.pendingStoreName}</b>
            <div style={{ color: '#64748b', fontSize: 11 }}>
              {r.user?.name} {r.user?.email ? `(${r.user.email})` : ''}
            </div>
          </div>
          <button
            disabled={!!busy}
            onClick={() => decide(r, 'approve')}
            className="px-3 py-1.5 text-xs font-bold rounded-lg text-white"
            style={{ background: '#0f6b50' }}
          >
            Approve
          </button>
          <button
            disabled={!!busy}
            onClick={() => decide(r, 'reject')}
            className="px-3 py-1.5 text-xs font-bold rounded-lg"
            style={{ background: '#f1f5f9', color: '#475569' }}
          >
            Reject
          </button>
        </div>
      ))}
    </div>
  );
}
