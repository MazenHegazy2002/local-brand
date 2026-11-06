'use client';

import { useState } from 'react';
import { useLanguage } from '@/providers/LanguageContext';
import { csrfFetch } from '@/lib/csrf';

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

// Seller Hub > Products: paste the link to your old shop, we copy every
// product into Brandyy as a draft for the seller to review and publish.
export function WebsiteImportCard({ onImported }: { onImported: () => Promise<void> }) {
  const { tr } = useLanguage();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await csrfFetch('/api/products/import-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || tr('Import failed. Please try again.'));
      } else {
        setResult(data);
        if (data.created + (data.updated ?? 0) > 0) await onImported();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="text-sm font-bold text-slate-900">{tr('Import from your website')}</div>
      <div className="text-xs text-slate-500 mt-0.5">
        {tr(
          'Paste the link to your current online shop. We copy your products, photos, prices and descriptions here as drafts. Review each one, then publish it.'
        )}
      </div>
      <form onSubmit={run} className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          inputMode="url"
          dir="ltr"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://your-shop.com"
          disabled={busy}
          className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="text-xs font-bold text-white bg-[#0F6E56] hover:opacity-90 disabled:opacity-50 px-4 py-2 rounded-lg whitespace-nowrap"
        >
          {busy ? tr('Importing… this can take a few minutes') : tr('Import products')}
        </button>
      </form>

      {error && <div className="mt-3 text-xs text-red-600">{error}</div>}

      {result && (
        <div className="mt-3 text-xs text-slate-600 space-y-1">
          <div>
            <span className="text-emerald-600 font-semibold">{result.created}</span>{' '}
            {tr('products imported as drafts')}
            {!!result.updated && (
              <>
                {' '}
                — {result.updated} {tr('existing drafts updated')}
              </>
            )}
            {result.skipped > 0 && (
              <>
                {' '}
                — {result.skipped} {tr('already published, left as is')}
              </>
            )}
            {result.failed > 0 && (
              <>
                {' '}
                — <span className="text-red-600 font-semibold">{result.failed}</span> {tr('failed')}
              </>
            )}
          </div>
          {(result.noImage > 0 || result.noPrice > 0) && (
            <div className="text-amber-600">
              {result.noImage > 0 && (
                <>
                  {result.noImage} {tr('need a photo')}.{' '}
                </>
              )}
              {result.noPrice > 0 && (
                <>
                  {result.noPrice} {tr('need a price')}.{' '}
                </>
              )}
            </div>
          )}
          {result.created + (result.updated ?? 0) > 0 && (
            <div>{tr('Set the stock for each product, then publish it from the list below.')}</div>
          )}
          {result.errors && result.errors.length > 0 && (
            <ul className="max-h-32 overflow-y-auto text-red-600 list-disc ps-5 space-y-1">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
