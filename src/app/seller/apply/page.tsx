'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui';
import Link from 'next/link';

// Benefits shown on the seller landing preview for unauthenticated visitors
const BENEFITS = [
  {
    icon: '🛍️',
    title: 'Reach Thousands of Buyers',
    desc: 'Tap into a growing base of Egyptian shoppers actively searching for local products.',
  },
  {
    icon: '💰',
    title: 'Zero Upfront Costs',
    desc: 'List your products for free. We only earn a small commission when you sell.',
  },
  {
    icon: '📦',
    title: 'Easy Order Management',
    desc: 'Manage orders, shipments, and customer messages from one simple dashboard.',
  },
  {
    icon: '📊',
    title: 'Real-Time Analytics',
    desc: 'Track your sales, revenue, and top-performing products at a glance.',
  },
  {
    icon: '🤝',
    title: 'Affiliate Program',
    desc: 'Create promo codes and earn extra commission through the affiliate network.',
  },
  {
    icon: '✅',
    title: 'Verified Seller Badge',
    desc: 'Get a verified badge once approved — build trust with buyers instantly.',
  },
];

export default function SellerApplicationPage() {
  const { status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Only redirect authenticated users who are already on the form
  // Unauthenticated visitors see the landing preview below

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call for application
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (status === 'loading') return null;

  // Unauthenticated visitors: show a selling pitch + CTA to sign in
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#f9f8f6]">
        <Navbar />

        {/* Hero */}
        <section className="bg-[#1e3b8a] text-white py-20 px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-3 opacity-60">For Sellers</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Sell on Brandy — Egypt&apos;s Local Marketplace
          </h1>
          <p className="text-base opacity-75 max-w-lg mx-auto mb-8 leading-relaxed">
            Join emerging Egyptian local brands already growing their business. Reach thousands of
            buyers with zero upfront costs.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/seller/login?callbackUrl=/seller/apply"
              className="bg-white text-[#1e3b8a] font-black px-8 py-3 rounded-full text-sm hover:bg-gray-100 transition-colors"
            >
              Sign in to apply →
            </Link>
            <Link
              href="/seller/register?callbackUrl=/seller/apply"
              className="border border-white/40 text-white font-bold px-8 py-3 rounded-full text-sm hover:bg-white/10 transition-colors"
            >
              Create an account
            </Link>
          </div>
        </section>

        {/* Benefits grid */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">
            Why sell on Brandy?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {BENEFITS.map(b => (
              <div
                key={b.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col gap-3"
              >
                <div className="text-3xl">{b.icon}</div>
                <h3 className="font-black text-gray-900 text-base">{b.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="container mx-auto px-4 pb-16 text-center">
          <div className="bg-[#1e3b8a]/5 border border-[#1e3b8a]/10 rounded-3xl py-12 px-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-gray-900 mb-3">Ready to start?</h2>
            <p className="text-gray-500 mb-6">
              Create a free account or sign in to submit your seller application.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/seller/login?callbackUrl=/seller/apply"
                className="bg-[#1e3b8a] text-white font-black px-8 py-3 rounded-full text-sm hover:bg-[#16307a] transition-colors"
              >
                Sign in to apply
              </Link>
              <Link
                href="/seller/register?callbackUrl=/seller/apply"
                className="border border-[#1e3b8a] text-[#1e3b8a] font-bold px-8 py-3 rounded-full text-sm hover:bg-[#1e3b8a]/5 transition-colors"
              >
                Register free
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f8f6]">
      <Navbar />

      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
          {isSuccess ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                ✓
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
              <p className="text-gray-600 mb-8 text-lg">
                Thank you for applying to become a seller on Brandy. Our team will review your
                application within 2-3 business days. We&apos;ll send an email with the next steps
                once approved.
              </p>
              <Link href="/dashboard">
                <Button className="w-full text-lg h-14">Return to Dashboard</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-gray-900 mb-3">Become a Seller</h1>
                <p className="text-gray-500">
                  Join our marketplace and reach thousands of local customers.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Store Name
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                    placeholder="e.g. Cairo Tech Hub"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Type
                  </label>
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none bg-white"
                  >
                    <option value="">Select...</option>
                    <option value="individual">Individual / Freelancer</option>
                    <option value="company">Registered Company</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tax Registration Number (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                    placeholder="XXX-XXX-XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    What products will you sell?
                  </label>
                  <textarea
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                    rows={4}
                    placeholder="Describe your product catalog..."
                  />
                </div>

                <div className="pt-4">
                  <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-lg">
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                  <p className="text-center text-xs text-gray-500 mt-4">
                    By submitting, you agree to our{' '}
                    <Link href="/legal" className="text-[#1e3b8a] hover:underline">
                      Seller Terms & Conditions
                    </Link>
                    .
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
