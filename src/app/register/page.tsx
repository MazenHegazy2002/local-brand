'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Registration failed');
      }

      // Automatically log in the user using the credentials API
      const authRes = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (authRes?.error) {
        throw new Error('Failed to auto-login. Please sign in manually.');
      }
      
      router.push('/dashboard');
      router.refresh();

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="text-4xl font-black tracking-tighter text-gray-900 mx-auto text-center block">
          LOCAL<span className="text-[#1e3b8a]">BRAND</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {role === 'SELLER' ? 'Become a Seller' : 'Join the Movement'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {role === 'SELLER' 
            ? 'Start selling your products to thousands of customers' 
            : 'Already have an account? '}
          {role !== 'SELLER' && (
            <Link href="/login" className="font-medium text-[#1e3b8a] hover:text-blue-700">
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
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {error}
              </div>
            )}
            
            {/* Account Type Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button 
                type="button" 
                onClick={() => setRole('BUYER')}
                className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${role === 'BUYER' ? 'bg-white shadow border border-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Customer
              </button>
              <button 
                type="button" 
                onClick={() => setRole('SELLER')}
                className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${role === 'SELLER' ? 'bg-white shadow border border-gray-200 text-[#1e3b8a]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Local Seller
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <div className="mt-1">
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1e3b8a] focus:border-[#1e3b8a] sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1e3b8a] focus:border-[#1e3b8a] sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1e3b8a] focus:border-[#1e3b8a] sm:text-sm" />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-colors ${role === 'SELLER' ? 'bg-[#1e3b8a] hover:bg-[#152c6e]' : 'bg-gray-900 hover:bg-gray-800'} disabled:opacity-50`}
              >
                {isLoading ? 'Creating account...' : `Create ${role === 'SELLER' ? 'Seller' : 'Customer'} Account`}
              </button>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              By creating an account, you agree to LocalBrand's Conditions of Use and Privacy Notice.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
