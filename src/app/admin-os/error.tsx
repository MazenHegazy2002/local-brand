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
    console.error('[admin-os] error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-4 text-center">
      <div className="max-w-md">
        <div className="mb-6 mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin panel unavailable</h2>
        <p className="text-slate-500 mb-6">
          An error occurred while loading the admin panel. Please retry or contact support.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:opacity-90"
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
