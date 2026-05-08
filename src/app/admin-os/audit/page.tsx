'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDateShort } from '@/lib/formatters';

interface AuditEntry {
  id: string;
  adminId: string;
  action: string;
  targetId: string | null;
  details: string | null;
  createdAt: string;
  admin?: {
    name: string;
    email: string;
  };
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/audit');
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();
  const filteredLogs = logs.filter((l) => {
    const matchesAction = actionFilter === 'all' || l.action === actionFilter;
    const q = filter.toLowerCase().trim();
    if (!q) return matchesAction;
    return (
      matchesAction &&
      (l.admin?.name?.toLowerCase().includes(q) ||
        l.admin?.email?.toLowerCase().includes(q) ||
        l.details?.toLowerCase().includes(q) ||
        l.targetId?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/admin-os" className="text-xs text-slate-500 hover:underline">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-black text-slate-900 mt-1">Audit Log</h1>
          <p className="text-sm text-slate-500">Every admin action is recorded here for compliance.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 flex flex-col md:flex-row gap-3">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search name, email, target, or details..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm"
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm"
          >
            <option value="all">All actions</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-400">Loading audit log…</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-16 text-center text-slate-400">No audit entries match your filters.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="px-6 py-3">When</th>
                  <th className="px-6 py-3">Admin</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateShort(log.createdAt)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-xs font-bold text-slate-900">{log.admin?.name || 'Unknown'}</div>
                      <div className="text-[10px] text-slate-400">{log.admin?.email}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-block px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-bold uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs font-mono text-slate-500 truncate max-w-[120px]">
                      {log.targetId?.slice(0, 10) || '—'}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-600 max-w-md truncate">{log.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
