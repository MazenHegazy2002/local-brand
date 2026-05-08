'use client';

import { useEffect } from 'react';

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[checkout] error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f9f8f6] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <div className="mb-6 mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Checkout is temporarily unavailable</h2>
        <p className="text-gray-500 mb-6">
          We hit an error while processing checkout. Your cart is saved — please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-xl bg-[#1e3b8a] text-white font-bold hover:bg-[#152c6e]"
          >
            Try Again
          </button>
          <a
            href="/shop"
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
          >
            Back to Shop
          </a>
        </div>
      </div>
    </div>
  );
}
