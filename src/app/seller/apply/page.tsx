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

  // Real input states
  const [storeName, setStoreName] = useState('');
  const [type, setType] = useState('INDIVIDUAL');
  const [taxNumber, setTaxNumber] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/seller/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          type,
          taxNumber: taxNumber || undefined,
          description,
          phone: phone || undefined,
          facebookUrl: facebookUrl || undefined,
          instagramUrl: instagramUrl || undefined,
          tiktokUrl: tiktokUrl || undefined,
          logoUrl: logoUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error && typeof data.error === 'object') {
          const firstErr = Object.values(data.error)[0] as string[];
          throw new Error(firstErr[0] || 'Validation failed');
        }
        throw new Error(data.error || 'Failed to submit application');
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      setSubmitError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
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

              {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Store Name
                  </label>
                  <input
                    required
                    type="text"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                    placeholder="e.g. Cairo Tech Hub"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Business Type
                    </label>
                    <select
                      required
                      value={type}
                      onChange={e => setType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none bg-white"
                    >
                      <option value="INDIVIDUAL">Individual / Freelancer</option>
                      <option value="BUSINESS">Registered Company</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      required
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                      placeholder="e.g. +2010XXXXXXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tax Registration Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={taxNumber}
                      onChange={e => setTaxNumber(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                      placeholder="XXX-XXX-XXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Store Logo URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={e => setLogoUrl(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-black text-gray-800 mb-4 uppercase tracking-wider">
                    🔗 Social Media Links
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Facebook Page URL
                      </label>
                      <input
                        type="url"
                        value={facebookUrl}
                        onChange={e => setFacebookUrl(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none text-sm"
                        placeholder="https://facebook.com/yourstore"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Instagram URL
                      </label>
                      <input
                        type="url"
                        value={instagramUrl}
                        onChange={e => setInstagramUrl(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none text-sm"
                        placeholder="https://instagram.com/yourstore"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">
                        TikTok URL
                      </label>
                      <input
                        type="url"
                        value={tiktokUrl}
                        onChange={e => setTiktokUrl(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none text-sm"
                        placeholder="https://tiktok.com/@yourstore"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    What products will you sell?
                  </label>
                  <textarea
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                    rows={4}
                    placeholder="Describe your product catalog..."
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 text-lg bg-[#1e3b8a] hover:bg-[#16307a] text-white"
                  >
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
