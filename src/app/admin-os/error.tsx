'use client';

import { useEffect } from 'react';

export default function AdminOSError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin-os] error boundary caught:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-4 text-center">
      <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="mb-4 mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin panel unavailable</h2>
        <p className="text-slate-500 text-sm mb-4">
          An error occurred while loading the admin panel.
        </p>
        {error?.message && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-xs rounded-lg font-mono text-left overflow-auto max-h-32">
            {error.message}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
          <a
            href="/login"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Sign In Again
          </a>
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
