'use client';

import { useEffect, useState } from 'react';
import { csrfFetch } from '@/lib/csrf';

type Variant = {
  id: string;
  title: string;
  price: number;
  stockCount: number;
  attributes: string | null;
};
type Product = {
  id: string;
  title: string;
  basePrice: number;
  flashSalePrice: number | null;
  seller: { storeName: string } | null;
  images: { url: string }[];
  variants: Variant[];
};
type Line = {
  key: string;
  product: Product;
  variantId: string;
  quantity: number;
  size: string;
  color: string;
};

const SOURCES = [
  ['WHATSAPP', 'WhatsApp'],
  ['INSTAGRAM', 'Instagram'],
  ['FACEBOOK', 'Facebook'],
  ['PHONE', 'Phone call'],
  ['IN_PERSON', 'In person'],
  ['OTHER', 'Other'],
] as const;
const PAYMENTS = [
  ['CASH_ON_DELIVERY', 'Cash on delivery'],
  ['INSTAPAY', 'InstaPay'],
  ['VODAFONE_CASH', 'Vodafone Cash'],
] as const;

function options(v: Variant | undefined) {
  try {
    const a = v?.attributes ? JSON.parse(v.attributes) : {};
    return {
      sizes: Array.isArray(a.sizes) ? (a.sizes as string[]) : [],
      colors: Array.isArray(a.colors) ? (a.colors as string[]) : [],
    };
  } catch {
    return { sizes: [], colors: [] };
  }
}

const input =
  'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#534AB7]';

// Admin OS > Orders > New manual order: orders taken on WhatsApp, Instagram,
// the phone, etc. They go through the normal order flow (stock, seller
// alerts, commission, escrow).
export default function ManualOrderForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (orderId: string) => void;
}) {
  const [source, setSource] = useState('WHATSAPP');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [payment, setPayment] = useState('CASH_ON_DELIVERY');
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [known, setKnown] = useState<string | null>(null);

  // Product search.
  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/orders/manual?q=${encodeURIComponent(q.trim())}`);
        if (r.ok) setResults((await r.json()).products || []);
      } catch {
        /* keep last results */
      }
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  // Returning customer: fill in their name and email from the phone number.
  const lookup = async () => {
    const p = phone.replace(/[^\d]/g, '');
    if (p.length < 8) return;
    try {
      const r = await fetch(`/api/admin/orders/manual?phone=${p}`);
      const c = r.ok ? (await r.json()).customer : null;
      if (c) {
        if (!name) setName(c.name);
        if (!email && c.email) setEmail(c.email);
        setKnown(`Returning customer: ${c.name}`);
      } else setKnown(null);
    } catch {
      /* optional */
    }
  };

  const add = (p: Product) => {
    const v = p.variants[0];
    if (!v) return;
    const o = options(v);
    setLines(ls => [
      ...ls,
      {
        key: `${p.id}-${Date.now()}`,
        product: p,
        variantId: v.id,
        quantity: 1,
        size: o.sizes[0] ?? '',
        color: o.colors[0] ?? '',
      },
    ]);
  };
  const update = (key: string, patch: Partial<Line>) =>
    setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)));

  const priceOf = (l: Line) =>
    l.product.flashSalePrice ??
    l.product.variants.find(v => v.id === l.variantId)?.price ??
    l.product.basePrice;
  const subtotal = lines.reduce((s, l) => s + priceOf(l) * l.quantity, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!lines.length) return setError('Add at least one product.');
    setBusy(true);
    try {
      const res = await csrfFetch('/api/admin/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          customer: { name, phone, email },
          address: { street, city, governorate },
          items: lines.map(l => ({
            variantId: l.variantId,
            quantity: l.quantity,
            ...(l.size ? { selectedSize: l.size } : {}),
            ...(l.color ? { selectedColor: l.color } : {}),
          })),
          paymentMethod: payment,
          paid: payment !== 'CASH_ON_DELIVERY' && paid,
          notes: notes || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Could not create the order.');
      else onCreated(data.orderId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-6 p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-slate-900">New manual order</div>
            <div className="text-xs text-slate-500">
              For orders taken on WhatsApp, Instagram, the phone or in person. Stock, the seller and
              their earnings are updated like a website order.
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 text-xl px-2">
            ×
          </button>
        </div>

        <section className="grid gap-2 md:grid-cols-3">
          <label className="text-xs font-semibold text-slate-600">
            Order came from
            <select value={source} onChange={e => setSource(e.target.value)} className={input}>
              {SOURCES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Customer phone *
            <input
              required
              dir="ltr"
              inputMode="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onBlur={lookup}
              placeholder="01xxxxxxxxx"
              className={input}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Customer name *
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className={input}
            />
          </label>
          {known && <div className="md:col-span-3 text-xs text-emerald-700">{known}</div>}
          <label className="text-xs font-semibold text-slate-600">
            Email (optional)
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={input}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Governorate *
            <input
              required
              value={governorate}
              onChange={e => setGovernorate(e.target.value)}
              placeholder="Cairo"
              className={input}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            City / area *
            <input
              required
              value={city}
              onChange={e => setCity(e.target.value)}
              className={input}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600 md:col-span-3">
            Street address *
            <input
              required
              value={street}
              onChange={e => setStreet(e.target.value)}
              placeholder="Street, building, floor, apartment"
              className={input}
            />
          </label>
        </section>

        <section>
          <div className="text-xs font-semibold text-slate-600 mb-1">Products *</div>
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search products or stores…"
            className={input}
          />
          <div className="mt-2 max-h-48 overflow-y-auto border border-slate-100 rounded-lg divide-y">
            {results.map(p => (
              <button
                type="button"
                key={p.id}
                onClick={() => add(p)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
              >
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0].url} alt="" className="w-9 h-9 rounded object-cover" />
                ) : (
                  <span className="w-9 h-9 rounded bg-slate-100" />
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate">{p.title}</span>
                  <span className="block text-[11px] text-slate-400">
                    {p.seller?.storeName} · {p.flashSalePrice ?? p.basePrice} EGP
                  </span>
                </span>
                <span className="text-xs font-bold text-[#534AB7]">+ Add</span>
              </button>
            ))}
            {!results.length && (
              <div className="px-3 py-2 text-xs text-slate-400">No published products found.</div>
            )}
          </div>

          {lines.length > 0 && (
            <ul className="mt-3 space-y-2">
              {lines.map(l => {
                const v = l.product.variants.find(x => x.id === l.variantId);
                const o = options(v);
                return (
                  <li
                    key={l.key}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <span className="flex-1 min-w-[160px] text-sm">
                      {l.product.title}
                      <span className="block text-[11px] text-slate-400">
                        {l.product.seller?.storeName} · {priceOf(l)} EGP · stock{' '}
                        {v?.stockCount ?? 0}
                      </span>
                    </span>
                    {l.product.variants.length > 1 && (
                      <select
                        value={l.variantId}
                        onChange={e => update(l.key, { variantId: e.target.value })}
                        className="text-xs border border-slate-200 rounded px-2 py-1"
                      >
                        {l.product.variants.map(x => (
                          <option key={x.id} value={x.id}>
                            {x.title}
                          </option>
                        ))}
                      </select>
                    )}
                    {o.sizes.length > 0 && (
                      <select
                        value={l.size}
                        onChange={e => update(l.key, { size: e.target.value })}
                        className="text-xs border border-slate-200 rounded px-2 py-1"
                        aria-label="Size"
                      >
                        {o.sizes.map(s => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    )}
                    {o.colors.length > 0 && (
                      <select
                        value={l.color}
                        onChange={e => update(l.key, { color: e.target.value })}
                        className="text-xs border border-slate-200 rounded px-2 py-1"
                        aria-label="Colour"
                      >
                        {o.colors.map(c => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    )}
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={l.quantity}
                      onChange={e =>
                        update(l.key, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="w-16 text-xs border border-slate-200 rounded px-2 py-1"
                      aria-label="Quantity"
                    />
                    <button
                      type="button"
                      onClick={() => setLines(ls => ls.filter(x => x.key !== l.key))}
                      className="text-xs text-red-600 px-1"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="grid gap-2 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Payment
            <select value={payment} onChange={e => setPayment(e.target.value)} className={input}>
              {PAYMENTS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {payment !== 'CASH_ON_DELIVERY' && (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mt-5">
              <input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)} />
              Customer already paid
            </label>
          )}
          <label className="text-xs font-semibold text-slate-600 md:col-span-2">
            Notes (optional)
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              className={input}
            />
          </label>
        </section>

        {error && <div className="text-xs text-red-600">{error}</div>}

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <div className="text-xs text-slate-500">
            Products: <b className="text-slate-800">{subtotal.toLocaleString()} EGP</b>
            <span className="block">Shipping and VAT are added like a website order.</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#534AB7] text-white disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
