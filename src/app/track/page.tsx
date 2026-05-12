'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

// Lookup entry point for guests who want to view an order without an account.
// The actual order rendering lives in /track/[id] — this page just collects
// the order ID + email and forwards there.
export default function TrackLookupPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const oid = orderId.trim();
    const em = email.trim();
    if (!oid || !em) {
      setError('Please enter both order ID and email.');
      return;
    }
    router.push(`/track/${encodeURIComponent(oid)}?email=${encodeURIComponent(em)}`);
  };

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Track Your Order</h1>
        <p className="text-gray-500 mb-8">
          Enter the order ID from your confirmation email and the email you used at checkout.
        </p>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                placeholder="e.g., abc12345-6789-..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                autoComplete="email"
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button
              type="submit"
              className="w-full bg-[#1e3b8a] text-white font-bold py-3 rounded-lg hover:bg-[#152c6e] transition-colors"
            >
              Track Order
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-sm text-gray-500">
            Have an account?{' '}
            <a href="/login" className="text-[#1e3b8a] font-medium hover:underline">
              Sign in
            </a>{' '}
            to see all your orders in one place. Guest orders made with your account&apos;s email
            are linked automatically.
          </div>
        </div>
      </div>
    </main>
  );
}
