'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  if (!token) {
    return (
      <div className="text-center bg-white p-8 rounded-xl border border-[#e8dfd1] shadow-sm">
        <h3 className="text-red-600 font-bold mb-2">Invalid Link</h3>
        <p className="text-gray-600 mb-6">No reset token found in the URL. Your link may be broken or manually typed incorrectly.</p>
        <Link href="/forgot-password" className="text-blue-600 font-bold hover:underline">Request a new link</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus('error');
      setMsg('Passwords do not match');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');
      
      setStatus('success');
      setMsg('Your password has been successfully updated.');
      
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (error: unknown) {
      setStatus('error');
      setMsg((error as Error).message);
    }
  };

  return (
    <div className="bg-white py-8 px-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] sm:rounded-2xl sm:px-10 border border-[#e8dfd1]">
      {status === 'success' ? (
        <div className="text-center">
          <div className="bg-green-50 text-green-700 p-4 rounded-xl font-medium border border-green-200 mb-4">{msg}</div>
          <p className="text-sm text-gray-500">Redirecting you to login...</p>
          <Link href="/login" className="mt-6 inline-block bg-[hsl(var(--accent))] text-black font-bold px-6 py-2 rounded-xl transition hover:bg-orange-400">Back to Login</Link>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          {status === 'error' && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-200">
              {msg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="mt-1">
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--accent))] focus:border-[hsl(var(--accent))] sm:text-sm" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <div className="mt-1">
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--accent))] focus:border-[hsl(var(--accent))] sm:text-sm" />
            </div>
          </div>

          <div>
            <button type="submit" disabled={status === 'loading'}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-black transition-colors bg-[hsl(var(--accent))] hover:bg-orange-400 disabled:opacity-50">
              {status === 'loading' ? 'Saving...' : 'Reset Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navbar />
      <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8 mt-10">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Create New Password</h2>
          <p className="mt-2 text-sm text-gray-600">Enter your new secure password below to regain access.</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Suspense fallback={<div className="text-center py-10">Loading security token...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
