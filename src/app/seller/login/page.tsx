'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SellerLoginPage() {
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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="mx-auto text-center block">
          <span className="text-3xl font-black tracking-widest uppercase">
            Brandy<span className="text-indigo-400">.Seller</span>
          </span>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-black text-slate-100 uppercase tracking-tight">
          Sign In to Seller Hub
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          Exclusive portal for verified Egyptian local brands.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-950 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-950/55 border border-red-900 text-red-400 p-4 rounded-xl text-xs flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Seller Email Address
              </label>
              <input
                type="email"
                required
                placeholder="seller@brand.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Signing in…' : 'Sign In as Seller'}
              </button>
            </div>

            <div className="w-full h-px bg-slate-800/80 my-4" />

            <div className="text-center text-xs text-slate-400">
              New brand?{' '}
              <Link href="/seller/register" className="font-bold text-indigo-400 hover:underline">
                Create Seller Account →
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
