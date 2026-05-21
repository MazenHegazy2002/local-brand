'use client';
// src/app/affiliate/dashboard/page.tsx
// User-facing affiliate dashboard

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/providers/LanguageContext';

interface AffiliateDashboardData {
  affiliate: {
    id: string;
    promoCode: string;
    referralLink: string;
    status: string;
    tier: string;
    tierName: string;
    commissionPct: number;
    discountPct: number;
    totalEarnedEgp: number;
    pendingEarningsEgp: number;
    totalConversions: number;
    createdAt: string;
  };
  tiers: { tier: string; name: string; minConversions: number; commissionPct: number }[];
  nextTier: { tier: string; name: string; minConversions: number; commissionPct: number } | null;
  progress: number;
  settings: { referrerBonusEgp: number; joinerBonusEgp: number; bonusesEnabled: boolean };
  recentCommissions: {
    id: string;
    orderId: string;
    orderCreatedAt: string;
    orderTotalEgp: number;
    commissionPct: number;
    commissionEgp: number;
    status: string;
    confirmedAt: string | null;
  }[];
  payouts: { id: string; amountEgp: number; status: string; method: string; createdAt: string }[];
  bonuses: {
    id: string;
    type: string;
    amountEgp: number;
    status: string;
    expiresAt: string | null;
  }[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{
        fontSize: 12,
        padding: '6px 12px',
        cursor: 'pointer',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        background: 'transparent',
        color: copied ? '#085041' : '#64748b',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {copied ? t('AffiliateCopiedBtn') : t('AffiliateCopyBtn')}
    </button>
  );
}

export default function AffiliateDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, lang, isRTL } = useLanguage();
  const [data, setData] = useState<AffiliateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payoutForm, setPayoutForm] = useState({ method: '', payoutDetails: '' });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/affiliate/dashboard');
      return;
    }
    if (status !== 'authenticated') return;

    fetch('/api/affiliate/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load dashboard.'));
  }, [status, router]);

  useEffect(() => {
    if (data || error) {
      setLoading(false);
    }
  }, [data, error]);

  async function requestPayout(e: React.FormEvent) {
    e.preventDefault();
    setPayoutLoading(true);
    setPayoutMsg('');
    try {
      const res = await fetch('/api/affiliate/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payoutForm),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setPayoutMsg(
        lang === 'ar'
          ? `تم طلب سحب بقيمة ${d.amountEgp.toLocaleString('ar-EG')} ج.م بنجاح!`
          : `Payout of ${d.amountEgp} EGP requested successfully!`
      );
    } catch (err: unknown) {
      setPayoutMsg((err as Error).message);
    } finally {
      setPayoutLoading(false);
    }
  }

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

  const translateTier = (tName: string) => {
    if (lang !== 'ar') return tName;
    const arTiers: Record<string, string> = {
      Starter: 'مبتدئ',
      Silver: 'فضي',
      Gold: 'ذهبي',
      Platinum: 'بلاتيني',
    };
    return arTiers[tName] || tName;
  };

  if (loading)
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ color: '#64748b' }}>{t('AffiliateLoadingDashboard')}</div>
      </div>
    );

  if (error === 'No affiliate account found.') {
    return (
      <div
        style={{
          maxWidth: 520,
          margin: '80px auto',
          textAlign: 'center',
          padding: '0 16px',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          {t('AffiliateNotAffiliateYet')}
        </h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>{t('AffiliateNotAffiliateDesc')}</p>
        <Link
          href="/sell"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: '#1e3b8a',
            color: '#fff',
            borderRadius: 10,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          {t('AffiliateApplyFree')}
        </Link>
      </div>
    );
  }

  if (error)
    return <div style={{ textAlign: 'center', padding: 80, color: '#B91C1C' }}>{error}</div>;

  if (!data) return null;

  const { affiliate, nextTier, progress, settings, recentCommissions } = data;

  const statusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: '#E1F5EE', text: '#085041' },
    PENDING: { bg: '#FAEEDA', text: '#633806' },
    PAUSED: { bg: '#F1F5F9', text: '#475569' },
    BANNED: { bg: '#FCEBEB', text: '#791F1F' },
    REJECTED: { bg: '#FCEBEB', text: '#791F1F' },
  };
  const statusColor = statusColors[affiliate.status] ?? statusColors.PENDING;

  const statusLabels: Record<string, string> = {
    ACTIVE: t('AffiliateStatusActive') || 'ACTIVE',
    PENDING: t('AffiliateStatusPending') || 'PENDING',
    PAUSED: t('AffiliateStatusPaused') || 'PAUSED',
    BANNED: t('AffiliateStatusBanned') || 'BANNED',
    REJECTED: t('AffiliateStatusRejected') || 'REJECTED',
  };

  const tierColors: Record<string, string> = {
    STARTER: '#64748b',
    SILVER: '#94a3b8',
    GOLD: '#d97706',
    PLATINUM: '#7c3aed',
  };

  return (
    <div
      style={{
        maxWidth: 740,
        margin: '0 auto',
        padding: '32px 16px',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{t('AffiliateMyDashboard')}</h1>
          <p
            style={{
              fontSize: 13,
              color: '#64748b',
              margin: '4px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: isRTL ? 'flex-start' : 'flex-start',
            }}
          >
            <span>{session?.user?.name}</span>
            <span>·</span>
            <span>
              {t('AffiliateJoined')}{' '}
              {new Date(affiliate.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span>·</span>
            <span
              style={{
                display: 'inline-block',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                background: statusColor.bg,
                color: statusColor.text,
                fontWeight: 500,
              }}
            >
              {statusLabels[affiliate.status] ?? affiliate.status}
            </span>
          </p>
        </div>
        <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{t('AffiliateTierLabel')}</p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              margin: 0,
              color: tierColors[affiliate.tier] ?? '#1e3b8a',
            }}
          >
            {translateTier(affiliate.tierName)} ·{' '}
            {lang === 'ar'
              ? `عمولة ${affiliate.commissionPct}%`
              : `${affiliate.commissionPct}% commission`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isRTL ? 'repeat(auto-fit, minmax(140px, 1fr))' : 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: t('AffiliateTotalEarned'),
            value:
              lang === 'ar'
                ? `${affiliate.totalEarnedEgp.toLocaleString('ar-EG')} ج.م`
                : `${affiliate.totalEarnedEgp.toLocaleString('en-EG')} EGP`,
          },
          {
            label: t('AffiliatePending'),
            value:
              lang === 'ar'
                ? `${affiliate.pendingEarningsEgp.toLocaleString('ar-EG')} ج.م`
                : `${affiliate.pendingEarningsEgp.toLocaleString('en-EG')} EGP`,
          },
          {
            label: t('AffiliateTotalReferrals'),
            value:
              lang === 'ar'
                ? affiliate.totalConversions.toLocaleString('ar-EG')
                : affiliate.totalConversions.toString(),
          },
          {
            label: t('AffiliateConversions'),
            value:
              lang === 'ar'
                ? affiliate.totalConversions.toLocaleString('ar-EG')
                : affiliate.totalConversions.toString(),
          },
        ].map(s => (
          <div
            key={s.label}
            style={{
              background: '#F8FAFC',
              borderRadius: 10,
              padding: '12px 14px',
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 600, margin: '2px 0 0' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Promo Code */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 12,
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>
          {t('AffiliateMyPromoCode')}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}
        >
          <div
            style={{
              flex: 1,
              background: '#F8FAFC',
              borderRadius: 8,
              padding: '10px 14px',
              fontFamily: 'monospace',
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: 3,
              textAlign: 'center',
            }}
          >
            {affiliate.promoCode}
          </div>
          <CopyButton text={affiliate.promoCode} />
        </div>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
          {t('AffiliatePromoCodeDesc')
            .replace('{discountPct}', affiliate.discountPct.toString())
            .replace('{commissionPct}', affiliate.commissionPct.toString())}
        </p>
      </div>

      {/* Referral Link */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 12,
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>
          {t('AffiliateMyReferralLink')}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}
        >
          <div
            style={{
              flex: 1,
              background: '#F8FAFC',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: '#64748b',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {affiliate.referralLink}
          </div>
          <CopyButton text={affiliate.referralLink} />
        </div>
        {settings.bonusesEnabled && (
          <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ fontSize: 12, color: '#1e3b8a', margin: 0, fontWeight: 600 }}>
              {t('AffiliateReferralBonus')}
            </p>
            <p style={{ fontSize: 12, color: '#1e3b8a', margin: '4px 0 0' }}>
              {t('AffiliateReferralBonusDesc')
                .replace('{referrerBonus}', settings.referrerBonusEgp.toString())
                .replace('{joinerBonus}', settings.joinerBonusEgp.toString())}
            </p>
          </div>
        )}
      </div>

      {/* Recent commissions */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 12,
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>
          {t('AffiliateRecentCommissions')}
        </p>
        {recentCommissions.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            {t('AffiliateNoCommissions')}
          </p>
        ) : (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 90px 60px 90px',
                gap: 8,
                padding: '6px 0',
                color: '#94a3b8',
                fontSize: 12,
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <span style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {t('AffiliateOrderHeader')}
              </span>
              <span style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {t('AffiliateSaleValueHeader')}
              </span>
              <span style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {t('AffiliateRateHeader')}
              </span>
              <span style={{ textAlign: isRTL ? 'left' : 'right' }}>
                {t('AffiliateEarnedHeader')}
              </span>
            </div>
            {recentCommissions.slice(0, 6).map(c => (
              <div
                key={c.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 90px 60px 90px',
                  gap: 8,
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: 13,
                  alignItems: 'center',
                }}
              >
                <span style={{ color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>
                  #{c.orderId.slice(-6)} ·{' '}
                  {new Date(c.orderCreatedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG')}
                </span>
                <span style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  {lang === 'ar'
                    ? `${c.orderTotalEgp.toLocaleString('ar-EG')} ج.م`
                    : `${c.orderTotalEgp.toLocaleString('en-EG')} EGP`}
                </span>
                <span style={{ textAlign: isRTL ? 'right' : 'left' }}>{c.commissionPct}%</span>
                <span
                  style={{ textAlign: isRTL ? 'left' : 'right', color: '#085041', fontWeight: 600 }}
                >
                  {lang === 'ar'
                    ? `${c.commissionEgp.toFixed(1)} ج.م`
                    : `${c.commissionEgp.toFixed(1)} EGP`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tier progress */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 12,
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>
          {t('AffiliateProgressNextTier')}
        </p>
        {nextTier ? (
          <>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
              {t('AffiliateConversionsNeeded')
                .replace(
                  '{needed}',
                  (nextTier.minConversions - affiliate.totalConversions).toString()
                )
                .replace('{pct}', nextTier.commissionPct.toString())}
            </p>
            <div
              style={{
                background: '#F1F5F9',
                borderRadius: 4,
                height: 8,
                overflow: 'hidden',
                direction: isRTL ? 'rtl' : 'ltr',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: '#1e3b8a',
                  borderRadius: 4,
                  transition: 'width 0.5s',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                direction: isRTL ? 'rtl' : 'ltr',
              }}
            >
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {lang === 'ar'
                  ? `${affiliate.totalConversions.toLocaleString('ar-EG')} / ${nextTier.minConversions.toLocaleString('ar-EG')} تحويلات`
                  : `${affiliate.totalConversions} / ${nextTier.minConversions} conversions`}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {lang === 'ar' ? `${progress.toLocaleString('ar-EG')}%` : `${progress}%`}
              </span>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#085041', fontWeight: 500 }}>
            {t('AffiliateHighestTierReached')}
          </p>
        )}
      </div>

      {/* Payout request */}
      {affiliate.status === 'ACTIVE' && affiliate.pendingEarningsEgp > 0 && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px',
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>
            {t('AffiliateRequestPayoutLabel').replace(
              '{amount}',
              affiliate.pendingEarningsEgp.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG')
            )}
          </p>
          <form
            onSubmit={requestPayout}
            style={{ display: 'flex', gap: 10, flexWrap: 'wrap', direction: isRTL ? 'rtl' : 'ltr' }}
          >
            <select
              required
              value={payoutForm.method}
              onChange={e => setPayoutForm(f => ({ ...f, method: e.target.value }))}
              style={{
                flex: 1,
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                background: '#fff',
                minWidth: 160,
                textAlign: isRTL ? 'right' : 'left',
                direction: isRTL ? 'rtl' : 'ltr',
              }}
            >
              <option value="">{t('AffiliateSelectMethod')}</option>
              <option value="VODAFONE_CASH">{translatePayoutMethod('Vodafone Cash')}</option>
              <option value="ORANGE_MONEY">{translatePayoutMethod('Orange Money')}</option>
              <option value="ETISALAT_CASH">{translatePayoutMethod('Etisalat Cash')}</option>
              <option value="INSTAPAY">{translatePayoutMethod('InstaPay')}</option>
              <option value="BANK_TRANSFER">{translatePayoutMethod('Bank Transfer')}</option>
            </select>
            <input
              required
              placeholder={t('AffiliatePhoneOrIban')}
              value={payoutForm.payoutDetails}
              onChange={e => setPayoutForm(f => ({ ...f, payoutDetails: e.target.value }))}
              style={{
                flex: 2,
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                minWidth: 200,
                textAlign: isRTL ? 'right' : 'left',
              }}
            />
            <button
              type="submit"
              disabled={payoutLoading}
              style={{
                background: '#1e3b8a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {payoutLoading ? t('AffiliateRequestingPayout') : t('AffiliateRequestPayoutBtn')}
            </button>
          </form>
          {payoutMsg && (
            <p
              style={{
                fontSize: 12,
                marginTop: 8,
                color:
                  payoutMsg.includes('EGP') ||
                  payoutMsg.includes('ج.م') ||
                  payoutMsg.includes('بنجاح') ||
                  payoutMsg.includes('success')
                    ? '#085041'
                    : '#B91C1C',
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {payoutMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
