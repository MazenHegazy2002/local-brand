'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatEGP } from '@/lib/formatters';

interface FinancialStats {
  gmv: number;
  netRevenue: number;
  platformFees: number;
  vatCollected: number;
  shippingFees: number;
  pendingPayouts: number;
  paidPayouts: number;
  refundsIssued: number;
  orderCount: number;
  avgOrderValue: number;
  topSellers: Array<{ id: string; storeName: string; revenue: number; orders: number }>;
  dailySeries: Array<{ date: string; revenue: number; orders: number }>;
}

export default function AdminFinancialDashboard() {
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/financial?period=${period}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setStats(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const maxRevenue = stats?.dailySeries?.length
    ? Math.max(...stats.dailySeries.map((d) => d.revenue), 1)
    : 1;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin-os" className="text-xs text-slate-500 hover:underline">← Back to Admin</Link>
            <h1 className="text-3xl font-black text-slate-900 mt-1">Financial Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1">
            {(['7d', '30d', '90d', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  period === p ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p === 'all' ? 'All time' : `Last ${p}`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading financial data…</div>
        ) : !stats ? (
          <div className="py-20 text-center text-slate-400">No financial data available.</div>
        ) : (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <KpiCard label="GMV (Gross)" value={formatEGP(stats.gmv)} color="text-blue-600" />
              <KpiCard label="Platform Fees" value={formatEGP(stats.platformFees)} color="text-emerald-600" />
              <KpiCard label="Net Revenue" value={formatEGP(stats.netRevenue)} color="text-emerald-600" />
              <KpiCard label="VAT Collected" value={formatEGP(stats.vatCollected)} color="text-amber-600" />
              <KpiCard label="Shipping Fees" value={formatEGP(stats.shippingFees)} color="text-slate-600" />
              <KpiCard label="Refunds" value={formatEGP(stats.refundsIssued)} color="text-red-600" />
              <KpiCard label="Pending Payouts" value={formatEGP(stats.pendingPayouts)} color="text-amber-600" />
              <KpiCard label="Paid Payouts" value={formatEGP(stats.paidPayouts)} color="text-emerald-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl p-6 border border-slate-100">
                <div className="text-xs font-bold uppercase text-slate-400 mb-1">Orders</div>
                <div className="text-3xl font-black text-slate-900">{stats.orderCount.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100">
                <div className="text-xs font-bold uppercase text-slate-400 mb-1">Avg Order Value</div>
                <div className="text-3xl font-black text-slate-900">{formatEGP(stats.avgOrderValue)}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100">
                <div className="text-xs font-bold uppercase text-slate-400 mb-1">Net Revenue</div>
                <div className="text-3xl font-black text-emerald-600">{formatEGP(stats.netRevenue)}</div>
              </div>
            </div>

            {/* Revenue chart */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 mb-8">
              <h3 className="font-black text-lg mb-6">Revenue — {period === 'all' ? 'All time' : `Last ${period}`}</h3>
              {stats.dailySeries.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">No data for this period.</div>
              ) : (
                <div className="flex items-end gap-1 h-[200px]">
                  {stats.dailySeries.map((d) => (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center justify-end"
                      title={`${d.date}: ${formatEGP(d.revenue)} (${d.orders} orders)`}
                    >
                      <div
                        className="w-full bg-gradient-to-t from-[#0F6E56] to-emerald-400 rounded-t-sm hover:from-emerald-600 hover:to-emerald-300 transition-colors cursor-pointer"
                        style={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top sellers */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50">
                <h3 className="font-black text-lg">Top Sellers</h3>
              </div>
              {stats.topSellers.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-400">No seller sales yet.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                    <tr>
                      <th className="px-6 py-3">#</th>
                      <th className="px-6 py-3">Store</th>
                      <th className="px-6 py-3 text-right">Revenue</th>
                      <th className="px-6 py-3 text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {stats.topSellers.map((s, i) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 text-slate-400 font-black">{i + 1}</td>
                        <td className="px-6 py-3 font-bold text-slate-900">{s.storeName}</td>
                        <td className="px-6 py-3 text-right font-black text-emerald-600">{formatEGP(s.revenue)}</td>
                        <td className="px-6 py-3 text-right text-slate-600">{s.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100">
      <div className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-wider">{label}</div>
      <div className={`text-xl md:text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}
