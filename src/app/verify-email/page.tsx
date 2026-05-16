'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const error = params.get('error');
  const email = params.get('email') || '';

  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-white to-[hsl(var(--accent)/0.06)] flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex justify-center mb-8">
          <span className="text-4xl font-black tracking-tighter">
            <span className="text-[hsl(var(--primary))]">BRAND</span>
            <span className="text-[hsl(var(--accent))]">Y</span>
          </span>
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 text-center">
          {error === 'expired' ? (
            <>
              {/* Expired token */}
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2a10 10 0 100 20A10 10 0 0012 2zm.75 5.25a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0v-5.5zm0 8.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0z"
                    fill="#d97706"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Link expired</h1>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Your verification link has expired (links are valid for 10 minutes).
                {email && ' Click below to get a fresh one.'}
              </p>
              {email &&
                (resent ? (
                  <p className="text-green-600 font-semibold text-sm">
                    ✓ New link sent! Check your inbox.
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="w-full py-3 bg-[hsl(var(--primary))] text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend verification email'}
                  </button>
                ))}
            </>
          ) : (
            <>
              {/* Standard "check inbox" state */}
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                    fill="#1e3b8a"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Check your email</h1>
              <p className="text-gray-500 text-sm mb-2 leading-relaxed">
                We&apos;ve sent a verification link to{' '}
                {email ? <strong className="text-gray-800">{email}</strong> : 'your email address'}.
              </p>
              <p className="text-gray-400 text-xs mb-6">The link expires in 10 minutes.</p>

              {email &&
                (resent ? (
                  <p className="text-green-600 font-semibold text-sm mb-4">
                    ✓ Email resent! Check your inbox.
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="text-sm text-[hsl(var(--primary))] hover:underline disabled:opacity-50 mb-4"
                  >
                    {resending ? 'Sending...' : "Didn't receive it? Resend"}
                  </button>
                ))}
            </>
          )}

          <p className="text-xs text-gray-400 mt-6">
            <Link href="/login" className="hover:underline text-gray-500">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
