'use client';

// Maintenance tab — emergency-room controls.
//
// Cards:
//   1. Maintenance mode      (toggle, message editor, schedule)
//   2. Read-only mode        (browse but no buy)
//   3. Cache management      (clear Redis cache by pattern)
//   4. Database              (status + manual seed + Prisma Studio link)
//   5. Backups               (trigger + download CSV exports)
//   6. System status         (DB / Redis / email / Stripe ping)
//
// Most controls write into the SystemSettings registry; clearing cache and
// running ping checks hit dedicated endpoints.

import React, { useEffect, useState } from 'react';
import BuyerAnnouncementPopup from '@/components/BuyerAnnouncementPopup';

interface SystemHealth {
  db: { ok: boolean; latencyMs: number; message?: string };
  redis: { ok: boolean; latencyMs: number; message?: string };
  email: { configured: boolean; provider: string };
  stripe: { configured: boolean };
  paysky: { configured: boolean };
}

export default function MaintenanceTab() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [maintMessage, setMaintMessage] = useState('');
  const [allowAdmin, setAllowAdmin] = useState(true);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [seoPing, setSeoPing] = useState<{
    googleLastPingedAt: string | null;
    bingLastPingedAt: string | null;
  } | null>(null);
  const [seoBusy, setSeoBusy] = useState(false);

  // Buyer Pop-up Announcement state
  const [buyerPopupEnabled, setBuyerPopupEnabled] = useState(false);
  const [buyerPopupTitle, setBuyerPopupTitle] = useState('Important Notice');
  const [buyerPopupTitleAr, setBuyerPopupTitleAr] = useState('تنويه هام');
  const [buyerPopupMessage, setBuyerPopupMessage] = useState('');
  const [buyerPopupMessageAr, setBuyerPopupMessageAr] = useState('');
  const [buyerPopupType, setBuyerPopupType] = useState('info');
  const [buyerPopupTarget, setBuyerPopupTarget] = useState('all');
  const [buyerPopupId, setBuyerPopupId] = useState('v1');
  const [showLivePreview, setShowLivePreview] = useState(false);

  const loadCurrent = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      const items = json.items ?? [];
      const get = (k: string) =>
        items.find((i: { key: string; value: string }) => i.key === k)?.value;
      setMaintenanceMode(get('MAINTENANCE_MODE') === 'true');
      setReadOnlyMode(get('READ_ONLY_MODE') === 'true');
      setAllowAdmin(get('MAINTENANCE_ALLOW_ADMIN') !== 'false');
      setMaintMessage(get('MAINTENANCE_MESSAGE') ?? '');

      setBuyerPopupEnabled(get('BUYER_POPUP_ENABLED') === 'true');
      setBuyerPopupTitle(get('BUYER_POPUP_TITLE') ?? 'Important Notice');
      setBuyerPopupTitleAr(get('BUYER_POPUP_TITLE_AR') ?? 'تنويه هام');
      setBuyerPopupMessage(get('BUYER_POPUP_MESSAGE') ?? '');
      setBuyerPopupMessageAr(get('BUYER_POPUP_MESSAGE_AR') ?? '');
      setBuyerPopupType(get('BUYER_POPUP_TYPE') ?? 'info');
      setBuyerPopupTarget(get('BUYER_POPUP_TARGET') ?? 'all');
      setBuyerPopupId(get('BUYER_POPUP_ID') ?? 'v1');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Load failed');
    }
  };

  const loadHealth = async () => {
    try {
      const res = await fetch('/api/admin/health');
      if (res.ok) setHealth(await res.json());
    } catch {
      /* health is best-effort */
    }
  };

  const loadSeoPing = async () => {
    try {
      const res = await fetch('/api/admin/seo');
      if (res.ok) setSeoPing(await res.json());
    } catch {
      /* best-effort */
    }
  };

  const pingSitemap = async () => {
    setSeoBusy(true);
    try {
      const res = await fetch('/api/admin/seo', { method: 'POST' });
      const data = await res.json();
      setSeoPing({ googleLastPingedAt: data.pinnedAt, bingLastPingedAt: data.pinnedAt });
      setInfo(`Sitemap pinged — Google: ${data.google.status}, Bing: ${data.bing.status}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ping failed');
    } finally {
      setSeoBusy(false);
    }
  };

  useEffect(() => {
    loadCurrent();
    loadHealth();
    loadSeoPing();
  }, []);

  const saveSetting = async (key: string, value: unknown) => {
    setBusy(key);
    setErr(null);
    setInfo(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [{ key, value }] }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Save failed');
      }
      setInfo(`Saved ${key}`);
      await loadCurrent();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(null);
    }
  };

  const saveMultipleSettings = async (updates: Array<{ key: string; value: unknown }>) => {
    setBusy('buyer_popup_all');
    setErr(null);
    setInfo(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Save failed');
      }
      setInfo('Saved all buyer pop-up announcement settings successfully!');
      await loadCurrent();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(null);
    }
  };

  const clearCache = async (pattern: string) => {
    setBusy('cache');
    setErr(null);
    setInfo(null);
    try {
      const res = await fetch('/api/admin/cache/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || 'Cache clear failed');
      setInfo(`Cleared ${j.deleted ?? '?'} keys for "${pattern}"`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Cache clear failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="maint-shell">
      {err && <div className="maint-err">{err}</div>}
      {info && <div className="maint-info">{info}</div>}

      <div className="maint-grid">
        {/* Buyer Broadcast Pop-up Announcement */}
        <div
          className="maint-card"
          style={{ gridColumn: '1 / -1', background: '#fafafc', border: '1px solid #e0e7ff' }}
        >
          <div className="maint-card-head">
            <div className="flex items-center gap-2">
              <span className="text-xl">📣</span>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Buyer Broadcast Pop-up Announcement
                </h3>
                <p className="text-xs text-slate-500">
                  Configure a pop-up message to display to buyers visiting the online store or
                  dashboard.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLivePreview(!showLivePreview)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                {showLivePreview ? '👁️ Hide Live Preview' : '👁️ Show Live Preview'}
              </button>
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                <span
                  className={`text-xs font-bold ${
                    buyerPopupEnabled ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  {buyerPopupEnabled ? '🟢 Pop-up ACTIVE' : '🔴 Disabled'}
                </span>
                <Toggle
                  value={buyerPopupEnabled}
                  onChange={v => {
                    setBuyerPopupEnabled(v);
                    saveSetting('BUYER_POPUP_ENABLED', v);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Title English */}
            <div>
              <label className="maint-label">Title (English)</label>
              <input
                type="text"
                className="maint-input"
                value={buyerPopupTitle}
                onChange={e => setBuyerPopupTitle(e.target.value)}
                onBlur={() => saveSetting('BUYER_POPUP_TITLE', buyerPopupTitle)}
                placeholder="Important Notice"
              />
            </div>

            {/* Title Arabic */}
            <div>
              <label className="maint-label">Title (Arabic - العنوان)</label>
              <input
                type="text"
                className="maint-input"
                dir="rtl"
                value={buyerPopupTitleAr}
                onChange={e => setBuyerPopupTitleAr(e.target.value)}
                onBlur={() => saveSetting('BUYER_POPUP_TITLE_AR', buyerPopupTitleAr)}
                placeholder="تنويه هام"
              />
            </div>

            {/* Message English */}
            <div>
              <label className="maint-label">Message Text (English)</label>
              <textarea
                className="maint-input"
                rows={3}
                value={buyerPopupMessage}
                onChange={e => setBuyerPopupMessage(e.target.value)}
                onBlur={() => saveSetting('BUYER_POPUP_MESSAGE', buyerPopupMessage)}
                placeholder="Type the message to show buyers..."
              />
            </div>

            {/* Message Arabic */}
            <div>
              <label className="maint-label">Message Text (Arabic - نص الرسالة)</label>
              <textarea
                className="maint-input"
                rows={3}
                dir="rtl"
                value={buyerPopupMessageAr}
                onChange={e => setBuyerPopupMessageAr(e.target.value)}
                onBlur={() => saveSetting('BUYER_POPUP_MESSAGE_AR', buyerPopupMessageAr)}
                placeholder="اكتب نص الرسالة بالعربية..."
              />
            </div>

            {/* Style / Type */}
            <div>
              <label className="maint-label">Pop-up Style / Theme</label>
              <select
                className="maint-input"
                value={buyerPopupType}
                onChange={e => {
                  const val = e.target.value;
                  setBuyerPopupType(val);
                  saveSetting('BUYER_POPUP_TYPE', val);
                }}
              >
                <option value="info">ℹ️ Information (Blue Banner)</option>
                <option value="warning">⚠️ Warning (Amber Banner)</option>
                <option value="danger">🚨 Urgent Alert (Red Banner)</option>
                <option value="success">🎉 Special Offer / Announcement (Green Banner)</option>
              </select>
            </div>

            {/* Target Audience */}
            <div>
              <label className="maint-label">Target Audience / Display Location</label>
              <select
                className="maint-input"
                value={buyerPopupTarget}
                onChange={e => {
                  const val = e.target.value;
                  setBuyerPopupTarget(val);
                  saveSetting('BUYER_POPUP_TARGET', val);
                }}
              >
                <option value="all">🌐 All Visitors (Storefront & Dashboard)</option>
                <option value="dashboard">📊 Dashboard Pages Only (/dashboard)</option>
                <option value="logged_in">👤 Logged-in Buyers Only</option>
              </select>
            </div>
          </div>

          {/* Version ID & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Version ID:
              </label>
              <input
                type="text"
                className="maint-input"
                style={{ width: '120px', padding: '4px 8px', fontSize: '12px' }}
                value={buyerPopupId}
                onChange={e => setBuyerPopupId(e.target.value)}
                onBlur={() => saveSetting('BUYER_POPUP_ID', buyerPopupId)}
              />
              <button
                type="button"
                onClick={() => {
                  const newId = `v${Date.now().toString().slice(-6)}`;
                  setBuyerPopupId(newId);
                  saveSetting('BUYER_POPUP_ID', newId);
                }}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 font-medium transition-colors"
                title="Bumping version clears dismissal history for buyers so everyone sees the updated pop-up"
              >
                🔄 Re-trigger for All Buyers (Bump ID)
              </button>
            </div>

            <button
              type="button"
              disabled={busy === 'buyer_popup_all'}
              onClick={() => {
                const freshVersionId = `v${Date.now().toString().slice(-6)}`;
                setBuyerPopupId(freshVersionId);
                saveMultipleSettings([
                  { key: 'BUYER_POPUP_ENABLED', value: buyerPopupEnabled },
                  { key: 'BUYER_POPUP_TITLE', value: buyerPopupTitle },
                  { key: 'BUYER_POPUP_TITLE_AR', value: buyerPopupTitleAr },
                  { key: 'BUYER_POPUP_MESSAGE', value: buyerPopupMessage },
                  { key: 'BUYER_POPUP_MESSAGE_AR', value: buyerPopupMessageAr },
                  { key: 'BUYER_POPUP_TYPE', value: buyerPopupType },
                  { key: 'BUYER_POPUP_TARGET', value: buyerPopupTarget },
                  { key: 'BUYER_POPUP_ID', value: freshVersionId },
                ]);
              }}
              className="maint-btn"
              style={{
                width: 'auto',
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 600,
                padding: '6px 16px',
              }}
            >
              {busy === 'buyer_popup_all' ? 'Broadcasting…' : '🚀 Save & Broadcast to All Buyers'}
            </button>
          </div>

          {/* Live preview component */}
          {showLivePreview && (
            <BuyerAnnouncementPopup
              previewData={{
                enabled: buyerPopupEnabled,
                title: buyerPopupTitle,
                titleAr: buyerPopupTitleAr,
                message: buyerPopupMessage,
                messageAr: buyerPopupMessageAr,
                type: buyerPopupType,
                target: buyerPopupTarget,
                popupId: buyerPopupId,
              }}
              onPreviewClose={() => setShowLivePreview(false)}
            />
          )}
        </div>

        {/* Maintenance mode */}
        <div className="maint-card">
          <div className="maint-card-head">
            <h3>🛠️ Maintenance mode</h3>
            <Toggle
              value={maintenanceMode}
              onChange={v => {
                setMaintenanceMode(v);
                saveSetting('MAINTENANCE_MODE', v);
              }}
            />
          </div>
          <p className="maint-card-desc">
            When on, the storefront returns a "we&apos;re back soon" page to non-admins. Use during
            deploys or DB migrations.
          </p>
          <label className="maint-label">Message</label>
          <textarea
            className="maint-input"
            rows={3}
            value={maintMessage}
            onChange={e => setMaintMessage(e.target.value)}
            onBlur={() => saveSetting('MAINTENANCE_MESSAGE', maintMessage)}
          />
          <label className="maint-checkbox-row">
            <input
              type="checkbox"
              checked={allowAdmin}
              onChange={e => {
                setAllowAdmin(e.target.checked);
                saveSetting('MAINTENANCE_ALLOW_ADMIN', e.target.checked);
              }}
            />
            <span>Admins can still access</span>
          </label>
        </div>

        {/* Read-only mode */}
        <div className="maint-card">
          <div className="maint-card-head">
            <h3>👀 Read-only mode</h3>
            <Toggle
              value={readOnlyMode}
              onChange={v => {
                setReadOnlyMode(v);
                saveSetting('READ_ONLY_MODE', v);
              }}
            />
          </div>
          <p className="maint-card-desc">
            Customers can still browse and add to cart, but checkout is blocked. Useful when you
            can't fulfill orders (holiday, supply issue, etc.).
          </p>
        </div>

        {/* Cache */}
        <div className="maint-card">
          <h3>♻️ Cache</h3>
          <p className="maint-card-desc">
            Clear Redis cache after big content changes or stuck listings.
          </p>
          <div className="flex flex-col gap-2 mt-3">
            <button
              disabled={busy === 'cache'}
              onClick={() => clearCache('product:*')}
              className="maint-btn"
            >
              {busy === 'cache' ? 'Clearing…' : 'Clear product cache'}
            </button>
            <button
              disabled={busy === 'cache'}
              onClick={() => clearCache('homepage:*')}
              className="maint-btn"
            >
              Clear homepage cache
            </button>
            <button
              disabled={busy === 'cache'}
              onClick={() => clearCache('*')}
              className="maint-btn maint-btn-danger"
            >
              Clear ALL cache (slow)
            </button>
          </div>
        </div>

        {/* Database */}
        <div className="maint-card">
          <h3>🗄️ Database</h3>
          <p className="maint-card-desc">
            Powered by PostgreSQL 16. Run migrations from the CLI:{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">
              npm run db:migrate:deploy
            </code>
            .
          </p>
          {health && (
            <ul className="maint-stat-list">
              <li>
                <span>Database</span>
                <span className={health.db.ok ? 'maint-ok' : 'maint-bad'}>
                  {health.db.ok ? `✅ ${health.db.latencyMs}ms` : `❌ ${health.db.message}`}
                </span>
              </li>
              <li>
                <span>Redis cache</span>
                <span className={health.redis.ok ? 'maint-ok' : 'maint-bad'}>
                  {health.redis.ok
                    ? `✅ ${health.redis.latencyMs}ms`
                    : `❌ ${health.redis.message}`}
                </span>
              </li>
            </ul>
          )}
        </div>

        {/* Backups */}
        <div className="maint-card">
          <h3>💾 Backups & exports</h3>
          <p className="maint-card-desc">Daily backups handled by Neon. On-demand exports below.</p>
          <div className="flex flex-col gap-2 mt-3">
            <a
              href="/api/admin/backup"
              className="maint-btn maint-btn-danger"
              style={{ fontWeight: '700', textAlign: 'center' }}
            >
              📥 Download JSON Backup
            </a>
            <a
              href="/api/admin/export/merchant-warehouses"
              download
              className="maint-btn"
              style={{ background: '#1e3b8a', color: '#ffffff', fontWeight: '700' }}
            >
              🏢 Export Merchant Warehouses (Merchant_Warehouses.xlsx)
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/export/orders/template', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'ALL' }),
                  });
                  if (!res.ok) throw new Error('Export failed');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Orders_Template_${new Date().toISOString().slice(0, 10)}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                } catch (e) {
                  alert('Export failed');
                }
              }}
              className="maint-btn"
              style={{ background: '#059669', color: '#ffffff', fontWeight: '700' }}
            >
              📦 Export Orders Template (NewTemplate.xlsx)
            </button>
            <a href="/api/admin/export/orders" className="maint-btn">
              Export orders (CSV)
            </a>
            <a href="/api/admin/export/products" className="maint-btn">
              Export products (CSV)
            </a>
            <a href="/api/admin/export/users" className="maint-btn">
              Export users (CSV)
            </a>
          </div>
        </div>

        {/* Status */}
        <div className="maint-card">
          <h3>🩺 System status</h3>
          {health ? (
            <ul className="maint-stat-list">
              <li>
                <span>Email ({health.email.provider})</span>
                <span>{health.email.configured ? '✅' : '❌'}</span>
              </li>
              <li>
                <span>Stripe</span>
                <span>{health.stripe.configured ? '✅' : '⚪️'}</span>
              </li>
              <li>
                <span>PaySky</span>
                <span>{health.paysky.configured ? '✅' : '⚪️'}</span>
              </li>
            </ul>
          ) : (
            <p className="text-xs text-slate-400">Loading status…</p>
          )}
          <button onClick={loadHealth} className="maint-btn mt-3">
            Refresh
          </button>
        </div>

        {/* SEO — sitemap ping */}
        <div className="maint-card">
          <h3>🔍 SEO — Sitemap indexing</h3>
          <p className="maint-card-desc">
            Notify Google &amp; Bing of your sitemap so they re-crawl the latest pages.
          </p>
          {seoPing && (
            <ul className="maint-stat-list mt-2">
              <li>
                <span>Google last pinged</span>
                <span>
                  {seoPing.googleLastPingedAt
                    ? new Date(seoPing.googleLastPingedAt).toLocaleString()
                    : 'never'}
                </span>
              </li>
              <li>
                <span>Bing last pinged</span>
                <span>
                  {seoPing.bingLastPingedAt
                    ? new Date(seoPing.bingLastPingedAt).toLocaleString()
                    : 'never'}
                </span>
              </li>
            </ul>
          )}
          <button
            onClick={pingSitemap}
            disabled={seoBusy}
            className="maint-btn mt-3"
            style={{ opacity: seoBusy ? 0.6 : 1 }}
          >
            {seoBusy ? 'Pinging…' : '📡 Ping sitemap (Google + Bing)'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .maint-shell {
        }
        .maint-err {
          background: #fef2f2;
          color: #b91c1c;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 12px;
        }
        .maint-info {
          background: #d1fae5;
          color: #065f46;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 12px;
        }
        .maint-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .maint-card {
          padding: 20px;
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
        }
        .maint-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .maint-card h3 {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .maint-card-desc {
          font-size: 12px;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 8px 0;
        }
        .maint-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          margin: 12px 0 4px 0;
        }
        .maint-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          font-family: inherit;
        }
        .maint-input:focus {
          border-color: #534ab7;
          box-shadow: 0 0 0 3px rgba(83, 74, 183, 0.1);
        }
        .maint-checkbox-row {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 12px;
          color: #475569;
          margin-top: 12px;
          cursor: pointer;
        }
        .maint-btn {
          width: 100%;
          padding: 8px 12px;
          font-size: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          color: #475569;
          text-align: center;
          text-decoration: none;
          display: inline-block;
        }
        .maint-btn:hover {
          background: #f1f5f9;
        }
        .maint-btn-danger {
          background: #fef2f2;
          color: #b91c1c;
          border-color: #fca5a5;
        }
        .maint-btn-danger:hover {
          background: #fee2e2;
        }
        .maint-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .maint-stat-list {
          list-style: none;
          padding: 0;
          margin: 12px 0 0 0;
          font-size: 12px;
          color: #475569;
        }
        .maint-stat-list li {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #f8fafc;
        }
        .maint-ok {
          color: #065f46;
          font-variant-numeric: tabular-nums;
        }
        .maint-bad {
          color: #b91c1c;
        }
      `}</style>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`maint-toggle ${value ? 'is-on' : ''}`}
    >
      <span className="maint-toggle-thumb" />
      <style jsx>{`
        .maint-toggle {
          width: 40px;
          height: 22px;
          border-radius: 999px;
          background: #e2e8f0;
          border: none;
          cursor: pointer;
          position: relative;
          padding: 0;
          transition: background 150ms ease;
        }
        .maint-toggle.is-on {
          background: #f59e0b;
        }
        .maint-toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transition: transform 150ms ease;
        }
        .maint-toggle.is-on .maint-toggle-thumb {
          transform: translateX(18px);
        }
      `}</style>
    </button>
  );
}
