'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';

// Shown to users right after a magic-link sign-in. They pick a password that
// gets hashed and saved on their User row, so next time they can sign in
// with credentials too. The page is reachable any time — existing users can
// also use it to update their password from a known-good session.
function SetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const isWelcome = params.get('welcome') === '1';
  const { data: session, status: sessionStatus } = useSession();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Bounce unauthenticated users back to login — set-password requires an
  // active session so we can't accidentally update the wrong account.
  if (sessionStatus === 'unauthenticated') {
    router.replace('/login');
    return null;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to set password');
        return;
      }
      router.replace(next);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onSkip = () => {
    router.replace(next);
  };

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />

      <div className="container mx-auto px-4 py-12 max-w-lg">
        {isWelcome && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-4 py-3 mb-6 text-sm">
            <strong>Welcome{session?.user?.name ? `, ${session.user.name}` : ''}!</strong>{' '}
            You&apos;re signed in via your sign-in link. Set a password below so you can also use
            email + password to sign in next time.
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-black text-gray-900 mb-2">Set a password</h1>
          <p className="text-sm text-gray-500 mb-6">
            Choose a password (at least 8 characters). Your password is hashed and stored securely —
            nobody at Brandy can see it.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                placeholder="Type the same password again"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#1e3b8a] text-white font-bold py-3 rounded-lg hover:bg-[#152c6e] disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving...' : 'Save password'}
              </button>
              {isWelcome && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="flex-1 sm:flex-none bg-white text-gray-700 border border-gray-200 font-medium py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Skip for now
                </button>
              )}
            </div>
          </form>

          {isWelcome && (
            <p className="mt-6 text-xs text-gray-400 text-center">
              You can come back to this page any time from your account settings to change your
              password.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          Loading...
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}
