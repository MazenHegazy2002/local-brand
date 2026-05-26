'use client';
import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SellerStat {
  id: string;
  storeName: string;
  sales: number;
  revenue: number;
  rating: number | null;
}
interface RevenueChartPoint {
  date: string;
  revenue: number;
}
interface ProductStat {
  title: string;
  sales: number;
  revenue: number;
}
interface ReturnReason {
  reason: string;
  count: number;
}
interface ReturnedProduct {
  title: string;
  count: number;
}
interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  newUsers: number;
  conversionRate: number;
  revenueChart: RevenueChartPoint[];
  topSellers: SellerStat[];
  topProducts: ProductStat[];
  returns: { total: number; byReason: ReturnReason[] };
  mostReturnedProducts: ReturnedProduct[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Partial<AnalyticsData>>({});
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?period=${period}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {loading && <div className="text-center py-10">Loading analytics...</div>}

      {!loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Revenue"
              value={`${(data.totalRevenue || 0).toLocaleString()} EGP`}
            />
            <StatCard label="Orders" value={String(data.totalOrders || 0)} />
            <StatCard label="New Users" value={String(data.newUsers || 0)} />
            <StatCard
              label="Conversion Rate"
              value={`${((data.conversionRate || 0) * 100).toFixed(1)}%`}
            />
          </div>

          <div className="bg-white rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Revenue Over Time</h2>
            {data.revenueChart && data.revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#1e3b8a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-10 text-gray-500">No revenue data available</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Top Products</h2>
              {data.topProducts && data.topProducts.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">#</th>
                      <th className="pb-2">Product</th>
                      <th className="pb-2">Units Sold</th>
                      <th className="pb-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p: ProductStat, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 text-gray-400 font-bold">{i + 1}</td>
                        <td className="py-2 truncate max-w-[160px]" title={p.title}>
                          {p.title}
                        </td>
                        <td className="py-2">{p.sales}</td>
                        <td className="py-2 font-bold">
                          {Math.round(p.revenue).toLocaleString()} EGP
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 text-gray-500">No product data available</div>
              )}
            </div>

            {/* Returns Analytics */}
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-lg font-bold mb-1">Returns Analysis</h2>
              <p className="text-sm text-gray-500 mb-4">
                {data.returns?.total || 0} return requests in period
              </p>
              {data.returns?.byReason && data.returns.byReason.length > 0 ? (
                <div className="space-y-3">
                  {data.returns.byReason.map((r: ReturnReason) => {
                    const pct = data.returns?.total
                      ? Math.round((r.count / data.returns.total) * 100)
                      : 0;
                    return (
                      <div key={r.reason}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-700">{r.reason}</span>
                          <span className="text-gray-400">
                            {r.count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  No return requests in this period
                </div>
              )}
            </div>
          </div>

          {/* Most Returned Products (Task 5) */}
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-lg font-bold mb-1">Most Returned Products</h2>
            <p className="text-sm text-gray-500 mb-4">
              Products with highest return rates in period
            </p>
            {data.mostReturnedProducts && data.mostReturnedProducts.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Product</th>
                    <th className="pb-2">Returns</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mostReturnedProducts.map((p: ReturnedProduct, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="py-2 text-gray-400 font-bold">{i + 1}</td>
                      <td className="py-2 truncate max-w-[200px]" title={p.title}>
                        {p.title}
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">
                          {p.count} returns
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10 text-gray-500">No return data available</div>
            )}
          </div>

          {/* Top Sellers */}
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Top Sellers</h2>
            {data.topSellers && data.topSellers.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="pb-2">Store</th>
                    <th className="pb-2">Sales</th>
                    <th className="pb-2">Revenue</th>
                    <th className="pb-2">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.topSellers || []).map((seller: SellerStat) => (
                    <tr key={seller.id} className="border-t">
                      <td className="py-3">{seller.storeName}</td>
                      <td>{seller.sales}</td>
                      <td>{seller.revenue.toLocaleString()} EGP</td>
                      <td>{seller.rating?.toFixed(1) || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10 text-gray-500">No seller data available</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
