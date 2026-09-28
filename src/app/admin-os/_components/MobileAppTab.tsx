'use client';

// Mobile app tab — version-gate status (read-only; edited in Settings →
// Mobile app) and a push-notification sender (POST /api/admin/app/push).

import React, { useEffect, useState } from 'react';
import { csrfFetch } from '@/lib/csrf';

const STATUS_KEYS: Array<[string, string]> = [
  ['MOBILE_KILL_SWITCH', 'Force stop (kill switch)'],
  ['MAINTENANCE_MODE', 'Maintenance mode (also stops the app)'],
  ['MOBILE_LATEST_VERSION', 'Latest version'],
  ['MOBILE_MIN_VERSION', 'Minimum version (force update below)'],
  ['MOBILE_IOS_STORE_URL', 'App Store URL'],
  ['MOBILE_ANDROID_STORE_URL', 'Play Store URL'],
];

const fmt = (v?: string) => (v === 'true' ? '🔴 ON' : v === 'false' ? 'off' : v || '—');

export default function MobileAppTab({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ title: '', body: '', url: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(j =>
        setVals(
          Object.fromEntries(
            (j.items ?? []).map((i: { key: string; value: string }) => [i.key, i.value])
          )
        )
      )
      .catch(e => setErr(e instanceof Error ? e.message : 'Load failed'));
  }, []);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = form.email.trim();
    if (!email && !confirm('Send this notification to ALL app users?')) return;
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const res = await csrfFetch('/api/admin/app/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          url: form.url.trim() || undefined,
          email: email || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === 'string' ? j.error : 'Invalid input');
      setInfo(
        j.noTokens ? 'No registered devices — nothing sent.' : `Sent ${j.sent}, failed ${j.failed}`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {err && <div className="maint-err">{err}</div>}
      {info && <div className="maint-info">{info}</div>}

      <div className="maint-grid">
        <div className="maint-card">
          <h3>📱 App version control</h3>
          <p className="maint-card-desc">
            Apps below the minimum version must update; below latest they get a dismissible prompt.
            Kill switch or maintenance mode stops every version.
          </p>
          <ul className="maint-stat-list">
            {STATUS_KEYS.map(([k, label]) => (
              <li key={k}>
                <span>{label}</span>
                <span>{fmt(vals[k])}</span>
              </li>
            ))}
          </ul>
          {onOpenSettings && (
            <button className="maint-btn" style={{ marginTop: 12 }} onClick={onOpenSettings}>
              Edit in Settings → 📱 Mobile app
            </button>
          )}
        </div>

        <form className="maint-card" onSubmit={send}>
          <h3>🔔 Send push notification</h3>
          <label className="maint-label">Title</label>
          <input
            className="maint-input"
            required
            maxLength={100}
            value={form.title}
            onChange={set('title')}
          />
          <label className="maint-label">Message</label>
          <textarea
            className="maint-input"
            rows={3}
            required
            maxLength={500}
            value={form.body}
            onChange={set('body')}
          />
          <label className="maint-label">Deep link (optional in-app route)</label>
          <input
            className="maint-input"
            pattern="/.*"
            placeholder="/product/123"
            value={form.url}
            onChange={set('url')}
          />
          <label className="maint-label">User email (optional — empty sends to everyone)</label>
          <input className="maint-input" type="email" value={form.email} onChange={set('email')} />
          <button type="submit" className="maint-btn" style={{ marginTop: 12 }} disabled={busy}>
            {busy ? 'Sending…' : form.email.trim() ? 'Send to user' : 'Send to all app users'}
          </button>
        </form>
      </div>

      <style jsx>{`
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
        @media (max-width: 768px) {
          .maint-grid {
            grid-template-columns: 1fr;
          }
        }
        .maint-card {
          padding: 20px;
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
        }
        .maint-card h3 {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
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
        .maint-btn {
          width: 100%;
          padding: 8px 12px;
          font-size: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          color: #475569;
        }
        .maint-btn:hover {
          background: #f1f5f9;
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
          gap: 12px;
          padding: 6px 0;
          border-bottom: 1px solid #f8fafc;
          word-break: break-all;
        }
      `}</style>
    </div>
  );
}
