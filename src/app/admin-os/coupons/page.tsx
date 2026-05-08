"use client";
import { useState, useEffect } from 'react';

interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  expiryDate: string;
  isActive: boolean;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    code: '', discountType: 'PERCENTAGE', discountValue: '', minOrderValue: '', maxDiscount: '', usageLimit: '', expiryDate: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/coupons');
    const data = await res.json();
    setCoupons(data.coupons || []);
    setLoading(false);
  };

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ code: '', discountType: 'PERCENTAGE', discountValue: '', minOrderValue: '', maxDiscount: '', usageLimit: '', expiryDate: '' });
    fetchCoupons();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Coupon Management</h1>
        <button onClick={() => setShowForm(true)} className="bg-primary text-white px-4 py-2 rounded-lg">+ Create Coupon</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded font-mono font-bold">{coupon.code}</code>
              <span className={`px-2 py-1 rounded text-xs ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {coupon.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-2xl font-bold text-primary mb-2">
              {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `${coupon.discountValue} EGP`}
            </p>
            <div className="text-sm text-gray-600">
              <p>Used: {coupon.usedCount}/{coupon.usageLimit || '∞'}</p>
              <p>Min order: {coupon.minOrderValue || 0} EGP</p>
              <p>Expires: {new Date(coupon.expiryDate).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="text-center py-10 text-gray-500">Loading coupons...</div>}
      {!loading && coupons.length === 0 && <div className="text-center py-10 text-gray-500">No coupons found</div>}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Coupon</h2>
            <form onSubmit={createCoupon} className="space-y-4">
              <input type="text" placeholder="Coupon Code" required className="w-full border rounded-lg px-4 py-2"
                value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} />
              <select className="w-full border rounded-lg px-4 py-2"
                value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed Amount (EGP)</option>
              </select>
              <input type="number" placeholder="Discount Value" required className="w-full border rounded-lg px-4 py-2"
                value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} />
              <input type="number" placeholder="Min Order Value (EGP)" className="w-full border rounded-lg px-4 py-2"
                value={form.minOrderValue} onChange={e => setForm({...form, minOrderValue: e.target.value})} />
              <input type="number" placeholder="Max Discount (EGP)" className="w-full border rounded-lg px-4 py-2"
                value={form.maxDiscount} onChange={e => setForm({...form, maxDiscount: e.target.value})} />
              <input type="number" placeholder="Usage Limit" className="w-full border rounded-lg px-4 py-2"
                value={form.usageLimit} onChange={e => setForm({...form, usageLimit: e.target.value})} />
              <input type="date" required className="w-full border rounded-lg px-4 py-2"
                value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-primary text-white py-2 rounded-lg">Create</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}