"use client";
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>({});
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
        <select value={period} onChange={e => setPeriod(e.target.value)} className="border rounded-lg px-4 py-2">
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
            <StatCard label="Total Revenue" value={`${(data.totalRevenue || 0).toLocaleString()} EGP`} />
            <StatCard label="Orders" value={String(data.totalOrders || 0)} />
            <StatCard label="New Users" value={String(data.newUsers || 0)} />
            <StatCard label="Conversion Rate" value={`${((data.conversionRate || 0) * 100).toFixed(1)}%`} />
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
                  {(data.topSellers || []).map((seller: any, i: number) => (
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