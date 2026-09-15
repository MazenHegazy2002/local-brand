'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SellerLoginForm() {
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/seller-hub';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (res?.error) {
        setError('Invalid seller email or password.');
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-white to-[hsl(var(--accent)/0.08)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="mx-auto text-center block group">
          <span className="text-4xl font-black tracking-tighter inline-flex items-center gap-1">
            <span className="text-[hsl(var(--primary))]">BRAND</span>
            <span className="text-[hsl(var(--accent))]">Y</span>
            <span className="ml-1 text-xs uppercase tracking-widest font-bold px-2.5 py-0.5 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] rounded-full">
              Seller Hub
            </span>
          </span>
        </Link>
        <h1 className="mt-6 text-center text-3xl font-extrabold text-[hsl(var(--foreground))]">
          Sign In to Seller Hub
        </h1>
        <p className="mt-2 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Exclusive portal for verified Egyptian local brands
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Seller Email Address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  placeholder="seller@brand.com"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-colors bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In as Seller'}
              </button>
            </div>

            <div className="w-full h-px bg-gray-100 my-4" />

            <div className="text-center text-xs text-gray-500">
              New brand?{' '}
              <Link
                href="/become-seller"
                className="font-bold text-[hsl(var(--primary))] hover:underline"
              >
                Create Seller Account →
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SellerLoginPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}
    >
      <SellerLoginForm />
    </Suspense>
  );
}
