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

type SubTab = 'campaigns' | 'flash' | 'templates' | 'abandoned';

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

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Marketing campaigns</h2>
        <button className="card-action">+ New campaign</button>
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
      <style jsx>{tableStyles}</style>
    </div>
  );
}

// ─── Flash Sales ────────────────────────────────────────────────────────────
function FlashSalesPanel() {
  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Flash Sales</h2>
        <a href="/admin-os/banners" className="card-action">
          Manage banners →
        </a>
      </div>
      <p className="card-sub">
        Flash sales are configured per-product on the seller side. The admin can feature them on the
        homepage via the banners tab. Schema fields:
        <code className="mx-1 bg-slate-100 px-1.5 py-0.5 rounded text-xs">flashSalePrice</code>,
        <code className="mx-1 bg-slate-100 px-1.5 py-0.5 rounded text-xs">flashSaleEndsAt</code>,
        <code className="mx-1 bg-slate-100 px-1.5 py-0.5 rounded text-xs">flashSaleLimit</code>.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <a href="/seller-hub" className="mkt-link-card">
          <div className="text-2xl mb-2">⚡</div>
          <strong>Per-product flash sale</strong>
          <p className="text-xs text-slate-500 mt-1">
            Sellers set this on their product edit page.
          </p>
        </a>
        <a href="/admin-os/banners" className="mkt-link-card">
          <div className="text-2xl mb-2">🖼️</div>
          <strong>Homepage banners</strong>
          <p className="text-xs text-slate-500 mt-1">Promote sales above the fold.</p>
        </a>
        <a href="/admin-os/coupons" className="mkt-link-card">
          <div className="text-2xl mb-2">🎟️</div>
          <strong>Coupons</strong>
          <p className="text-xs text-slate-500 mt-1">Sitewide or category-level discount codes.</p>
        </a>
      </div>
      <style jsx>{`
        .mkt-link-card {
          display: block;
          padding: 16px;
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          color: inherit;
          text-decoration: none;
          transition: all 150ms ease;
        }
        .mkt-link-card:hover {
          border-color: #534ab7;
          transform: translateY(-1px);
        }
      `}</style>
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
  const [active, setActive] = useState<TplItem | null>(null);

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
