'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { csrfFetch } from '@/lib/csrf';

type Seller = { id: string; storeName: string; status: string; user?: { email: string } | null };
type ImportResult = {
  found: number;
  created: number;
  updated?: number;
  skipped: number;
  noImage: number;
  noPrice: number;
  failed: number;
  errors?: string[];
};
type ImportRequest = {
  id: string;
  sellerId: string;
  storeName: string;
  url: string;
  requestedRole: string;
  status: 'PENDING' | 'RUNNING' | 'REJECTED' | 'DONE' | 'FAILED';
  result: string | null;
  createdAt: string;
};

const STATUS_STYLE: Record<ImportRequest['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  RUNNING: 'bg-sky-50 text-sky-700',
  DONE: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-slate-100 text-slate-600',
  FAILED: 'bg-red-50 text-red-700',
};

function summarize(r: ImportResult) {
  return (
    `${r.created} added, ${r.updated ?? 0} drafts updated` +
    (r.skipped ? `, ${r.skipped} already published (left as is)` : '') +
    (r.noImage ? `, ${r.noImage} need a photo` : '') +
    (r.noPrice ? `, ${r.noPrice} need a price` : '') +
    (r.failed ? `, ${r.failed} failed` : '')
  );
}

// Admin OS > Products. Admins import a website's products into any seller
// right away; co-admins send a request. Requests from sellers and co-admins
// are listed here for an admin to approve (runs the import) or reject.
export default function WebsiteImportPanel() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [requests, setRequests] = useState<ImportRequest[]>([]);
  const [canApprove, setCanApprove] = useState(false);
  const [sellerId, setSellerId] = useState('');
  const [filter, setFilter] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/products/import-from-url');
      if (!r.ok) return;
      const d = await r.json();
      setSellers(d.sellers || []);
      setRequests(d.requests || []);
      setCanApprove(!!d.canApprove);
    } catch {
      /* panel stays empty */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q
      ? sellers.filter(s => `${s.storeName} ${s.user?.email ?? ''}`.toLowerCase().includes(q))
      : sellers;
  }, [sellers, filter]);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !sellerId || busy) return;
    const store = sellers.find(s => s.id === sellerId)?.storeName ?? '';
    setBusy(true);
    setMessage(null);
    try {
      const res = await csrfFetch('/api/admin/products/import-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), sellerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        setMessage({ ok: false, text: data.error || 'Import failed. Please try again.' });
      else if (data.pending)
        setMessage({
          ok: true,
          text: data.alreadyPending
            ? 'This link is already waiting for approval.'
            : `Request sent. An admin has to approve it before the products are added to ${store}.`,
        });
      else
        setMessage({ ok: true, text: `${store}: ${summarize(data)}. Reload to see them below.` });
      setUrl('');
      await load();
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const decide = async (r: ImportRequest, approve: boolean) => {
    setDeciding(r.id);
    setMessage(null);
    try {
      const res = await csrfFetch(`/api/admin/products/import-requests/${r.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMessage({ ok: false, text: data.error || 'Action failed.' });
      else
        setMessage({
          ok: true,
          text: approve
            ? `${r.storeName}: ${summarize(data.result)}. Reload to see them below.`
            : `Request from ${r.storeName} rejected.`,
        });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setDeciding(null);
      await load();
    }
  };

  const pending = requests.filter(r => r.status === 'PENDING' || r.status === 'RUNNING');
  const past = requests.filter(r => r.status !== 'PENDING' && r.status !== 'RUNNING').slice(0, 8);

  return (
    <div className="card mb-4">
      <div className="card-header">
        <div className="card-title">Import products from a website</div>
        {pending.length > 0 && (
          <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            {pending.length} waiting for approval
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Paste a shop link and choose the seller. Every product found (photos, prices, sizes,
        descriptions) is added to that seller&apos;s store as a draft.
        {!canApprove && ' As a co-admin, your request goes to an admin for approval first.'}
      </p>
      <form onSubmit={run} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input
          type="text"
          inputMode="url"
          dir="ltr"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://their-shop.com"
          disabled={busy}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 min-w-0"
        />
        <div className="flex gap-2 min-w-0">
          <input
            type="search"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Find seller…"
            aria-label="Find seller"
            disabled={busy}
            className="w-28 shrink-0 text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
          <select
            value={sellerId}
            onChange={e => setSellerId(e.target.value)}
            disabled={busy}
            aria-label="Seller"
            className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2 py-2 bg-white"
          >
            <option value="">Choose seller ({shown.length})</option>
            {shown.map(s => (
              <option key={s.id} value={s.id}>
                {s.storeName}
                {s.user?.email ? ` — ${s.user.email}` : ''}
                {s.status !== 'ACTIVE' ? ` (${s.status.toLowerCase()})` : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={busy || !url.trim() || !sellerId}
          className="text-xs font-bold text-white bg-[#0F6E56] hover:opacity-90 disabled:opacity-50 px-4 py-2 rounded-lg whitespace-nowrap"
        >
          {busy
            ? canApprove
              ? 'Importing… can take a few minutes'
              : 'Sending…'
            : canApprove
              ? 'Import to seller'
              : 'Send for approval'}
        </button>
      </form>

      {message && (
        <div className={`mt-3 text-xs ${message.ok ? 'text-emerald-700' : 'text-red-600'}`}>
          {message.text}
        </div>
      )}

      {pending.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
            Waiting for approval
          </div>
          <ul className="space-y-2">
            {pending.map(r => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2 text-xs"
              >
                <b>{r.storeName}</b>
                <span dir="ltr" className="truncate max-w-[260px] text-slate-600">
                  {r.url}
                </span>
                <span className="text-slate-400">
                  by {r.requestedRole === 'CO_ADMIN' ? 'co-admin' : 'seller'} ·{' '}
                  {new Date(r.createdAt).toLocaleString()}
                </span>
                <span className="flex-1" />
                {r.status === 'RUNNING' ? (
                  <span className="text-sky-700 font-semibold">Importing…</span>
                ) : canApprove ? (
                  <>
                    <button
                      type="button"
                      disabled={!!deciding}
                      onClick={() => decide(r, true)}
                      className="rounded-md bg-emerald-600 text-white px-3 py-1 font-semibold disabled:opacity-50"
                    >
                      {deciding === r.id ? 'Importing… can take a few minutes' : 'Approve & import'}
                    </button>
                    <button
                      type="button"
                      disabled={!!deciding}
                      onClick={() => decide(r, false)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 font-semibold disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <span className="text-amber-700 font-semibold">Waiting for an admin</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {past.length > 0 && (
        <details className="mt-3 text-xs text-slate-600">
          <summary className="cursor-pointer text-slate-400">Recent imports</summary>
          <ul className="mt-2 space-y-1">
            {past.map(r => {
              let text = '';
              try {
                const res = r.result ? JSON.parse(r.result) : null;
                text = res?.error ?? (res ? summarize(res) : '');
              } catch {
                /* ignore */
              }
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-px text-[10px] font-semibold ${STATUS_STYLE[r.status]}`}
                  >
                    {r.status.toLowerCase()}
                  </span>
                  <b>{r.storeName}</b>
                  <span dir="ltr" className="truncate max-w-[220px]">
                    {r.url}
                  </span>
                  {text && <span className="text-slate-400">— {text}</span>}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
