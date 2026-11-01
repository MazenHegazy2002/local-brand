'use client';
import { useLanguage } from '@/providers/LanguageContext';

import { useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function CategoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { tr } = useLanguage();
  useEffect(() => {
    console.error('[category] error:', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-32 text-center">
        <div className="text-6xl mb-4">🛍️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {tr("Couldn't load this category")}
        </h2>
        <p className="text-gray-500 mb-6">
          {tr('Please try again or browse a different section.')}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-xl bg-[#1e3b8a] text-white font-bold hover:bg-[#152c6e]"
          >
            {tr('Retry')}
          </button>
          <a
            href="/shop"
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
          >
            {tr('Browse All Products')}
          </a>
        </div>
      </div>
    </main>
  );
}
