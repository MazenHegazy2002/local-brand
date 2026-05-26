'use client';

// Marketing tab — top-level for everything growth/retention.
// Sub-tabs:
//   1. Campaigns       (one-shot blasts, manual or scheduled)
//   2. Flash Sales     (per-product price-and-time flash deals)
//   3. Email Templates (editable transactional copy)
//   4. Abandoned Carts (recovery queue with manual nudge)
//
// We render each sub-tab as a thin wrapper because the schema is fully
// separated: this keeps the surface area small and lets future contributors
// add a new sub-tab without rewriting the parent.

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import CouponsPanel from './CouponsPanel';

type SubTab = 'campaigns' | 'flash' | 'templates' | 'abandoned' | 'coupons';

export default function MarketingTab() {
  const [sub, setSub] = useState<SubTab>('campaigns');

  return (
    <div>
      <div className="mkt-tabs">
        {[
          { key: 'campaigns', label: 'Campaigns', icon: '📣' },
          { key: 'flash', label: 'Flash Sales', icon: '⚡' },
          { key: 'templates', label: 'Email Templates', icon: '✉️' },
          { key: 'abandoned', label: 'Abandoned Carts', icon: '🛒' },
          { key: 'coupons', label: 'Promo Coupons', icon: '🎫' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setSub(t.key as SubTab)}
            className={`mkt-tab ${sub === t.key ? 'is-active' : ''}`}
          >
            <span className="text-base">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {sub === 'campaigns' && <CampaignsPanel />}
        {sub === 'flash' && <FlashSalesPanel />}
        {sub === 'templates' && <EmailTemplatesPanel />}
        {sub === 'abandoned' && <AbandonedCartsPanel />}
        {sub === 'coupons' && <CouponsPanel showHeader={false} />}
      </div>

      <style jsx>{`
        .mkt-tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: #f1f5f9;
          border-radius: 10px;
          width: fit-content;
        }
        .mkt-tab {
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 500;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mkt-tab.is-active {
          background: #fff;
          color: #534ab7;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
}

// ─── Campaigns ──────────────────────────────────────────────────────────────
interface Campaign {
  id: string;
  name: string;
  channel: 'EMAIL' | 'PUSH' | 'SMS' | 'IN_APP';
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
}

function CampaignsPanel() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'EMAIL' | 'PUSH' | 'SMS' | 'IN_APP'>('EMAIL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/marketing/campaigns');
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        channel,
        subject: channel === 'EMAIL' ? subject : undefined,
        body,
        ctaUrl: ctaUrl || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      };

      const res = await fetch('/api/admin/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        // Reset form
        setName('');
        setChannel('EMAIL');
        setSubject('');
        setBody('');
        setCtaUrl('');
        setScheduledAt('');
        await load();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create campaign');
      }
    } catch (error) {
      console.error(error);
      alert('Error creating campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Marketing campaigns</h2>
        <button className="card-action" onClick={() => setShowModal(true)}>
          + New campaign
        </button>
      </div>
      <p className="card-sub">One-shot email/push/SMS blasts to a segment of customers.</p>
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          No campaigns yet. Create one to send a targeted message.
        </div>
      ) : (
        <table className="mkt-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Opens</th>
              <th>Clicks</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.channel}</td>
                <td>
                  <Pill status={c.status} />
                </td>
                <td>
                  {c.sentCount}/{c.recipientCount}
                </td>
                <td>{c.openCount}</td>
                <td>{c.clickCount}</td>
                <td className="text-xs text-slate-500">
                  {c.sentAt
                    ? new Date(c.sentAt).toLocaleString()
                    : c.scheduledAt
                      ? '⏱ ' + new Date(c.scheduledAt).toLocaleString()
                      : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl text-left"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">
              Create Campaign
            </h2>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eid Al-Adha Mega Promo"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Channel
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs"
                    value={channel}
                    onChange={e => setChannel(e.target.value as any)}
                  >
                    <option value="EMAIL">Email 📣</option>
                    <option value="PUSH">Web Push ✉️</option>
                    <option value="SMS">SMS 📱</option>
                    <option value="IN_APP">In-App Banner 🎫</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Scheduled At
                  </label>
                  <input
                    type="datetime-local"
                    placeholder="Leave blank to send now"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                  />
                </div>
              </div>

              {channel === 'EMAIL' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    required={channel === 'EMAIL'}
                    placeholder="e.g. Exclusive Eid Savings Inside!"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Message Body / Content
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={
                    channel === 'SMS'
                      ? 'Type SMS copy (max 160 chars recommended)…'
                      : 'Type your campaign copy here (markdown supported for email)…'
                  }
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  CTA URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. /shop or https://lolozozo.shop/sale"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono"
                  value={ctaUrl}
                  onChange={e => setCtaUrl(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {saving ? 'Creating…' : 'Create & Send'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{tableStyles}</style>
    </div>
  );
}

// ─── Flash Sales ────────────────────────────────────────────────────────────
interface FlashProduct {
  id: string;
  title: string;
  basePrice: number;
  flashSalePrice: number | null;
  flashSaleStartsAt: string | null;
  flashSaleEndsAt: string | null;
  flashSaleLimit: number | null;
  published: boolean;
  stockCount: number;
  images: { url: string }[];
  seller: { storeName: string };
  category: { name: string } | null;
}

interface SearchProduct {
  id: string;
  title: string;
  basePrice: number;
  images: { url: string; isPrimary?: boolean }[];
  seller?: { storeName: string };
}

function flashSaleStatus(p: FlashProduct): 'active' | 'upcoming' | 'expired' | 'none' {
  if (!p.flashSalePrice || !p.flashSaleEndsAt) return 'none';
  const now = Date.now();
  const ends = new Date(p.flashSaleEndsAt).getTime();
  if (ends <= now) return 'expired';
  if (p.flashSaleStartsAt && new Date(p.flashSaleStartsAt).getTime() > now) return 'upcoming';
  return 'active';
}

// Format a Date to the datetime-local input value (yyyy-MM-ddTHH:mm)
function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function FlashSalesPanel() {
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'expired'>('active');
  const [items, setItems] = useState<FlashProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Schedule form state
  const [showForm, setShowForm] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null);
  const [formPrice, setFormPrice] = useState('');
  const [formStartsAt, setFormStartsAt] = useState('');
  const [formEndsAt, setFormEndsAt] = useState('');
  const [formLimit, setFormLimit] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/flash-sales?status=${filter}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.products || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Debounced product search
  useEffect(() => {
    if (!searchQ.trim()) {
      setSearchResults([]);
      return;
    }
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(searchQ)}&limit=8`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.products || []);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [searchQ]);

  const handleSchedule = async () => {
    if (!selectedProduct) return;
    if (!formPrice || !formEndsAt) {
      showToast('Fill in price and end time');
      return;
    }
    const price = parseFloat(formPrice);
    if (isNaN(price) || price <= 0) {
      showToast('Invalid price');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/flash-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          flashSalePrice: price,
          flashSaleStartsAt: formStartsAt ? new Date(formStartsAt).toISOString() : null,
          flashSaleEndsAt: new Date(formEndsAt).toISOString(),
          flashSaleLimit: formLimit ? parseInt(formLimit) : null,
        }),
      });
      if (res.ok) {
        showToast('Flash sale scheduled!');
        setShowForm(false);
        setSelectedProduct(null);
        setSearchQ('');
        setFormPrice('');
        setFormStartsAt('');
        setFormEndsAt('');
        setFormLimit('');
        load();
      } else {
        const err = await res.json();
        showToast(err.error || 'Error saving');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (productId: string, title: string) => {
    if (!confirm(`Remove flash sale from "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/flash-sales/${productId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Flash sale removed');
        load();
      } else {
        showToast('Error removing flash sale');
      }
    } catch {
      showToast('Error removing flash sale');
    }
  };

  // Pre-fill form when editing an existing flash sale
  const handleEdit = (p: FlashProduct) => {
    setSelectedProduct({ id: p.id, title: p.title, basePrice: p.basePrice, images: p.images });
    setFormPrice(String(p.flashSalePrice ?? ''));
    setFormStartsAt(p.flashSaleStartsAt ? toDatetimeLocal(new Date(p.flashSaleStartsAt)) : '');
    setFormEndsAt(p.flashSaleEndsAt ? toDatetimeLocal(new Date(p.flashSaleEndsAt)) : '');
    setFormLimit(p.flashSaleLimit != null ? String(p.flashSaleLimit) : '');
    setSearchQ('');
    setSearchResults([]);
    setShowForm(true);
  };

  const statusBadge = (p: FlashProduct) => {
    const s = flashSaleStatus(p);
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      active: { bg: '#d1fae5', fg: '#065f46', label: 'LIVE' },
      upcoming: { bg: '#dbeafe', fg: '#1e40af', label: 'SCHEDULED' },
      expired: { bg: '#f1f5f9', fg: '#64748b', label: 'EXPIRED' },
      none: { bg: '#fef3c7', fg: '#92400e', label: 'NONE' },
    };
    const c = map[s];
    return (
      <span
        style={{
          background: c.bg,
          color: c.fg,
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          padding: '2px 6px',
          borderRadius: 4,
          letterSpacing: '0.05em',
        }}
      >
        {c.label}
      </span>
    );
  };

  // Default end time = 24 h from now
  const defaultEndsAt = toDatetimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000));

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#1e293b',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 13,
            zIndex: 9999,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Header card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h2 className="card-title">Flash Sale Scheduler</h2>
          <button
            className="card-action"
            onClick={() => {
              setShowForm(v => !v);
              setSelectedProduct(null);
              setSearchQ('');
              setFormPrice('');
              setFormStartsAt('');
              setFormEndsAt(defaultEndsAt);
              setFormLimit('');
            }}
          >
            {showForm ? '✕ Cancel' : '+ Schedule flash sale'}
          </button>
        </div>
        <p className="card-sub">
          Schedule time-limited discounts on any product. Active sales appear on{' '}
          <a href="/flash-sales" target="_blank" style={{ color: '#534ab7' }}>
            /flash-sales
          </a>
          .
        </p>

        {/* Inline scheduler form */}
        {showForm && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 20,
              marginTop: 16,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
              {selectedProduct ? `Editing: ${selectedProduct.title}` : 'Select a product'}
            </div>

            {/* Product search */}
            {!selectedProduct && (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search products by name…"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
                {searching && (
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Searching…</div>
                )}
                {searchResults.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      zIndex: 50,
                      maxHeight: 260,
                      overflowY: 'auto',
                    }}
                  >
                    {searchResults.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProduct(p);
                          setSearchQ('');
                          setSearchResults([]);
                          setFormEndsAt(defaultEndsAt);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          fontSize: 13,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        {p.images?.[0]?.url && (
                          <Image
                            unoptimized
                            src={p.images[0].url}
                            alt=""
                            width={36}
                            height={36}
                            style={{
                              borderRadius: 6,
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.title}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            {p.seller?.storeName} · {Number(p.basePrice).toLocaleString()} EGP base
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Form fields — shown after product selected */}
            {selectedProduct && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 14,
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  {selectedProduct.images?.[0]?.url && (
                    <Image
                      unoptimized
                      src={selectedProduct.images[0].url}
                      alt=""
                      width={40}
                      height={40}
                      style={{ borderRadius: 6, objectFit: 'cover' }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedProduct.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Base price: {Number(selectedProduct.basePrice).toLocaleString()} EGP
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      fontSize: 18,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                    }}
                  >
                    Flash Price (EGP) *
                    <input
                      type="number"
                      min="1"
                      value={formPrice}
                      onChange={e => setFormPrice(e.target.value)}
                      placeholder={`e.g. ${Math.round(selectedProduct.basePrice * 0.7)}`}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 13,
                      }}
                    />
                    {formPrice && selectedProduct.basePrice > 0 && (
                      <span style={{ fontSize: 11, color: '#22c55e' }}>
                        {Math.round((1 - parseFloat(formPrice) / selectedProduct.basePrice) * 100)}%
                        off
                      </span>
                    )}
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                    }}
                  >
                    Unit Limit (optional)
                    <input
                      type="number"
                      min="1"
                      value={formLimit}
                      onChange={e => setFormLimit(e.target.value)}
                      placeholder="e.g. 50"
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 13,
                      }}
                    />
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                    }}
                  >
                    Starts At (leave blank = immediately)
                    <input
                      type="datetime-local"
                      value={formStartsAt}
                      onChange={e => setFormStartsAt(e.target.value)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 13,
                      }}
                    />
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                    }}
                  >
                    Ends At *
                    <input
                      type="datetime-local"
                      value={formEndsAt}
                      onChange={e => setFormEndsAt(e.target.value)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 13,
                      }}
                    />
                  </label>
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleSchedule}
                    disabled={saving}
                    style={{
                      padding: '8px 20px',
                      background: '#534ab7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Saving…' : 'Save Flash Sale'}
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setSelectedProduct(null);
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#f1f5f9',
                      color: '#475569',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Flash sales list */}
      <div className="card">
        {/* Filter tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 16,
            padding: 4,
            background: '#f1f5f9',
            borderRadius: 8,
            width: 'fit-content',
          }}
        >
          {(['active', 'upcoming', 'expired', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: filter === f ? '#fff' : 'transparent',
                color: filter === f ? '#534ab7' : '#64748b',
                boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            No {filter !== 'all' ? filter : ''} flash sales found.
          </div>
        ) : (
          <table className="mkt-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Seller</th>
                <th>Base</th>
                <th>Sale</th>
                <th>Discount</th>
                <th>Status</th>
                <th>Starts</th>
                <th>Ends</th>
                <th>Limit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => {
                const disc =
                  p.flashSalePrice != null
                    ? Math.round((1 - p.flashSalePrice / p.basePrice) * 100)
                    : 0;
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.images?.[0]?.url && (
                          <Image
                            unoptimized
                            src={p.images[0].url}
                            alt=""
                            width={32}
                            height={32}
                            style={{
                              borderRadius: 4,
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 12,
                            maxWidth: 160,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.title}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{p.seller?.storeName}</td>
                    <td style={{ fontSize: 12 }}>{Number(p.basePrice).toLocaleString()} EGP</td>
                    <td style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
                      {p.flashSalePrice != null
                        ? `${Number(p.flashSalePrice).toLocaleString()} EGP`
                        : '—'}
                    </td>
                    <td>
                      <span
                        style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        -{disc}%
                      </span>
                    </td>
                    <td>{statusBadge(p)}</td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>
                      {p.flashSaleStartsAt
                        ? new Date(p.flashSaleStartsAt).toLocaleString()
                        : 'Immediately'}
                    </td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>
                      {p.flashSaleEndsAt ? new Date(p.flashSaleEndsAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{p.flashSaleLimit ?? '∞'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => handleEdit(p)}
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            color: '#475569',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleCancel(p.id, p.title)}
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            background: '#fee2e2',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            color: '#b91c1c',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <style jsx>{tableStyles}</style>
      </div>
    </div>
  );
}

// ─── Email Templates ────────────────────────────────────────────────────────
interface TplItem {
  id: string;
  key: string;
  subjectEn: string;
  isActive: boolean;
  updatedAt: string;
}

function EmailTemplatesPanel() {
  const [items, setItems] = useState<TplItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [_active, setActive] = useState<TplItem | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/email-templates');
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Email templates</h2>
        <button
          className="card-action"
          onClick={() =>
            setActive({ id: '', key: '', subjectEn: '', isActive: true, updatedAt: '' })
          }
        >
          + New template
        </button>
      </div>
      <p className="card-sub">
        Editable transactional and marketing email copy. Variables use{' '}
        <code className="bg-slate-100 px-1 rounded text-xs">{'{{var_name}}'}</code> syntax.
      </p>
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          No custom templates. The hard-coded defaults in <code>src/lib/email.ts</code> are in use.
        </div>
      ) : (
        <table className="mkt-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Subject (EN)</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} onClick={() => setActive(t)} className="cursor-pointer">
                <td>
                  <code>{t.key}</code>
                </td>
                <td>{t.subjectEn}</td>
                <td>
                  {t.isActive ? (
                    <span className="text-emerald-600">Active</span>
                  ) : (
                    <span className="text-slate-400">Disabled</span>
                  )}
                </td>
                <td className="text-xs text-slate-500">{new Date(t.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <style jsx>{tableStyles}</style>
    </div>
  );
}

// ─── Abandoned Carts ────────────────────────────────────────────────────────
interface AbandonedCart {
  id: string;
  userId: string | null;
  guestEmail: string | null;
  totalEgp: number | string;
  status: 'PENDING' | 'EMAILED' | 'RECOVERED' | 'EXPIRED';
  createdAt: string;
  emailSentAt: string | null;
}

function AbandonedCartsPanel() {
  const [items, setItems] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/marketing/abandoned-carts');
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Abandoned carts</h2>
        <span className="text-xs text-slate-500">{items.length} carts in the last 30 days</span>
      </div>
      <p className="card-sub">
        Anyone who left checkout without paying. The recovery worker emails them after{' '}
        <code className="bg-slate-100 px-1 rounded text-xs">ABANDONED_CART_DELAY_HOURS</code>.
      </p>
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">No abandoned carts yet.</div>
      ) : (
        <table className="mkt-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Abandoned</th>
              <th>Emailed</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id}>
                <td>{c.guestEmail || c.userId || 'Guest'}</td>
                <td>{Number(c.totalEgp).toLocaleString()} EGP</td>
                <td>
                  <Pill status={c.status} />
                </td>
                <td className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</td>
                <td className="text-xs text-slate-500">
                  {c.emailSentAt ? new Date(c.emailSentAt).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <style jsx>{tableStyles}</style>
    </div>
  );
}

// ─── Reusable bits ──────────────────────────────────────────────────────────
function Pill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    DRAFT: { bg: '#f1f5f9', fg: '#64748b' },
    SCHEDULED: { bg: '#dbeafe', fg: '#1e40af' },
    SENDING: { bg: '#fef3c7', fg: '#92400e' },
    SENT: { bg: '#d1fae5', fg: '#065f46' },
    FAILED: { bg: '#fee2e2', fg: '#b91c1c' },
    CANCELLED: { bg: '#f1f5f9', fg: '#64748b' },
    PENDING: { bg: '#fef3c7', fg: '#92400e' },
    EMAILED: { bg: '#dbeafe', fg: '#1e40af' },
    RECOVERED: { bg: '#d1fae5', fg: '#065f46' },
    EXPIRED: { bg: '#f1f5f9', fg: '#64748b' },
  };
  const s = colors[status] ?? colors.DRAFT;
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 4,
        letterSpacing: '0.05em',
      }}
    >
      {status}
    </span>
  );
}

const tableStyles = `
  .card { background: #fff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 24px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  .card-title { font-size: 16px; font-weight: 700; margin: 0; }
  .card-sub { font-size: 12px; color: #64748b; margin: 0 0 16px 0; }
  .card-action {
    padding: 6px 12px; font-size: 12px; font-weight: 600;
    background: #534AB7; color: #fff; border: none; border-radius: 8px;
    cursor: pointer; text-decoration: none; display: inline-block;
  }
  .mkt-table { width: 100%; border-collapse: collapse; }
  .mkt-table th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
  .mkt-table td { padding: 12px; border-bottom: 1px solid #f8fafc; font-size: 13px; }
  .mkt-table tr:last-child td { border-bottom: none; }
`;
