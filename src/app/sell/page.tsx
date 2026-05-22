'use client';
// src/app/sell/page.tsx
// Public "Become an Affiliate" landing page + application form

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/providers/LanguageContext';

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
  const { t, lang, isRTL } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState<'landing' | 'auth' | 'form' | 'success'>('landing');

  // ── Affiliate application form state ──────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    whatsapp: '',
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

  // ── Auth gate state ────────────────────────────────────────────────────────
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const setAuth = (k: string, v: string) => setAuthForm(f => ({ ...f, [k]: v }));

  function handleApplyClick() {
    if (session) {
      setStep('form');
    } else {
      setAuthTab('login');
      setAuthError('');
      setStep('auth');
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      if (authTab === 'login') {
        const result = await signIn('credentials', {
          email: authForm.email,
          password: authForm.password,
          redirect: false,
        });
        if (!result?.ok) {
          throw new Error(
            result?.error === 'CredentialsSignin'
              ? lang === 'ar'
                ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
                : 'Invalid email or password.'
              : lang === 'ar'
                ? 'فشل تسجيل الدخول.'
                : 'Sign in failed.'
          );
        }
      } else {
        // Register new account then auto sign-in
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: authForm.name,
            email: authForm.email,
            password: authForm.password,
            phone: authForm.phone,
            role: 'BUYER',
          }),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data.message || (lang === 'ar' ? 'فشل إنشاء الحساب.' : 'Registration failed.')
          );
        const siResult = await signIn('credentials', {
          email: authForm.email,
          password: authForm.password,
          redirect: false,
        });
        if (!siResult?.ok)
          throw new Error(
            lang === 'ar'
              ? 'تم إنشاء الحساب. يرجى تسجيل الدخول يدوياً.'
              : 'Account created. Please sign in manually.'
          );
      }
      setStep('form');
    } catch (err: unknown) {
      setAuthError((err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  }

  const translatePlatform = (p: string) => {
    if (lang !== 'ar') return p;
    const arPlatforms: Record<string, string> = {
      Instagram: 'إنستغرام',
      TikTok: 'تيك توك',
      YouTube: 'يوتيوب',
      Facebook: 'فيسبوك',
      'Twitter/X': 'تويتر/إكس',
      'Blog/Website': 'مدونة/موقع إلكتروني',
      Other: 'أخرى',
    };
    return arPlatforms[p] || p;
  };

  const translateCategory = (c: string) => {
    if (lang !== 'ar') return c;
    const arCategories: Record<string, string> = {
      'Fashion & Clothing': 'الأزياء والملابس',
      Electronics: 'الإلكترونيات',
      'Beauty & Skincare': 'الجمال والعناية بالبشرة',
      'Home & Furniture': 'المنزل والأثاث',
      'Food & Groceries': 'البقالة والأغذية',
      'Sports & Fitness': 'الرياضة واللياقة البدنية',
      'Kids & Toys': 'الأطفال والألعاب',
      'Health & Pharma': 'الصحة والأدوية',
      Jewelry: 'المجوهرات',
      Other: 'أخرى',
    };
    return arCategories[c] || c;
  };

  const translatePayoutMethod = (label: string) => {
    if (lang !== 'ar') return label;
    const arPayouts: Record<string, string> = {
      'Vodafone Cash': 'فودافون كاش',
      'Orange Money': 'أورنج ماني',
      'Etisalat Cash': 'اتصالات كاش',
      InstaPay: 'إنستا باي',
      'Bank Transfer': 'تحويل بنكي',
    };
    return arPayouts[label] || label;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/affiliate/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp: form.whatsapp || undefined,
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
      if (!res.ok) {
        // Already an affiliate → send to dashboard
        if (
          res.status === 400 &&
          typeof data.error === 'string' &&
          data.error.includes('already have an affiliate')
        ) {
          router.push('/affiliate/dashboard');
          return;
        }
        throw new Error(data.error ?? 'Something went wrong.');
      }
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
      <div
        style={{
          maxWidth: 520,
          margin: '0 auto',
          padding: '64px 16px',
          textAlign: 'center',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
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
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          {t('AffiliateSubmitted')}
        </h1>
        <p style={{ color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
          {lang === 'ar'
            ? `كود الخصم المطلوب الخاص بك هو ${result.promoCode}. سنقوم بمراجعة الطلبات في غضون 24-48 ساعة وسنرسل لك بريدًا إلكترونيًا بمجرد الموافقة.`
            : `Your requested promo code is ${result.promoCode}. We review applications within 24–48 hours and will email you once approved.`}
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
          {t('AffiliateBackHome')}
        </Link>
      </div>
    );
  }

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (step === 'auth') {
    const inputStyle: React.CSSProperties = {
      width: '100%',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 14,
      outline: 'none',
      boxSizing: 'border-box',
      background: '#fff',
      textAlign: isRTL ? 'right' : 'left',
    };
    const labelStyle: React.CSSProperties = {
      display: 'block',
      fontSize: 13,
      fontWeight: 500,
      marginBottom: 6,
      textAlign: isRTL ? 'right' : 'left',
    };

    return (
      <div
        style={{
          maxWidth: 440,
          margin: '0 auto',
          padding: '56px 16px',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
        {/* Back link */}
        <button
          onClick={() => setStep('landing')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: 14,
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'inherit',
          }}
        >
          {isRTL ? '→ رجوع' : '← Back'}
        </button>

        {/* Header */}
        <div style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 28 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🚀</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 6px' }}>
            {lang === 'ar' ? 'انضم لبرنامج الأفيليت' : 'Join the Affiliate Program'}
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            {lang === 'ar'
              ? 'سجّل دخولك أو أنشئ حساباً للمتابعة'
              : 'Sign in or create an account to continue'}
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: 24,
            gap: 0,
          }}
        >
          {(['login', 'register'] as const).map(tab => {
            const label =
              tab === 'login'
                ? lang === 'ar'
                  ? 'تسجيل الدخول'
                  : 'Sign in'
                : lang === 'ar'
                  ? 'حساب جديد'
                  : 'Create account';
            return (
              <button
                key={tab}
                onClick={() => {
                  setAuthTab(tab);
                  setAuthError('');
                }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'none',
                  border: 'none',
                  borderBottom: authTab === tab ? '2px solid #1e3b8a' : '2px solid transparent',
                  color: authTab === tab ? '#1e3b8a' : '#64748b',
                  fontWeight: authTab === tab ? 600 : 400,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {authTab === 'register' && (
            <>
              <div>
                <label style={labelStyle}>
                  {lang === 'ar' ? 'الاسم الكامل' : 'Full name'}{' '}
                  <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={e => setAuth('name', e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: أحمد علي' : 'e.g. Ahmed Ali'}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  {lang === 'ar' ? 'رقم الهاتف' : 'Phone number'}{' '}
                  <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={authForm.phone}
                  onChange={e => setAuth('phone', e.target.value)}
                  placeholder="01xxxxxxxxx"
                  required
                  style={inputStyle}
                />
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>
              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}{' '}
              <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="email"
              value={authForm.email}
              onChange={e => setAuth('email', e.target.value)}
              placeholder="name@example.com"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              {lang === 'ar' ? 'كلمة المرور' : 'Password'}{' '}
              <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="password"
              value={authForm.password}
              onChange={e => setAuth('password', e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              style={inputStyle}
            />
            {authTab === 'register' && (
              <p
                style={{
                  fontSize: 12,
                  color: '#94a3b8',
                  marginTop: 4,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {lang === 'ar' ? '٨ أحرف على الأقل' : 'At least 8 characters'}
              </p>
            )}
          </div>

          {authError && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: '#B91C1C',
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            style={{
              padding: '13px',
              background: '#1e3b8a',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: authLoading ? 'not-allowed' : 'pointer',
              opacity: authLoading ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {authLoading
              ? lang === 'ar'
                ? '...'
                : '...'
              : authTab === 'login'
                ? lang === 'ar'
                  ? 'تسجيل الدخول والمتابعة'
                  : 'Sign in & continue'
                : lang === 'ar'
                  ? 'إنشاء حساب والمتابعة'
                  : 'Create account & continue'}
          </button>

          {authTab === 'login' && (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', margin: 0 }}>
              <Link href="/forgot-password" style={{ color: '#1e3b8a' }}>
                {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
              </Link>
            </p>
          )}
        </form>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '48px 16px',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
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
            fontFamily: 'inherit',
          }}
        >
          {isRTL ? '→ رجوع' : '← Back'}
        </button>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 4,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {t('AffiliateApplication')}
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: 14,
            marginBottom: 32,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {t('AffiliateTakes2Min')}
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 6,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {t('AffiliateRequestedCode')}{' '}
              <span style={{ color: '#94a3b8', fontWeight: 400 }}>({t('AffiliateOptional')})</span>
            </label>
            <input
              type="text"
              placeholder={lang === 'ar' ? 'مثال: AHMED15' : 'e.g. AHMED15'}
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
                textAlign: isRTL ? 'right' : 'left',
              }}
            />
            <p
              style={{
                fontSize: 12,
                color: '#94a3b8',
                marginTop: 4,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {t('AffiliateGenerateFromName')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 6,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {t('AffiliateMainPlatform')}
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
                  textAlign: isRTL ? 'right' : 'left',
                  direction: isRTL ? 'rtl' : 'ltr',
                }}
              >
                <option value="">{t('AffiliateSelectPlatform')}</option>
                {PLATFORMS.map(p => (
                  <option key={p} value={p}>
                    {translatePlatform(p)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 6,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {t('AffiliateFollowers')}
              </label>
              <input
                type="number"
                min="0"
                placeholder={lang === 'ar' ? 'مثال: 42000' : 'e.g. 42000'}
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
                  textAlign: isRTL ? 'right' : 'left',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 6,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {t('AffiliateCategoryFocus')}
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
                textAlign: isRTL ? 'right' : 'left',
                direction: isRTL ? 'rtl' : 'ltr',
              }}
            >
              <option value="">{t('AffiliateSelectCategory')}</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {translateCategory(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 6,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {t('AffiliateWhatsApp')} <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="tel"
              placeholder={lang === 'ar' ? 'مثال: 01xxxxxxxxx' : 'e.g. 01xxxxxxxxx'}
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
                textAlign: isRTL ? 'right' : 'left',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 6,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {t('AffiliateTellAudience')}{' '}
              <span style={{ color: '#94a3b8', fontWeight: 400 }}>({t('AffiliateOptional')})</span>
            </label>
            <textarea
              rows={3}
              value={form.applicationNote}
              onChange={e => set('applicationNote', e.target.value)}
              maxLength={1000}
              placeholder={t('AffiliateTellAudiencePlaceholder')}
              style={{
                width: '100%',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 14,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                textAlign: isRTL ? 'right' : 'left',
              }}
            />
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 12,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {t('AffiliatePayoutPrefs')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#64748b',
                    marginBottom: 6,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t('AffiliatePayoutMethod')}
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
                    textAlign: isRTL ? 'right' : 'left',
                    direction: isRTL ? 'rtl' : 'ltr',
                  }}
                >
                  <option value="">{t('AffiliateSelectMethod')}</option>
                  {PAYOUT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>
                      {translatePayoutMethod(m.label)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#64748b',
                    marginBottom: 6,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t('AffiliatePhoneOrIban')}
                </label>
                <input
                  type="text"
                  value={form.payoutDetails}
                  onChange={e => set('payoutDetails', e.target.value)}
                  placeholder={lang === 'ar' ? 'رقم الهاتف أو الآيبان' : '01xxxxxxxxx'}
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    textAlign: isRTL ? 'right' : 'left',
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
                textAlign: isRTL ? 'right' : 'left',
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
            {loading ? t('AffiliateSubmitting') : t('AffiliateSubmitApplication')}
          </button>
        </form>
      </div>
    );
  }

  // ─── Landing page ───────────────────────────────────────────────────────────
  return (
    <div
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '64px 16px',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
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
          {t('AffiliateEarnBySharing')}
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
          {t('AffiliateJoinProgram')}
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
          {t('AffiliateProgramDesc')}
        </p>
        <button
          id="sell-apply-btn"
          onClick={handleApplyClick}
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
          {t('AffiliateApplyFree')}
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isRTL ? 'repeat(auto-fit, minmax(180px, 1fr))' : 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 64,
        }}
      >
        {[
          { label: t('AffiliateCommissionSub'), value: '5–12%', sub: t('earnings') },
          {
            label: t('AffiliateBuyerDiscountSub'),
            value: 'Up to 30%',
            sub: t('AffiliateBuyerDiscount'),
          },
          {
            label: t('AffiliateReferralBonusSub'),
            value: lang === 'ar' ? '٥٠ ج.م' : '50 EGP',
            sub: t('AffiliateReferralBonus'),
          },
          {
            label: t('AffiliateJoinerBonusSub'),
            value: lang === 'ar' ? '٣٠ ج.م' : '30 EGP',
            sub: t('AffiliateJoinerBonus'),
          },
        ].map((stat, idx) => (
          <div
            key={idx}
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
              {stat.sub}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isRTL ? 'repeat(auto-fit, minmax(240px, 1fr))' : 'repeat(3, 1fr)',
          gap: 20,
          marginBottom: 64,
        }}
      >
        {[
          {
            step: '1',
            title: t('AffiliateApplyIn2Min'),
            desc: t('AffiliateApplyIn2MinDesc'),
          },
          {
            step: '2',
            title: t('AffiliateGetCode'),
            desc: t('AffiliateGetCodeDesc'),
          },
          {
            step: '3',
            title: t('AffiliateEarnEverySale'),
            desc: t('AffiliateEarnEverySaleDesc'),
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
            <h3
              style={{
                fontWeight: 600,
                fontSize: 15,
                marginBottom: 8,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {item.title}
            </h3>
            <p
              style={{
                color: '#64748b',
                fontSize: 14,
                lineHeight: 1.6,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {item.desc}
            </p>
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
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 10 }}>
          {t('AffiliateReadyStart')}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 28, fontSize: 16 }}>
          {t('AffiliateJoinHundreds')}
        </p>
        <button
          onClick={handleApplyClick}
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
          {t('AffiliateApplyFree')}
        </button>
      </div>
    </div>
  );
}
