'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function TestLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const login = async (email: string) => {
    setLoading(true);
    setResult(null);

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password: 'DEBUG_BYPASS_KEY',
    });

    setResult(res);
    setLoading(false);

    if (!res?.error) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Test Login</h1>
        
        <div className="space-y-4">
          <button
            onClick={() => login('admin@localbrand.com')}
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            Login as Admin
          </button>
          
          <button
            onClick={() => login('ali@localbrand.com')}
            disabled={loading}
            className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
          >
            Login as Ali (Seller)
          </button>
          
          <button
            onClick={() => login('mazen@localbrand.com')}
            disabled={loading}
            className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
          >
            Login as Mazen (Buyer)
          </button>
        </div>

        {loading && <p className="mt-4 text-center text-gray-500">Logging in...</p>}
        
        {result && (
          <pre className="mt-4 p-4 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}