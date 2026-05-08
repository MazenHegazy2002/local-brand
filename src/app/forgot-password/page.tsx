'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      
      setStatus('success');
      setMsg('Check your email for a reset link. We have sent you a temporary token link valid for 1 hour.');
    } catch (error: unknown) {
      setStatus('error');
      setMsg((error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navbar />
      <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8 mt-10">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-sm text-gray-600">Enter your email and we'll send you a link.</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] sm:rounded-2xl sm:px-10 border border-[#e8dfd1]">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {status === 'success' && (
                <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm border border-green-200">
                  {msg}
                </div>
              )}
              {status === 'error' && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-200">
                  {msg}
                </div>
              )}

              {status !== 'success' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email address</label>
                    <div className="mt-1">
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--accent))] focus:border-[hsl(var(--accent))] sm:text-sm" />
                    </div>
                  </div>

                  <div>
                    <button type="submit" disabled={status === 'loading'}
                      className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-black transition-colors bg-[hsl(var(--accent))] hover:bg-orange-400 disabled:opacity-50">
                      {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </>
              )}
              
              <div className="text-center mt-4">
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  Return to Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
