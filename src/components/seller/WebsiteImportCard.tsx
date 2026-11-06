'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/providers/LanguageContext';
import { csrfFetch } from '@/lib/csrf';

type ImportRequest = {
  id: string;
  url: string;
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
const STATUS_LABEL: Record<ImportRequest['status'], string> = {
  PENDING: 'Waiting for approval',
  RUNNING: 'Importing…',
  DONE: 'Imported',
  REJECTED: 'Not approved',
  FAILED: 'Failed',
};

// Seller Hub > Products: paste the link to your old shop and ask for an
// import. Once an admin approves, the products land here as drafts.
export function WebsiteImportCard({ onImported }: { onImported: () => Promise<void> }) {
  const { tr } = useLanguage();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [requests, setRequests] = useState<ImportRequest[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/products/import-from-url');
      if (res.ok) setRequests((await res.json()).requests || []);
    } catch {
      /* the list is optional */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh the product list when an approved import finishes
  // (only on change — onImported may be a new function every render).
  const onImportedRef = useRef(onImported);
  onImportedRef.current = onImported;
  const doneCount = requests.filter(r => r.status === 'DONE').length;
  const seenDone = useRef<number | null>(null);
  useEffect(() => {
    if (seenDone.current !== null && doneCount > seenDone.current) void onImportedRef.current();
    seenDone.current = doneCount;
  }, [doneCount]);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    setSent(null);
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
        setSent(
          data.alreadyPending
            ? tr('You already asked for this link — it is waiting for approval.')
            : tr(
                "Request sent. An admin will review it and you'll get a notification when your products are added."
              )
        );
        setUrl('');
        await load();
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
          'Paste the link to your current online shop. After an admin approves it, we copy your products, photos, prices and descriptions here as drafts. Review each one, then publish it.'
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
          {busy ? tr('Sending…') : tr('Request import')}
        </button>
      </form>

      {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
      {sent && <div className="mt-3 text-xs text-emerald-700">{sent}</div>}

      {requests.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {requests.map(r => {
            let summary = '';
            try {
              const res = r.result ? JSON.parse(r.result) : null;
              if (res?.error) summary = res.error;
              else if (res)
                summary = `${res.created} ${tr('added')}, ${res.updated ?? 0} ${tr('updated')}`;
            } catch {
              /* ignore */
            }
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span
                  className={`rounded px-1.5 py-px text-[10px] font-semibold ${STATUS_STYLE[r.status]}`}
                >
                  {tr(STATUS_LABEL[r.status])}
                </span>
                <span dir="ltr" className="truncate max-w-[220px]">
                  {r.url}
                </span>
                {summary && <span className="text-slate-400">— {summary}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
