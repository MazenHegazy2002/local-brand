'use client';
import { useLanguage } from '@/providers/LanguageContext';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui';
import Link from 'next/link';

import { GOVERNORATES } from '@/lib/governorates';

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
  const { tr } = useLanguage();
  const { status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Real input states
  const [storeName, setStoreName] = useState('');
  const [type, setType] = useState('INDIVIDUAL');
  const [taxNumber, setTaxNumber] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');

  // Warehouse Pickup Address state
  const [governorate, setGovernorate] = useState('Cairo');
  const [city, setCity] = useState('');
  const [pickupStreet, setPickupStreet] = useState('');
  const [pickupBuilding, setPickupBuilding] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [pickupContactName, setPickupContactName] = useState('');
  const [pickupGeo, setPickupGeo] = useState('');
  const [pickupZone, setPickupZone] = useState('');
  const [pickupSubzone, setPickupSubzone] = useState('');
  const [logisticsHub, setLogisticsHub] = useState('المركز اللوجستي الرئيسي');
  const [gettingLocation, setGettingLocation] = useState(false);

  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

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
          governorate,
          city,
          pickupStreet,
          pickupBuilding: pickupBuilding || undefined,
          pickupPhone: pickupPhone || phone,
          pickupContactName: pickupContactName || undefined,
          pickupGeo: pickupGeo || undefined,
          pickupZone: pickupZone || undefined,
          pickupSubzone: pickupSubzone || undefined,
          logisticsHub: logisticsHub || undefined,
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
          <p className="text-xs font-bold uppercase tracking-widest mb-3 opacity-60">
            {tr('For Sellers')}
          </p>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            {tr("Sell on Brandyy — Egypt's Local Marketplace")}
          </h1>
          <p className="text-base opacity-75 max-w-lg mx-auto mb-8 leading-relaxed">
            {tr(
              'Join emerging Egyptian local brands already growing their business. Reach thousands of buyers with zero upfront costs.'
            )}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/seller/login?callbackUrl=/seller/apply"
              className="bg-white text-[#1e3b8a] font-black px-8 py-3 rounded-full text-sm hover:bg-gray-100 transition-colors"
            >
              {tr('Sign in to apply →')}
            </Link>
            <Link
              href="/seller/register?callbackUrl=/seller/apply"
              className="border border-white/40 text-white font-bold px-8 py-3 rounded-full text-sm hover:bg-white/10 transition-colors"
            >
              {tr('Create an account')}
            </Link>
          </div>
        </section>

        {/* Benefits grid */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">
            {tr('Why sell on Brandyy?')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {BENEFITS.map(b => (
              <div
                key={b.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col gap-3"
              >
                <div className="text-3xl">{b.icon}</div>
                <h3 className="font-black text-gray-900 text-base">{tr(b.title)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{tr(b.desc)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="container mx-auto px-4 pb-16 text-center">
          <div className="bg-[#1e3b8a]/5 border border-[#1e3b8a]/10 rounded-3xl py-12 px-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-gray-900 mb-3">{tr('Ready to start?')}</h2>
            <p className="text-gray-500 mb-6">
              {tr('Create a free account or sign in to submit your seller application.')}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/seller/login?callbackUrl=/seller/apply"
                className="bg-[#1e3b8a] text-white font-black px-8 py-3 rounded-full text-sm hover:bg-[#16307a] transition-colors"
              >
                {tr('Sign in to apply')}
              </Link>
              <Link
                href="/seller/register?callbackUrl=/seller/apply"
                className="border border-[#1e3b8a] text-[#1e3b8a] font-bold px-8 py-3 rounded-full text-sm hover:bg-[#1e3b8a]/5 transition-colors"
              >
                {tr('Register free')}
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
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {tr('Application Submitted!')}
              </h1>
              <p className="text-gray-600 mb-8 text-lg">
                {tr(
                  "Thank you for applying to become a seller on Brandyy. Our team will review your application within 2-3 business days. We'll send an email with the next steps once approved."
                )}
              </p>
              <Link href="/dashboard">
                <Button className="w-full text-lg h-14">{tr('Return to Dashboard')}</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-gray-900 mb-3">{tr('Become a Seller')}</h1>
                <p className="text-gray-500">
                  {tr('Join our marketplace and reach thousands of local customers.')}
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
                    {tr('Store Name')}
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
                      {tr('Business Type')}
                    </label>
                    <select
                      required
                      value={type}
                      onChange={e => setType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none bg-white"
                    >
                      <option value="INDIVIDUAL">{tr('Individual / Freelancer')}</option>
                      <option value="BUSINESS">{tr('Registered Company')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {tr('Phone Number')}
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

                {/* Warehouse Pickup Address Section */}
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-black text-gray-800 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <span>📍</span> {tr('Product Pickup Warehouse Address')}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    {tr(
                      'Couriers will dispatch drivers to this address to collect sold orders for delivery.'
                    )}
                  </p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          {tr('Pickup Governorate *')}
                        </label>
                        <select
                          required
                          value={governorate}
                          onChange={e => setGovernorate(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none bg-white text-sm"
                        >
                          {GOVERNORATES.map(g => (
                            <option key={g.value} value={g.en}>
                              {tr(g.en)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          {tr('Pickup City / Area *')}
                        </label>
                        <input
                          required
                          type="text"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none text-sm"
                          placeholder="e.g. Nasr City, Maadi, Dokki"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        {tr('Detailed Pickup Street Address *')}
                      </label>
                      <input
                        required
                        type="text"
                        value={pickupStreet}
                        onChange={e => setPickupStreet(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none text-sm"
                        placeholder={tr('Street name, Building number, Floor & Flat number')}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          {tr('Building / Landmark (Optional)')}
                        </label>
                        <input
                          type="text"
                          value={pickupBuilding}
                          onChange={e => setPickupBuilding(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none text-sm"
                          placeholder="e.g. Opposite El-Ahly Club"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          {tr('Pickup Contact Phone *')}
                        </label>
                        <input
                          required
                          type="text"
                          value={pickupPhone}
                          onChange={e => setPickupPhone(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none text-sm"
                          placeholder={tr('Courier driver contact phone')}
                        />
                      </div>
                    </div>

                    {/* Geolocation Coordinates & Map Pin */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="block text-xs font-bold text-slate-700">
                          {tr('🗺️ Warehouse Geolocation Coordinates (Latitude, Longitude)')}
                        </label>
                        <button
                          type="button"
                          disabled={gettingLocation}
                          onClick={() => {
                            if (!navigator.geolocation) {
                              alert(tr('Geolocation is not supported by your browser.'));
                              return;
                            }
                            setGettingLocation(true);
                            navigator.geolocation.getCurrentPosition(
                              pos => {
                                setGettingLocation(false);
                                setPickupGeo(
                                  `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`
                                );
                              },
                              err => {
                                setGettingLocation(false);
                                alert('Could not get live location: ' + err.message);
                              },
                              { enableHighAccuracy: true }
                            );
                          }}
                          className="px-3 py-1.5 bg-[#1e3b8a] text-white text-xs font-bold rounded-lg hover:bg-[#16307a] transition-all disabled:opacity-50"
                        >
                          {gettingLocation
                            ? tr('Detecting GPS...')
                            : tr('📍 Get Live GPS Location')}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            value={pickupGeo}
                            onChange={e => setPickupGeo(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono bg-white outline-none"
                            placeholder="e.g. 30.067807, 31.518141"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            {tr('Format: Lat, Long (e.g. 30.067807, 31.518141)')}
                          </p>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={pickupZone}
                            onChange={e => setPickupZone(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none"
                            placeholder={tr('District / Zone (e.g. قسم اول القاهرة الجديدة)')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {tr('Tax Registration Number (Optional)')}
                    </label>
                    <input
                      type="text"
                      value={taxNumber}
                      onChange={e => setTaxNumber(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                      placeholder={tr('XXX-XXX-XXX')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {tr('Store Logo (Optional)')}
                    </label>
                    <div className="flex items-center gap-4 border border-dashed border-gray-350 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50/80 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border border-gray-100 overflow-hidden shrink-0 shadow-sm relative">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoUrl}
                            alt={tr('Store Logo Preview')}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">🏪</span>
                        )}
                        {isUploadingLogo && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-semibold">
                            ...
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingLogo}
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploadingLogo(true);
                            try {
                              const formData = new FormData();
                              formData.append('file', file);
                              const uploadRes = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData,
                              });
                              if (!uploadRes.ok) throw new Error('Upload failed');
                              const data = await uploadRes.json();
                              if (data.url) setLogoUrl(data.url);
                            } catch (err) {
                              console.error(err);
                              alert(tr('Failed to upload logo.'));
                            } finally {
                              setIsUploadingLogo(false);
                            }
                          }}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className={`inline-block px-4 py-2 bg-white border border-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm ${isUploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isUploadingLogo
                            ? tr('Uploading...')
                            : logoUrl
                              ? tr('Change Logo')
                              : tr('Upload Logo')}
                        </label>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {tr(
                            'PNG, JPG up to 10MB. If empty, a letter-initial placeholder will be shown.'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-black text-gray-800 mb-4 uppercase tracking-wider">
                    {tr('🔗 Social Media Links')}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">
                        {tr('Facebook Page URL')}
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
                        {tr('Instagram URL')}
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
                        {tr('TikTok URL')}
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
                    {tr('What products will you sell?')}
                  </label>
                  <textarea
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                    rows={4}
                    placeholder={tr('Describe your product catalog...')}
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 text-lg bg-[#1e3b8a] hover:bg-[#16307a] text-white"
                  >
                    {isSubmitting ? tr('Submitting...') : tr('Submit Application')}
                  </Button>
                  <p className="text-center text-xs text-gray-500 mt-4">
                    {tr('By submitting, you agree to our')}{' '}
                    <Link href="/legal" className="text-[#1e3b8a] hover:underline">
                      {tr('Seller Terms & Conditions')}
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
