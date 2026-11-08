'use client';

import { useEffect, useState } from 'react';

type Details = {
  user: any;
  orders: any[];
  totalSpent: number;
  referredUsers: number;
};

const egp = (n: unknown) => `${Number(n || 0).toLocaleString()} EGP`;
const date = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800 text-right break-all">{value ?? '—'}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase text-slate-400 font-semibold">{label}</div>
      <div className="text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

// Admin OS > Users: click a user to see their full details (like sellers).
export default function UserDetailsModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/users/${userId}/details`)
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok) setData(d);
        else setError(d.error || 'Could not load this user.');
      })
      .catch(e => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [userId]);

  const u = data?.user;
  const a = u?.affiliate;
  const role = a ? 'AFFILIATE' : u?.role === 'CO_ADMIN' ? 'CO-ADMIN' : u?.role;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-6 p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 font-bold flex items-center justify-center overflow-hidden shrink-0">
              {u?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (u?.name || '?').charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-slate-900 truncate">
                {u?.name || 'Loading…'}
              </div>
              <div className="text-xs text-slate-500 truncate">{u?.email}</div>
            </div>
            {role && (
              <span className="rounded-full bg-violet-50 text-violet-700 px-2.5 py-0.5 text-[11px] font-bold">
                {role}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 text-2xl px-2">
            ×
          </button>
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}

        {u && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat label="Orders" value={u._count.orders} />
              <Stat label="Total spent" value={egp(data!.totalSpent)} />
              <Stat label="Loyalty points" value={u.loyaltyPoints} />
              <Stat label="Reviews" value={u._count.reviews} />
            </div>

            <section>
              <div className="text-xs font-bold text-slate-700 mb-1">Account</div>
              <Row label="Phone" value={u.phone || '—'} />
              <Row
                label="Email verified"
                value={u.emailVerified ? `Yes (${date(u.emailVerified)})` : 'No'}
              />
              <Row label="Joined" value={date(u.createdAt)} />
              <Row
                label="Status"
                value={u.deletedAt ? `Suspended (${date(u.deletedAt)})` : 'Active'}
              />
              <Row label="Referred by code" value={u.referredBySlug || '—'} />
              <Row label="Wishlist items" value={u._count.wishlist} />
              <Row label="User ID" value={<span className="font-mono text-[11px]">{u.id}</span>} />
            </section>

            {a && (
              <section>
                <div className="text-xs font-bold text-slate-700 mb-1">Affiliate</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                  <Stat label="Total earned" value={egp(a.totalEarnedEgp)} />
                  <Stat label="Pending" value={egp(a.pendingEarningsEgp)} />
                  <Stat label="Conversions" value={a.totalConversions} />
                  <Stat label="Signed up via link" value={data!.referredUsers} />
                </div>
                <Row label="Status" value={a.status} />
                <Row label="Tier / level" value={`${a.tier} · level ${a.level}`} />
                <Row label="Type" value={a.type} />
                <Row label="Promo code" value={<span className="font-mono">{a.promoCode}</span>} />
                <Row
                  label="Referral link"
                  value={<span className="font-mono">brandyy.shop/?ref={a.referralSlug}</span>}
                />
                <Row
                  label="Commission / discount"
                  value={`${a.customCommissionPct ?? 'default'}% / ${a.customDiscountPct ?? 'default'}%`}
                />
                <Row
                  label="Platform"
                  value={
                    a.platform
                      ? `${a.platform}${a.platformFollowers ? ` · ${Number(a.platformFollowers).toLocaleString()} followers` : ''}`
                      : '—'
                  }
                />
                <Row label="Category focus" value={a.categoryFocus || '—'} />
                <Row label="Promo code uses" value={a._count.promoUsages} />
                <Row label="Affiliates they referred" value={a._count.referralsMade} />
                <Row
                  label="Payout"
                  value={
                    a.payoutMethod
                      ? `${a.payoutMethod}${a.payoutDetails ? ` · ${a.payoutDetails}` : ''}`
                      : '—'
                  }
                />
                <Row
                  label="Applied / approved"
                  value={`${date(a.createdAt)} / ${date(a.approvedAt)}`}
                />
                {a.applicationNote && <Row label="Application note" value={a.applicationNote} />}
                {a.adminNote && <Row label="Admin note" value={a.adminNote} />}
                {a.commissions.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1">
                      Latest commissions ({a._count.commissions} total)
                    </div>
                    {a.commissions.map((c: any) => (
                      <div
                        key={c.id}
                        className="flex justify-between text-xs py-1 border-b border-slate-100"
                      >
                        <span className="font-mono">#ORD-{c.orderId.slice(0, 8)}</span>
                        <span>{egp(c.orderTotalEgp)}</span>
                        <span className="font-semibold">{egp(c.commissionEgp)}</span>
                        <span className="text-slate-500">{c.status}</span>
                        <span className="text-slate-400">{date(c.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {u.sellerProfile && (
              <section>
                <div className="text-xs font-bold text-slate-700 mb-1">Store</div>
                <Row label="Store name" value={u.sellerProfile.storeName} />
                <Row label="Status" value={u.sellerProfile.status} />
                <Row
                  label="Location"
                  value={
                    [u.sellerProfile.city, u.sellerProfile.governorate]
                      .filter(Boolean)
                      .join(', ') || '—'
                  }
                />
              </section>
            )}

            <section>
              <div className="text-xs font-bold text-slate-700 mb-1">
                Addresses ({u.addresses.length})
              </div>
              {u.addresses.length ? (
                u.addresses.map((ad: any) => (
                  <div
                    key={ad.id}
                    className="text-xs text-slate-700 py-1 border-b border-slate-100"
                  >
                    {[ad.street, ad.city, ad.governorate, ad.country].filter(Boolean).join(', ')}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">No saved addresses.</div>
              )}
            </section>

            <section>
              <div className="text-xs font-bold text-slate-700 mb-1">Latest orders</div>
              {data!.orders.length ? (
                data!.orders.map(o => (
                  <div
                    key={o.id}
                    className="flex justify-between gap-2 text-xs py-1 border-b border-slate-100"
                  >
                    <span className="font-mono">#ORD-{o.id.slice(0, 8)}</span>
                    <span>{o._count.items} items</span>
                    <span className="font-semibold">{egp(o.totalAmount)}</span>
                    <span className="text-slate-500">{o.status}</span>
                    <span className="text-slate-400">{date(o.createdAt)}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">No orders yet.</div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
