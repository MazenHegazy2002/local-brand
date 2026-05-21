'use client';
// src/app/sell/page.tsx
// Public "Become an Affiliate" landing page + application form

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

const PLATFORMS = [
  'Instagram',
  'TikTok',
  'YouTube',
  'Facebook',
  'Twitter/X',
  'Blog/Website',
  'Other',
];
const CATEGORIES = [
  'Fashion & Clothing',
  'Electronics',
  'Beauty & Skincare',
  'Home & Furniture',
  'Food & Groceries',
  'Sports & Fitness',
  'Kids & Toys',
  'Health & Pharma',
  'Jewelry',
  'Other',
];
const PAYOUT_METHODS = [
  { value: 'VODAFONE_CASH', label: 'Vodafone Cash' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'ETISALAT_CASH', label: 'Etisalat Cash' },
  { value: 'INSTAPAY', label: 'InstaPay' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

export default function SellPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState<'landing' | 'form' | 'success'>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    password: '',
    requestedCode: '',
    platform: '',
    platformFollowers: '',
    categoryFocus: '',
    applicationNote: '',
    payoutMethod: '',
    payoutDetails: '',
  });
  const [result, setResult] = useState<{ promoCode: string } | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/affiliate/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: !session ? form.name : undefined,
          email: !session ? form.email : undefined,
          phone: !session ? form.phone : undefined,
          whatsapp: form.whatsapp || undefined,
          password: !session ? form.password : undefined,
          requestedCode: form.requestedCode.toUpperCase() || undefined,
          platform: form.platform || undefined,
          platformFollowers: form.platformFollowers ? parseInt(form.platformFollowers) : undefined,
          categoryFocus: form.categoryFocus || undefined,
          applicationNote: form.applicationNote || undefined,
          payoutMethod: form.payoutMethod || undefined,
          payoutDetails: form.payoutDetails || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setResult({ promoCode: data.promoCode });
      setStep('success');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success' && result) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '64px 16px', textAlign: 'center' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#E1F5EE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <svg
            width="28"
            height="28"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#085041"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Application submitted!</h1>
        <p style={{ color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
          Your requested promo code is{' '}
          <strong style={{ fontFamily: 'monospace', color: '#1e3b8a' }}>{result.promoCode}</strong>.
          We review applications within 24–48 hours and will email you once approved.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: '#1e3b8a',
            color: '#fff',
            borderRadius: 10,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Back to home
        </Link>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 16px' }}>
        <button
          onClick={() => setStep('landing')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: 14,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Affiliate application</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>
          Takes 2 minutes. We review within 48 hours.
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Account Details for Guest Users */}
          {!session && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Full Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ahmed Ali"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#fff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Email Address <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#fff',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label
                    style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}
                  >
                    Phone Number <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="01xxxxxxxxx"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    required
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}
                  >
                    Password <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    required
                    minLength={8}
                    style={{
                      width: '100%',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: '#fff',
                    }}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Requested promo code{' '}
              <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. AHMED15"
              value={form.requestedCode}
              onChange={e =>
                set('requestedCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              }
              maxLength={16}
              style={{
                width: '100%',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 14,
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Leave blank and we generate one from your name
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Main platform
              </label>
              <select
                value={form.platform}
                onChange={e => set('platform', e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 14,
                  outline: 'none',
                  background: '#fff',
                }}
              >
                <option value="">Select platform</option>
                {PLATFORMS.map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Followers / subscribers
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 42000"
                value={form.platformFollowers}
                onChange={e => set('platformFollowers', e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Category focus
            </label>
            <select
              value={form.categoryFocus}
              onChange={e => set('categoryFocus', e.target.value)}
              style={{
                width: '100%',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 14,
                outline: 'none',
                background: '#fff',
              }}
            >
              <option value="">Select category</option>
              {CATEGORIES.map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              WhatsApp Number <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. 01xxxxxxxxx"
              value={form.whatsapp}
              onChange={e => set('whatsapp', e.target.value)}
              required
              style={{
                width: '100%',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Tell us about your audience{' '}
              <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              rows={3}
              value={form.applicationNote}
              onChange={e => set('applicationNote', e.target.value)}
              maxLength={1000}
              placeholder="Where you post, what you cover, why you'd be a great fit..."
              style={{
                width: '100%',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 14,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Payout preferences</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label
                  style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}
                >
                  Method
                </label>
                <select
                  value={form.payoutMethod}
                  onChange={e => set('payoutMethod', e.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 14,
                    outline: 'none',
                    background: '#fff',
                  }}
                >
                  <option value="">Select method</option>
                  {PAYOUT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}
                >
                  Phone number / IBAN
                </label>
                <input
                  type="text"
                  value={form.payoutDetails}
                  onChange={e => set('payoutDetails', e.target.value)}
                  placeholder="01xxxxxxxxx"
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: '#B91C1C',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px',
              background: '#1e3b8a',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Submitting...' : 'Submit application'}
          </button>
        </form>
      </div>
    );
  }

  // ─── Landing page ───────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '64px 16px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#EFF6FF',
            color: '#1e3b8a',
            borderRadius: 20,
            padding: '6px 16px',
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 24,
          }}
        >
          ✨ Earn money by sharing
        </div>
        <h1
          style={{
            fontSize: 42,
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 16,
            color: '#0f172a',
          }}
        >
          Join the Affiliate Program
        </h1>
        <p
          style={{
            fontSize: 18,
            color: '#64748b',
            maxWidth: 560,
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}
        >
          Share your unique promo code, earn commission on every sale, and give your audience an
          exclusive discount.
        </p>
        <button
          id="sell-apply-btn"
          onClick={() => setStep('form')}
          style={{
            display: 'inline-block',
            padding: '16px 36px',
            background: '#1e3b8a',
            color: '#fff',
            borderRadius: 14,
            fontWeight: 600,
            fontSize: 16,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(30,59,138,0.25)',
          }}
        >
          Apply now — it's free
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 64,
        }}
      >
        {[
          { label: 'Commission', value: '5–12%', sub: 'per confirmed sale' },
          { label: 'Buyer discount', value: 'Up to 30%', sub: 'applied at checkout' },
          { label: 'Referral bonus', value: '50 EGP', sub: 'when someone joins via your link' },
          { label: 'Joiner bonus', value: '30 EGP', sub: 'store credit when you join via a link' },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              background: '#F8FAFF',
              border: '1px solid #EEF2FF',
              borderRadius: 16,
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1e3b8a', marginBottom: 4 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          marginBottom: 64,
        }}
      >
        {[
          {
            step: '1',
            title: 'Apply in 2 minutes',
            desc: 'Tell us about your platform and audience. We review within 48 hours.',
          },
          {
            step: '2',
            title: 'Get your promo code',
            desc: 'Once approved you get a personal code (e.g. AHMED15) and a referral link.',
          },
          {
            step: '3',
            title: 'Earn every sale',
            desc: 'Every buyer who uses your code earns you commission. Get bonuses for new affiliates you refer.',
          },
        ].map(item => (
          <div
            key={item.step}
            style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px' }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#EFF6FF',
                color: '#1e3b8a',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                marginBottom: 16,
              }}
            >
              {item.step}
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{item.title}</h3>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3b8a 0%, #3b5cc4 100%)',
          borderRadius: 20,
          padding: '48px 40px',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 10 }}>Ready to start earning?</h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 28, fontSize: 16 }}>
          Join hundreds of Egyptian affiliates already earning on Local Brand.
        </p>
        <button
          onClick={() => setStep('form')}
          style={{
            background: '#fff',
            color: '#1e3b8a',
            border: 'none',
            borderRadius: 12,
            padding: '14px 32px',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Apply for free
        </button>
      </div>
    </div>
  );
}
