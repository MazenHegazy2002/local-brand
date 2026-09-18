'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PasswordStrength from '@/components/PasswordStrength';

type Step = 'form' | 'success';

const BENEFITS = [
  {
    icon: '🛍️',
    title: 'Reach Thousands of Egyptian Shoppers',
    desc: 'Connect with active buyers looking for authentic local Egyptian brands and quality products.',
  },
  {
    icon: '💰',
    title: 'Zero Upfront Costs',
    desc: 'Listing your products is 100% free. We only earn a small commission when you make a successful sale.',
  },
  {
    icon: '⚡',
    title: 'Instant Store Management',
    desc: 'Manage your catalog, track stock, fulfill orders, and monitor earnings from your unified Seller Hub.',
  },
  {
    icon: '🛡️',
    title: 'Verified Brand Badge',
    desc: 'Build trust with buyers instantly with a verified seller badge displayed across your store & products.',
  },
];

export default function BecomeSellerPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL');
  const [taxNumber, setTaxNumber] = useState('');
  const [description, setDescription] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>('form');

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref') || params.get('code') || params.get('promo');
      if (refParam) {
        setReferralCode(refParam.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
        return;
      }
      const match = document.cookie.match(/(?:^|;\s*)brandy_ref=([^;]+)/);
      if (match && match[1]) {
        setReferralCode(
          decodeURIComponent(match[1])
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, '')
        );
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!storeName.trim()) {
      setError('Please provide your Store or Brand Name.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role: 'SELLER',
          storeName,
          phone: phone || undefined,
          type,
          taxNumber: taxNumber || undefined,
          description: description || undefined,
          instagramUrl: instagramUrl || undefined,
          facebookUrl: facebookUrl || undefined,
          tiktokUrl: tiktokUrl || undefined,
          referralCode: referralCode.trim() ? referralCode.trim().toUpperCase() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Seller registration failed');
      }

      setStep('success');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-white to-[hsl(var(--accent)/0.08)] flex flex-col items-center justify-center py-12 px-4 font-sans">
        <div className="w-full max-w-lg bg-white border border-gray-100 p-8 sm:p-10 rounded-3xl text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm">
            ✓
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-3">
            Application Received! 🎉
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            Thank you for registering{' '}
            <strong className="text-[hsl(var(--primary))]">{storeName}</strong> on Brandy! Your
            seller application is submitted and currently under review.
          </p>

          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 mb-8 text-left text-xs space-y-3">
            <p className="font-bold text-amber-900 text-sm mb-1 flex items-center gap-2">
              <span>⏳</span> Next Steps:
            </p>
            <ol className="space-y-2 list-decimal list-inside text-amber-800 leading-relaxed">
              <li>
                Check your inbox at <strong className="text-gray-900">{email}</strong> to verify
                your email address.
              </li>
              <li>Our merchant team will review your brand details (1–2 business days).</li>
              <li>
                Once approved, you will receive an email and full access to set up products in your
                Seller Hub!
              </li>
            </ol>
          </div>

          <Link
            href="/seller/login"
            className="block w-full py-3.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] text-white font-bold rounded-xl text-sm tracking-wide shadow-lg transition-all"
          >
            Sign In to Seller Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-white to-[hsl(var(--accent)/0.08)] text-[hsl(var(--foreground))] flex flex-col justify-between">
      {/* Navigation Bar */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-2xl font-black tracking-tighter"
        >
          <span className="text-[hsl(var(--primary))]">BRAND</span>
          <span className="text-[hsl(var(--accent))]">Y</span>
          <span className="ml-2 text-xs uppercase tracking-widest font-bold px-2.5 py-0.5 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] rounded-full">
            Seller Portal
          </span>
        </Link>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-gray-500 hidden sm:inline">Already registered as a seller?</span>
          <Link
            href="/seller/login"
            className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-[hsl(var(--primary))] border border-gray-200 shadow-sm font-bold transition-colors"
          >
            Seller Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 w-full">
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Left Column: Hero Information */}
          <div className="w-full lg:w-5/12 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))] text-xs font-bold uppercase tracking-wider mb-4">
                🚀 Join Egypt&apos;s Premier Local Marketplace
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 leading-tight">
                Grow Your Brand. <br />
                <span className="text-[hsl(var(--primary))]">Sell to Thousands.</span>
              </h1>
              <p className="mt-4 text-gray-600 text-base leading-relaxed">
                Set up your brand store on Brandy in minutes. Reach customers nationwide with zero
                fixed monthly fees.
              </p>
            </div>

            {/* Benefits list */}
            <div className="space-y-3.5">
              {BENEFITS.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-start gap-4 hover:border-gray-200 transition-colors"
                >
                  <div className="text-2xl p-2.5 rounded-xl bg-[hsl(var(--primary)/0.06)] border border-[hsl(var(--primary)/0.15)] shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-xs text-indigo-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-indigo-950">
                <span>🔒</span> Safe & Transparent Partnership
              </p>
              <p className="text-indigo-800">
                Payouts processed safely, customer dispute support, and dedicated merchant
                assistance.
              </p>
            </div>
          </div>

          {/* Right Column: Registration Form */}
          <div className="w-full lg:w-7/12">
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-2xl">
              <div className="border-b border-gray-100 pb-5 mb-6">
                <h2 className="text-2xl font-black text-gray-900">Create Seller Account</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Fill in your store details below to submit your brand application.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <strong className="block font-bold">Registration Error</strong>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Store Name & Contact Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Store / Brand Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cairo Streetwear"
                      value={storeName}
                      onChange={e => setStoreName(e.target.value)}
                      className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Owner / Contact Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ahmed Hassan"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="owner@brand.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Phone / WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+20 100 000 0000"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm bg-white"
                    />
                    <PasswordStrength password={password} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Business Type & Tax Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Business Type
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setType('INDIVIDUAL')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                          type === 'INDIVIDUAL'
                            ? 'bg-white shadow text-[hsl(var(--primary))] border border-gray-200'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Individual / Brand
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('BUSINESS')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                          type === 'BUSINESS'
                            ? 'bg-white shadow text-[hsl(var(--primary))] border border-gray-200'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Company / LLC
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tax Registration ID{' '}
                      <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 123-456-789"
                      value={taxNumber}
                      onChange={e => setTaxNumber(e.target.value)}
                      className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Store Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Brief Brand Description{' '}
                    <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Tell us what products you sell, your target audience, or specialty..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm bg-white resize-none"
                  />
                </div>

                {/* Social Handles */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Social Handles / Store Page{' '}
                    <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="url"
                      placeholder="Instagram URL"
                      value={instagramUrl}
                      onChange={e => setInstagramUrl(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-[hsl(var(--primary))] bg-white"
                    />
                    <input
                      type="url"
                      placeholder="Facebook Page URL"
                      value={facebookUrl}
                      onChange={e => setFacebookUrl(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-[hsl(var(--primary))] bg-white"
                    />
                    <input
                      type="url"
                      placeholder="TikTok Profile URL"
                      value={tiktokUrl}
                      onChange={e => setTiktokUrl(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-[hsl(var(--primary))] bg-white"
                    />
                  </div>
                </div>

                {/* Referral / Promo Code */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Referral / Promo Code{' '}
                    <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. PARTNER10 or affiliate code"
                      value={referralCode}
                      onChange={e =>
                        setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
                      }
                      maxLength={30}
                      className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm bg-white uppercase tracking-wider font-mono"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none pointer-events-none">
                      🏷️
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Were you referred by an affiliate or partner? Enter their promo/referral code
                    here.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    'Submit Seller Application →'
                  )}
                </button>

                <p className="text-center text-gray-500 text-xs mt-3">
                  By registering, you agree to Brandy Seller Terms & Conditions.
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 text-center text-gray-500 text-xs">
        <p>© {new Date().getFullYear()} Brandy Marketplace. All rights reserved.</p>
      </footer>
    </div>
  );
}
