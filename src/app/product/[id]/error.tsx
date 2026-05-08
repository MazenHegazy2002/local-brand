'use client';

import { useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[product] error:', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-32 text-center">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">This product couldn&apos;t be loaded</h2>
        <p className="text-gray-500 mb-6">
          It may be unavailable or we hit a temporary error. Try again or explore other products.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-xl bg-[#1e3b8a] text-white font-bold hover:bg-[#152c6e]"
          >
            Retry
          </button>
          <a
            href="/shop"
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
          >
            Browse Shop
          </a>
        </div>
      </div>
    </main>
  );
}
