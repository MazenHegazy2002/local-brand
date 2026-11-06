'use client';

import { useEffect, useMemo, useState } from 'react';
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

// Admin OS > Products: an admin or co-admin pastes a shop link, picks the
// seller, and every product on that site lands in the seller's store as a draft.
export default function WebsiteImportPanel() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerId, setSellerId] = useState('');
  const [filter, setFilter] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ store: string; data: ImportResult } | null>(null);

  useEffect(() => {
    fetch('/api/admin/products/import-from-url')
      .then(r => (r.ok ? r.json() : { sellers: [] }))
      .then(d => setSellers(d.sellers || []))
      .catch(() => {});
  }, []);

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
    setError(null);
    setResult(null);
    try {
      const res = await csrfFetch('/api/admin/products/import-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), sellerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Import failed. Please try again.');
      else setResult({ store, data });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-header">
        <div className="card-title">Import products from a website</div>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Paste a shop link and choose the seller. Every product found (photos, prices, descriptions)
        is added to that seller&apos;s store as a draft for them to review and publish.
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
          {busy ? 'Importing… can take a few minutes' : 'Import to seller'}
        </button>
      </form>

      {error && <div className="mt-3 text-xs text-red-600">{error}</div>}

      {result && (
        <div className="mt-3 text-xs text-slate-600 space-y-1">
          <div>
            <span className="text-emerald-600 font-semibold">{result.data.created}</span> products
            added to <b>{result.store}</b> as drafts
            {!!result.data.updated && <> — {result.data.updated} existing drafts updated</>}
            {result.data.skipped > 0 && <> — {result.data.skipped} already published, left as is</>}
            {result.data.failed > 0 && (
              <>
                {' '}
                — <span className="text-red-600 font-semibold">{result.data.failed}</span> failed
              </>
            )}
          </div>
          {(result.data.noImage > 0 || result.data.noPrice > 0) && (
            <div className="text-amber-600">
              {result.data.noImage > 0 && <>{result.data.noImage} need a photo. </>}
              {result.data.noPrice > 0 && <>{result.data.noPrice} need a price. </>}
            </div>
          )}
          {result.data.created + (result.data.updated ?? 0) > 0 && (
            <div>
              The seller sees them in Seller Hub → Products and publishes each one. Reload this page
              to see them in the list below.
            </div>
          )}
          {result.data.errors && result.data.errors.length > 0 && (
            <ul className="max-h-32 overflow-y-auto text-red-600 list-disc ps-5 space-y-1">
              {result.data.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
