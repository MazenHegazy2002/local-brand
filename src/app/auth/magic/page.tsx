'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

// Lands here from the magic-link email. Calls signIn('magic-link', { token }),
// then sends the user to /account/set-password so they can choose a real
// password (the auto-created hash is a random unguessable value so the
// credentials provider can't authenticate until they set one).
function MagicCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  // Derive initial state from the token presence so we don't have to call
  // setState synchronously inside the effect for the obvious missing-token
  // case (which the lint rule rightly flags).
  const [status, setStatus] = useState<'pending' | 'error'>(token ? 'pending' : 'error');
  const [message, setMessage] = useState<string>(
    token
      ? 'Signing you in...'
      : 'This sign-in link is missing its token. Try requesting a new link.'
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const res = await signIn('magic-link', { token, redirect: false });
      if (cancelled) return;
      if (!res || res.error) {
        setStatus('error');
        setMessage(
          'This sign-in link is invalid or has expired. Magic links work once and last 30 minutes.'
        );
        return;
      }
      // Get the role to decide the landing page, but always offer the
      // password-setup step in between so first-time users can pick a
      // password they'll remember.
      try {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        const role = session?.user?.role;
        const landing =
          role === 'ADMIN' ? '/admin-os' : role === 'SELLER' ? '/seller-hub' : '/dashboard';
        router.replace(`/account/set-password?next=${encodeURIComponent(landing)}&welcome=1`);
      } catch {
        router.replace('/account/set-password?welcome=1');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <main className="min-h-screen bg-[#f9f8f6] flex items-center justify-center px-4">
      <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        {status === 'pending' ? (
          <>
            <div className="w-12 h-12 border-4 border-[#1e3b8a] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">{message}</h1>
            <p className="text-sm text-gray-500">Hold tight, this should only take a moment.</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
              !
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Sign-in link unavailable</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <Link
              href="/login"
              className="inline-block bg-[#1e3b8a] text-white font-bold py-2.5 px-6 rounded-lg hover:bg-[#152c6e] transition-colors text-sm"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function MagicLinkCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          Loading...
        </div>
      }
    >
      <MagicCallback />
    </Suspense>
  );
}
