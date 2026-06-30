'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui';
import { useConfirm } from '@/providers/ConfirmProvider';

interface CouponUsage {
  id: string;
  discount: number;
  createdAt: string;
  user: { name: string; email: string } | null;
  order: { id: string; totalAmount: number } | null;
}

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
  usages: CouponUsage[];
}

const EMPTY_FORM = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minOrderValue: '',
  maxDiscount: '',
  usageLimit: '',
  expiryDate: '',
};

interface CouponsPanelProps {
  showHeader?: boolean;
}

export default function CouponsPanel({ showHeader = false }: CouponsPanelProps) {
  const { confirm } = useConfirm();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedCouponId, setExpandedCouponId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons');
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
        isActive: true,
      };

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        await fetchCoupons();
      } else {
        const errData = await res.json();
        toast({ title: errData.message || 'Failed to create coupon.', variant: 'error' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error creating coupon.', variant: 'error' });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        await fetchCoupons();
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to update status.', variant: 'error' });
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Coupon',
      message: 'Are you sure you want to delete this coupon permanently?',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchCoupons();
      } else {
        toast({ title: 'Failed to delete coupon.', variant: 'error' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error deleting coupon.', variant: 'error' });
    }
  };

  const generateRandomCode = () => {
    const prefixes = ['SUMMER', 'BRANDY', 'EGYPT', 'SAVE', 'LOCAL', 'CHIC', 'STYLE'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(10 + Math.random() * 90); // e.g. 10 to 99
    setForm(prev => ({ ...prev, code: `${randomPrefix}${randomNum}` }));
  };

  const getExpiryCountdown = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`,
        classes: 'bg-red-50 text-red-600 border-red-100',
        expired: true,
      };
    } else if (diffDays === 0) {
      return {
        text: 'Expires today!',
        classes: 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse',
        expired: false,
      };
    } else {
      return {
        text: `${diffDays} day${diffDays === 1 ? '' : 's'} left`,
        classes: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        expired: false,
      };
    }
  };

  return (
    <div className="font-sans">
      {showHeader && (
        <div className="mb-6">
          <div className="mb-4">
            <Link
              href="/admin-os"
              className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
            >
              ← Back to Admin-OS
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Promo Codes & Coupons
              </h1>
              <p className="text-sm text-slate-500">
                Generate, monitor, and configure active storefront discounts.
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-sm"
            >
              + Create Coupon
            </button>
          </div>
        </div>
      )}

      {!showHeader && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">Promo Coupons</h2>
            <p className="text-xs text-slate-400">Deploy and track custom active promo codes.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors"
          >
            + Create Coupon
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Loading promo codes…</div>
      ) : coupons.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl py-20 text-center text-slate-400 text-sm">
          No active coupons found. Create one to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {coupons.map(coupon => {
            const countdown = getExpiryCountdown(coupon.expiryDate);
            const isExpanded = expandedCouponId === coupon.id;

            return (
              <div
                key={coupon.id}
                className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md"
              >
                <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <code className="bg-slate-100 px-3 py-1 rounded-lg font-mono font-black text-slate-800 text-sm uppercase border border-slate-200">
                        {coupon.code}
                      </code>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${countdown.classes}`}
                      >
                        {countdown.text}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          coupon.isActive
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {coupon.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-3xl font-black text-slate-900">
                        {coupon.discountType === 'PERCENTAGE'
                          ? `${coupon.discountValue}%`
                          : `${coupon.discountValue} EGP`}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">discount</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-500">
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">
                          Used Count
                        </p>
                        <p className="font-bold text-slate-800">
                          {coupon.usedCount} / {coupon.usageLimit || '∞'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">
                          Min Order
                        </p>
                        <p className="font-bold text-slate-800">{coupon.minOrderValue || 0} EGP</p>
                      </div>
                      {coupon.maxDiscount && (
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">
                            Max Discount
                          </p>
                          <p className="font-bold text-slate-800">{coupon.maxDiscount} EGP</p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">
                          Expiry Date
                        </p>
                        <p className="font-bold text-slate-800">
                          {new Date(coupon.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col lg:flex-row gap-2 self-stretch justify-end md:justify-center md:items-end">
                    <button
                      onClick={() => setExpandedCouponId(isExpanded ? null : coupon.id)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {isExpanded ? 'Hide Logs' : `Logs (${coupon.usages?.length || 0})`}
                    </button>
                    <button
                      onClick={() => handleToggleActive(coupon.id, coupon.isActive)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                        coupon.isActive
                          ? 'border border-amber-200 text-amber-700 hover:bg-amber-50'
                          : 'bg-emerald-900 text-white hover:bg-emerald-800'
                      }`}
                    >
                      {coupon.isActive ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteCoupon(coupon.id)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-6">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
                      Redemption Logs ({coupon.usages?.length || 0})
                    </h3>
                    {!coupon.usages || coupon.usages.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No redemptions logged yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200/60 text-slate-400 uppercase tracking-widest font-black text-[9px]">
                              <th className="pb-3">Customer</th>
                              <th className="pb-3">Order ID</th>
                              <th className="pb-3">Discount Saved</th>
                              <th className="pb-3">Date / Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {coupon.usages.map(usage => (
                              <tr
                                key={usage.id}
                                className="border-b border-slate-100/50 hover:bg-slate-100/20"
                              >
                                <td className="py-3">
                                  <p className="font-bold text-slate-800">
                                    {usage.user?.name || 'Guest'}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {usage.user?.email || '—'}
                                  </p>
                                </td>
                                <td className="py-3 font-mono text-slate-400 select-all truncate max-w-[120px]">
                                  {usage.order?.id || '—'}
                                </td>
                                <td className="py-3 font-black text-slate-800">
                                  EGP {usage.discount.toLocaleString()}
                                </td>
                                <td className="py-3 text-slate-500">
                                  {new Date(usage.createdAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">
              Create Promo Coupon
            </h2>
            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Coupon Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUMMER25"
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2 font-mono uppercase font-black"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    🎲 Auto
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Discount Type
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs"
                    value={form.discountType}
                    onChange={e => setForm({ ...form, discountType: e.target.value })}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed (EGP)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Value
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 15"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold"
                    value={form.discountValue}
                    onChange={e => setForm({ ...form, discountValue: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Min Order (EGP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs"
                    value={form.minOrderValue}
                    onChange={e => setForm({ ...form, minOrderValue: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Max Discount (EGP)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Optional"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs"
                    value={form.maxDiscount}
                    onChange={e => setForm({ ...form, maxDiscount: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs"
                    value={form.usageLimit}
                    onChange={e => setForm({ ...form, usageLimit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs"
                    value={form.expiryDate}
                    onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
