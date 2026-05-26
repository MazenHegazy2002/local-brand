'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
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
      className={`px-4 py-2 text-xs font-black uppercase rounded-lg border transition-all duration-300 ${
        copied
          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
      }`}
    >
      {copied ? t('AffiliateCopiedBtn') || 'Copied!' : t('AffiliateCopyBtn') || 'Copy'}
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
      // Reload dashboard data
      const reloadRes = await fetch('/api/affiliate/dashboard');
      const reloadData = await reloadRes.json();
      if (!reloadData.error) setData(reloadData);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-400 text-sm animate-pulse font-medium">
          {t('AffiliateLoadingDashboard') || 'Loading Affiliate Dashboard…'}
        </div>
      </div>
    );
  }

  if (error === 'No affiliate account found.') {
    return (
      <div
        className={`max-w-md mx-auto my-32 text-center px-4 font-sans ${
          isRTL ? 'direction-rtl' : 'direction-ltr'
        }`}
      >
        <div className="text-6xl mb-6">🚀</div>
        <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">
          {t('AffiliateNotAffiliateYet') || 'Not an Affiliate Yet'}
        </h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          {t('AffiliateNotAffiliateDesc') ||
            'Join our growth network to start earning premium commissions.'}
        </p>
        <Link
          href="/sell"
          className="inline-block px-8 py-3.5 bg-slate-950 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg"
        >
          {t('AffiliateApplyFree') || "Apply Now — It's Free"}
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-600 font-bold max-w-sm mx-auto font-sans">
        <p className="mb-4">⚠️ {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-slate-900 underline font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { affiliate, nextTier, progress, settings, recentCommissions } = data;

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
    PAUSED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
    BANNED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
    REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
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
    STARTER: 'text-slate-500',
    SILVER: 'text-slate-400',
    GOLD: 'text-amber-600',
    PLATINUM: 'text-violet-600',
  };

  return (
    <div
      className={`min-h-screen bg-[#F8FAFC] font-sans pb-24 ${isRTL ? 'rtl' : 'ltr'}`}
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* Premium Dashboard Header Toolbar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black tracking-widest uppercase">
              Brandy<span className="text-indigo-400">.Affiliate</span>
            </span>
          </div>

          {/* Action Buttons: back to shop & sign out */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {lang === 'ar' ? 'الرجوع للمتجر' : 'Back to Shop'}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-4 py-2 bg-red-650/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {lang === 'ar' ? 'خروج' : 'Sign Out'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        {/* Profile Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t('AffiliateMyDashboard') || 'My Affiliate Dashboard'}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 font-bold flex-wrap">
              <span>{session?.user?.name}</span>
              <span>·</span>
              <span>
                {t('AffiliateJoined') || 'Joined'}{' '}
                {new Date(affiliate.createdAt).toLocaleDateString(
                  lang === 'ar' ? 'ar-EG' : 'en-EG',
                  {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }
                )}
              </span>
              <span>·</span>
              <span
                className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
              >
                {statusLabels[affiliate.status] ?? affiliate.status}
              </span>
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
              {t('AffiliateTierLabel') || 'Current Tier'}
            </p>
            <p
              className={`text-lg font-black uppercase ${tierColors[affiliate.tier] ?? 'text-indigo-600'}`}
            >
              {translateTier(affiliate.tierName)} ·{' '}
              {lang === 'ar'
                ? `عمولة ${affiliate.commissionPct}%`
                : `${affiliate.commissionPct}% commission`}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: t('AffiliateTotalEarned') || 'Total Earned',
              value:
                lang === 'ar'
                  ? `${affiliate.totalEarnedEgp.toLocaleString('ar-EG')} ج.م`
                  : `${affiliate.totalEarnedEgp.toLocaleString('en-EG')} EGP`,
              icon: '💰',
            },
            {
              label: t('AffiliatePending') || 'Pending Balance',
              value:
                lang === 'ar'
                  ? `${affiliate.pendingEarningsEgp.toLocaleString('ar-EG')} ج.م`
                  : `${affiliate.pendingEarningsEgp.toLocaleString('en-EG')} EGP`,
              icon: '⏳',
            },
            {
              label: t('AffiliateTotalReferrals') || 'Total Referrals',
              value:
                lang === 'ar'
                  ? affiliate.totalConversions.toLocaleString('ar-EG')
                  : affiliate.totalConversions.toString(),
              icon: '👥',
            },
            {
              label: t('AffiliateConversions') || 'Conversions',
              value:
                lang === 'ar'
                  ? affiliate.totalConversions.toLocaleString('ar-EG')
                  : affiliate.totalConversions.toString(),
              icon: '📈',
            },
          ].map((s, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute right-3 top-3 text-lg opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                {s.icon}
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                {s.label}
              </p>
              <p className="text-xl font-black text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Promo Code & Link section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Promo Code */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              {t('AffiliateMyPromoCode') || 'My Promo Code'}
            </h3>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-4 font-mono text-xl font-black text-center tracking-widest text-slate-800 uppercase shadow-inner select-all">
                {affiliate.promoCode}
              </div>
              <CopyButton text={affiliate.promoCode} />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {(
                t('AffiliatePromoCodeDesc') ||
                'Share this code to offer your audience {discountPct}% off their orders, while you earn a {commissionPct}% commission!'
              )
                .replace('{discountPct}', affiliate.discountPct.toString())
                .replace('{commissionPct}', affiliate.commissionPct.toString())}
            </p>
          </div>

          {/* Referral Link */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              {t('AffiliateMyReferralLink') || 'My Referral Link'}
            </h3>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 text-xs text-slate-500 select-all truncate font-mono text-left">
                {affiliate.referralLink}
              </div>
              <CopyButton text={affiliate.referralLink} />
            </div>
            {settings.bonusesEnabled && (
              <div className="bg-indigo-50 border border-indigo-100/60 rounded-xl p-3">
                <p className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-0.5">
                  {t('AffiliateReferralBonus') || 'Referral Bonus'}
                </p>
                <p className="text-[11px] text-indigo-600/90 leading-relaxed">
                  {(
                    t('AffiliateReferralBonusDesc') ||
                    'Invite friends! They get {joinerBonus} EGP on signup, and you get {referrerBonus} EGP once they complete their first order.'
                  )
                    .replace('{referrerBonus}', settings.referrerBonusEgp.toString())
                    .replace('{joinerBonus}', settings.joinerBonusEgp.toString())}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tier Progress */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
            {t('AffiliateProgressNextTier') || 'Tier Progression'}
          </h3>
          {nextTier ? (
            <>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed font-light">
                {(
                  t('AffiliateConversionsNeeded') ||
                  'You need {needed} more conversions to reach {tierName} and unlock {pct}% commission.'
                )
                  .replace(
                    '{needed}',
                    (nextTier.minConversions - affiliate.totalConversions).toString()
                  )
                  .replace('{tierName}', translateTier(nextTier.name))
                  .replace('{pct}', nextTier.commissionPct.toString())}
              </p>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-slate-900 h-2.5 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2.5 text-xs text-slate-400 font-bold">
                <span>
                  {lang === 'ar'
                    ? `${affiliate.totalConversions.toLocaleString('ar-EG')} / ${nextTier.minConversions.toLocaleString('ar-EG')} تحويل`
                    : `${affiliate.totalConversions} / ${nextTier.minConversions} conversions`}
                </span>
                <span>{progress}%</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-emerald-600 font-bold">
              🎉{' '}
              {t('AffiliateHighestTierReached') ||
                'Congratulations! You have reached the highest affiliate tier.'}
            </p>
          )}
        </div>

        {/* Recent Commissions */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
            {t('AffiliateRecentCommissions') || 'Recent Commissions'}
          </h3>
          {recentCommissions.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">
              {t('AffiliateNoCommissions') || 'No conversions registered yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-widest font-black text-[9px] pb-2">
                    <th className="pb-3">{t('AffiliateOrderHeader') || 'Order'}</th>
                    <th className="pb-3">{t('AffiliateSaleValueHeader') || 'Sale Value'}</th>
                    <th className="pb-3">{t('AffiliateRateHeader') || 'Commission %'}</th>
                    <th className="pb-3 text-right">{t('AffiliateEarnedHeader') || 'Earned'}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCommissions.slice(0, 6).map(c => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-3 font-bold text-slate-800">
                        #{c.orderId.slice(-6).toUpperCase()}
                        <span className="text-[10px] text-slate-400 font-normal block">
                          {new Date(c.orderCreatedAt).toLocaleDateString(
                            lang === 'ar' ? 'ar-EG' : 'en-EG'
                          )}
                        </span>
                      </td>
                      <td className="py-3 text-slate-650">
                        {lang === 'ar'
                          ? `${c.orderTotalEgp.toLocaleString('ar-EG')} ج.م`
                          : `${c.orderTotalEgp.toLocaleString('en-EG')} EGP`}
                      </td>
                      <td className="py-3 font-bold text-slate-800">{c.commissionPct}%</td>
                      <td className="py-3 text-right font-black text-emerald-700">
                        {lang === 'ar'
                          ? `${c.commissionEgp.toFixed(1)} ج.م`
                          : `${c.commissionEgp.toFixed(1)} EGP`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payout Request */}
        {affiliate.status === 'ACTIVE' && affiliate.pendingEarningsEgp > 0 && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              {t('AffiliateRequestPayoutLabel') || 'Request Earnings Withdrawal'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {lang === 'ar'
                ? `لديك مبلغ ${affiliate.pendingEarningsEgp.toLocaleString('ar-EG')} ج.م متاح للسحب. اختر وسيلتك المفضلة للسحب بالأسفل:`
                : `You have ${affiliate.pendingEarningsEgp.toLocaleString('en-EG')} EGP available to withdraw. Complete the form to request disbursement:`}
            </p>
            <form onSubmit={requestPayout} className="flex flex-col sm:flex-row gap-3">
              <select
                required
                value={payoutForm.method}
                onChange={e => setPayoutForm(f => ({ ...f, method: e.target.value }))}
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs bg-white focus:outline-none focus:border-slate-800"
              >
                <option value="">{t('AffiliateSelectMethod') || 'Select payout method'}</option>
                <option value="VODAFONE_CASH">{translatePayoutMethod('Vodafone Cash')}</option>
                <option value="ORANGE_MONEY">{translatePayoutMethod('Orange Money')}</option>
                <option value="ETISALAT_CASH">{translatePayoutMethod('Etisalat Cash')}</option>
                <option value="INSTAPAY">{translatePayoutMethod('InstaPay')}</option>
                <option value="BANK_TRANSFER">{translatePayoutMethod('Bank Transfer')}</option>
              </select>
              <input
                required
                placeholder={t('AffiliatePhoneOrIban') || 'Phone number or IBAN'}
                value={payoutForm.payoutDetails}
                onChange={e => setPayoutForm(f => ({ ...f, payoutDetails: e.target.value }))}
                className="flex-[2] border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-slate-800"
              />
              <button
                type="submit"
                disabled={payoutLoading}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {payoutLoading
                  ? t('AffiliateRequestingPayout') || 'Requesting…'
                  : t('AffiliateRequestPayoutBtn') || 'Withdraw'}
              </button>
            </form>
            {payoutMsg && (
              <p
                className={`text-xs mt-3 font-bold ${
                  payoutMsg.includes('EGP') ||
                  payoutMsg.includes('ج.م') ||
                  payoutMsg.includes('بنجاح') ||
                  payoutMsg.includes('success')
                    ? 'text-emerald-700'
                    : 'text-red-600'
                }`}
              >
                {payoutMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
