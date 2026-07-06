'use client';

import { useState } from 'react';

import Link from 'next/link';

type Step = 'form' | 'success';

export default function SellerRegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('INDIVIDUAL');
  const [taxNumber, setTaxNumber] = useState('');
  const [description, setDescription] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          facebookUrl: facebookUrl || undefined,
          instagramUrl: instagramUrl || undefined,
          tiktokUrl: tiktokUrl || undefined,
          logoUrl: logoUrl || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Seller registration failed');
      }

      setStep('success');
    } catch (error: unknown) {
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center py-12 px-4 font-sans">
        <div className="w-full max-w-md bg-slate-950 border border-slate-800 p-8 rounded-2xl text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-950 border border-emerald-900 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg">
            ✓
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-100 mb-3">
            Application Received! 🎉
          </h1>
          <p className="text-slate-400 text-xs leading-relaxed mb-6">
            Your seller application for <strong className="text-slate-200">{storeName}</strong> has
            been successfully received.
          </p>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 text-left text-xs">
            <p className="font-bold text-slate-200 mb-2">⏳ Next Steps:</p>
            <ol className="space-y-2 list-decimal list-inside text-slate-400">
              <li>
                Check your email inbox at <strong className="text-slate-200">{email}</strong> to
                verify your email.
              </li>
              <li>Our administration team will audit and review your store details (1–2 days).</li>
              <li>
                You will receive an approval email. After that, you can log in to list products.
              </li>
            </ol>
          </div>
          <Link
            href="/seller/login"
            className="block w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-colors"
          >
            Check Status & Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="mx-auto text-center block">
          <span className="text-3xl font-black tracking-widest uppercase">
            Brandy<span className="text-indigo-400">.Seller</span>
          </span>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-black text-slate-100 uppercase tracking-tight">
          Create Seller Account
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          Apply to sell your Egyptian local brand to thousands of customers.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-950 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-950/55 border border-red-900 text-red-400 p-4 rounded-xl text-xs flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Mazen Hegazy"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Store Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Cairo Textiles"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Email Address
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
                minLength={8}
                placeholder="Min. 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Business Type
                </label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="BUSINESS">Company</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="+2010XXXXXXXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Tax Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="XXX-XXX-XXX"
                  value={taxNumber}
                  onChange={e => setTaxNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Store Logo URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://logo.png"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                />
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                🔗 Social Links (Optional)
              </label>
              <div className="space-y-2">
                <input
                  type="url"
                  placeholder="Facebook Page URL"
                  value={facebookUrl}
                  onChange={e => setFacebookUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                />
                <input
                  type="url"
                  placeholder="Instagram URL"
                  value={instagramUrl}
                  onChange={e => setInstagramUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                />
                <input
                  type="url"
                  placeholder="TikTok URL"
                  value={tiktokUrl}
                  onChange={e => setTiktokUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Describe your products / brand
              </label>
              <textarea
                required
                rows={3}
                placeholder="What kinds of clothing or products do you manufacture?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating account…' : 'Submit Application'}
              </button>
            </div>

            <div className="w-full h-px bg-slate-800/80 my-4" />

            <div className="text-center text-xs text-slate-400">
              Already have an account?{' '}
              <Link href="/seller/login" className="font-bold text-indigo-400 hover:underline">
                Sign In here →
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
