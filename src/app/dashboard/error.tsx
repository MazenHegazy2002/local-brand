'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard] error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-4 text-center">
      <div className="max-w-md">
        <div className="mb-6 mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Dashboard couldn&apos;t load</h2>
        <p className="text-slate-500 mb-6">
          We hit an unexpected error while loading your dashboard. You can retry below or head back to the store.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-xl bg-[#534AB7] text-white font-bold hover:opacity-90"
          >
            Retry
          </button>
          <a
            href="/"
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
