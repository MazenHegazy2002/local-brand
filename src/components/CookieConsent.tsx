'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'local-brand-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't made a choice yet
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (!existing) setVisible(true);
    } catch {
      // localStorage unavailable (SSR / private mode) — don't render
    }
  }, []);

  const handleAccept = (choice: 'all' | 'essential') => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, at: new Date().toISOString() })
      );
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[60] bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 animate-fadeIn"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#1e3b8a]/10 flex items-center justify-center shrink-0 text-lg">
          🍪
        </div>
        <div className="flex-1">
          <h3 className="font-black text-gray-900 text-sm mb-1">We use cookies</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            We use essential cookies to run the site, and optional analytics cookies to improve your
            experience. Read our{' '}
            <Link href="/legal/privacy-policy" className="text-[#1e3b8a] underline">
              privacy policy
            </Link>{' '}
            to learn more.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleAccept('essential')}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
        >
          Essential only
        </button>
        <button
          onClick={() => handleAccept('all')}
          className="flex-1 px-4 py-2 bg-[#1e3b8a] text-white rounded-xl text-xs font-bold hover:bg-[#152c6e]"
        >
          Accept all
        </button>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
