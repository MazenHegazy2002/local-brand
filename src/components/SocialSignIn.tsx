'use client';

import { useEffect, useState } from 'react';
import { getProviders, signIn } from 'next-auth/react';
import { useLanguage } from '@/providers/LanguageContext';

// Google / Apple buttons for the sign-in and sign-up pages. Only providers the
// server actually has keys for are shown (see authOptions in src/lib/auth.ts),
// so a missing Apple key never shows a button that fails.
const SUPPORTED = ['google', 'apple'] as const;
type Supported = (typeof SUPPORTED)[number];

export default function SocialSignIn({ callbackUrl = '/dashboard' }: { callbackUrl?: string }) {
  const { tr } = useLanguage();
  const [available, setAvailable] = useState<Supported[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getProviders()
      .then(p => {
        if (alive && p) setAvailable(SUPPORTED.filter(id => id in p));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (available.length === 0) return null;

  const go = async (id: Supported) => {
    setLoading(id);
    await signIn(id, { callbackUrl });
  };

  return (
    <div className="flex flex-col gap-3">
      {available.map(id => (
        <button
          key={id}
          type="button"
          onClick={() => go(id)}
          disabled={loading !== null}
          className={
            id === 'apple'
              ? 'w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-black hover:bg-gray-900 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50'
              : 'w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:shadow-md transition-all shadow-sm text-sm font-semibold text-gray-700 disabled:opacity-50'
          }
        >
          {id === 'google' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.67-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.31-.89-2.33-3.53zM14.2 6.13c.61-.74 1.02-1.76.91-2.78-.88.04-1.94.59-2.57 1.32-.56.65-1.06 1.69-.93 2.69.98.08 1.98-.5 2.59-1.23z" />
            </svg>
          )}
          <span>{id === 'google' ? tr('Continue with Google') : tr('Continue with Apple')}</span>
        </button>
      ))}
    </div>
  );
}
