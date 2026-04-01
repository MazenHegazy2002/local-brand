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
    <div className="min-h-screen bg-[#faf9f6] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="text-4xl font-black tracking-tighter text-gray-900 mx-auto text-center block">
          LOCAL<span className="text-[hsl(var(--accent))]">BRAND</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Join the Movement
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[hsl(var(--accent))] hover:text-orange-500">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] sm:rounded-2xl sm:px-10 border border-[#e8dfd1]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-200">
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
                className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${role === 'SELLER' ? 'bg-white shadow border border-gray-200 text-[hsl(var(--accent))]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Local Seller
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <div className="mt-1">
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--accent))] focus:border-[hsl(var(--accent))] sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--accent))] focus:border-[hsl(var(--accent))] sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--accent))] focus:border-[hsl(var(--accent))] sm:text-sm" />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-colors ${role === 'SELLER' ? 'bg-[hsl(var(--accent))] text-black hover:bg-orange-400' : 'bg-gray-900 hover:bg-gray-800'} disabled:opacity-50`}
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
