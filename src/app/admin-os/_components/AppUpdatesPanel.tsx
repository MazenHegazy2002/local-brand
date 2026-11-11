'use client';

import { useCallback, useEffect, useState } from 'react';
import { csrfFetch } from '@/lib/csrf';

type Update = {
  id: string;
  runtimeVersion: string;
  message: string | null;
  gitCommit: string | null;
  platforms: string;
  active: boolean;
  createdAt: string;
};

// Admin OS > Mobile app: instant (over-the-air) app updates. Phones download
// the newest active update the next time they open the app.
export default function AppUpdatesPanel() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/app-updates');
      if (!r.ok) return;
      const d = await r.json();
      setUpdates(d.updates || []);
      setCanManage(!!d.canManage);
    } catch {
      /* empty list */
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const live = updates.find(u => u.active);

  const toggle = async (u: Update, active: boolean) => {
    if (
      !active &&
      !window.confirm(
        'Turn off this update? Phones go back to the previous active update (or the store version) the next time they open the app.'
      )
    )
      return;
    setBusy(u.id);
    setMsg(null);
    try {
      const r = await csrfFetch('/api/admin/app-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, active }),
      });
      const d = await r.json().catch(() => ({}));
      setMsg(r.ok ? (active ? 'Update turned on.' : 'Update turned off.') : d.error || 'Failed.');
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-header">
        <div className="card-title">Instant app updates</div>
        <span className="text-[11px] text-slate-500">
          Live: {live ? `${live.message || live.id.slice(0, 8)}` : 'store version'}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Screen and design changes published without a store release. Phones download the newest
        active update the next time they open the app. Turning off the live update rolls phones back
        to the previous one.
      </p>
      {msg && <div className="text-xs text-emerald-700 mb-2">{msg}</div>}
      {updates.length === 0 ? (
        <div className="text-xs text-slate-400">No updates published yet.</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {updates.map(u => (
            <li key={u.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
              <span
                className={`rounded px-1.5 py-px text-[10px] font-semibold ${
                  u === live
                    ? 'bg-emerald-50 text-emerald-700'
                    : u.active
                      ? 'bg-sky-50 text-sky-700'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {u === live ? 'LIVE' : u.active ? 'previous' : 'off'}
              </span>
              <span className="font-semibold text-slate-800">{u.message || 'App update'}</span>
              <span className="text-slate-400">
                {new Date(u.createdAt).toLocaleString()} · app {u.runtimeVersion} · {u.platforms}
                {u.gitCommit ? ` · ${u.gitCommit.slice(0, 7)}` : ''}
              </span>
              <span className="flex-1" />
              {canManage && (
                <button
                  type="button"
                  disabled={busy === u.id}
                  onClick={() => toggle(u, !u.active)}
                  className={`rounded-md px-3 py-1 font-semibold border disabled:opacity-50 ${
                    u.active
                      ? 'border-red-200 text-red-700 bg-white'
                      : 'border-emerald-200 text-emerald-700 bg-white'
                  }`}
                >
                  {u.active ? (u === live ? 'Roll back' : 'Turn off') : 'Turn on'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
