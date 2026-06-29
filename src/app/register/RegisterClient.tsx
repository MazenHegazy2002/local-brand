'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordStrength from '@/components/PasswordStrength';

type Step = 'form' | 'check-email' | 'seller-pending';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [role, setRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, storeName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Always go to email-verification step now
      if (role === 'SELLER') {
        setStep('seller-pending');
      } else {
        setStep('check-email');
      }
    } catch (error: unknown) {
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Post-registration: check your email ──────────────────────────────────
  if (step === 'check-email') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-white to-[hsl(var(--accent)/0.06)] flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Link href="/" className="flex justify-center mb-8">
            <span className="text-4xl font-black tracking-tighter">
              <span className="text-[hsl(var(--primary))]">BRAND</span>
              <span className="text-[hsl(var(--accent))]">Y</span>
            </span>
          </Link>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                  fill="#1e3b8a"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Check your email</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-2">
              We sent a verification link to <strong className="text-gray-800">{email}</strong>.
            </p>
            <p className="text-gray-400 text-xs mb-6">The link expires in 10 minutes.</p>
            <button
              onClick={() => router.push(`/verify-email?email=${encodeURIComponent(email)}`)}
              className="text-sm text-[hsl(var(--primary))] hover:underline"
            >
              Didn&apos;t receive it? Resend
            </button>
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

  // ── Post-registration: seller pending review ──────────────────────────────
  if (step === 'seller-pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-white to-[hsl(var(--accent)/0.06)] flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Link href="/" className="flex justify-center mb-8">
            <span className="text-4xl font-black tracking-tighter">
              <span className="text-[hsl(var(--primary))]">BRAND</span>
              <span className="text-[hsl(var(--accent))]">Y</span>
            </span>
          </Link>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="#0F6E56"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Application received! 🎉</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Your seller application for{' '}
              <strong className="text-gray-800">{storeName || `${name}'s Store`}</strong> has been
              submitted.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-amber-800 text-sm font-semibold mb-1">⏳ What happens next?</p>
              <ol className="text-amber-700 text-xs space-y-1 list-decimal list-inside">
                <li>
                  Verify your email (check <strong>{email}</strong>)
                </li>
                <li>Our team reviews your application (1–2 business days)</li>
                <li>You get an approval email — then you can list products!</li>
              </ol>
            </div>
            <p className="text-xs text-gray-400">
              <Link href="/login" className="hover:underline text-gray-500">
                Sign in to check your status
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-white to-[hsl(var(--accent)/0.08)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="mx-auto text-center block group">
          <span className="text-4xl font-black tracking-tighter inline-flex items-center gap-1">
            <span className="text-[hsl(var(--primary))]">BRAND</span>
            <span className="text-[hsl(var(--accent))]">Y</span>
          </span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[hsl(var(--foreground))]">
          {role === 'SELLER' ? 'Become a Seller' : 'Join the Movement'}
        </h2>
        <p className="mt-2 text-center text-sm text-[hsl(var(--muted-foreground))]">
          {role === 'SELLER'
            ? 'Start selling your products to thousands of customers'
            : 'Already have an account? '}
          {role !== 'SELLER' && (
            <Link
              href="/login"
              className="font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-dark))]"
            >
              Sign in
            </Link>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="mb-5 bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {error}
              </div>
            )}

            {/* Account Type Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setRole('BUYER')}
                className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${role === 'BUYER' ? 'bg-white shadow border border-gray-200 text-[hsl(var(--primary))]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setRole('SELLER')}
                className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${role === 'SELLER' ? 'bg-white shadow border border-gray-200 text-[hsl(var(--primary))]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Seller
              </button>
            </div>

            {role === 'SELLER' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                ⚠️ Seller accounts require admin approval before you can list products.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm"
                />
              </div>
            </div>

            {role === 'SELLER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Store Name</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mazen's Fashion"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm"
                />
              </div>
              <PasswordStrength password={password} />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-colors bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] disabled:opacity-50"
              >
                {isLoading
                  ? 'Creating account...'
                  : `Create ${role === 'SELLER' ? 'Seller' : 'Customer'} Account`}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              By creating an account, you agree to Brandy&apos;s Conditions of Use and Privacy
              Notice.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
