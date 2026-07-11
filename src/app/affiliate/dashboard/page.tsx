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
          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
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
  const [mounted, setMounted] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ method: '', payoutDetails: '' });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-zinc-500 text-sm animate-pulse font-bold tracking-widest uppercase">
          {t('AffiliateLoadingDashboard') || 'Loading Dashboard…'}
        </div>
      </div>
    );
  }

  if (error === 'No affiliate account found.') {
    return (
      <div
        className={`min-h-screen bg-zinc-950 flex items-center justify-center px-4 font-sans ${isRTL ? 'rtl' : 'ltr'}`}
        style={{ direction: isRTL ? 'rtl' : 'ltr' }}
      >
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-6">🚀</div>
          <h1 className="text-3xl font-black text-white mb-3 uppercase tracking-tight">
            {t('AffiliateNotAffiliateYet') || 'Not an Affiliate Yet'}
          </h1>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            {t('AffiliateNotAffiliateDesc') ||
              'Join our growth network to start earning premium commissions.'}
          </p>
          <Link
            href="/sell"
            className="inline-block px-8 py-4 bg-white text-zinc-950 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors shadow-lg"
          >
            {t('AffiliateApplyFree') || "Apply Now — It's Free"}
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 font-bold mb-4">⚠️ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-white underline font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { affiliate, nextTier, progress, settings, recentCommissions, bonuses } = data;

  const statusBadge: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    PENDING: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    PAUSED: { bg: 'bg-zinc-700', text: 'text-zinc-300' },
    BANNED: { bg: 'bg-red-500/20', text: 'text-red-400' },
    REJECTED: { bg: 'bg-red-500/20', text: 'text-red-400' },
  };
  const sBadge = statusBadge[affiliate.status] ?? statusBadge.PENDING;

  const statusLabels: Record<string, string> = {
    ACTIVE: t('AffiliateStatusActive') || 'ACTIVE',
    PENDING: t('AffiliateStatusPending') || 'PENDING',
    PAUSED: t('AffiliateStatusPaused') || 'PAUSED',
    BANNED: t('AffiliateStatusBanned') || 'BANNED',
    REJECTED: t('AffiliateStatusRejected') || 'REJECTED',
  };

  const tierAccent: Record<string, string> = {
    STARTER: 'text-zinc-400',
    SILVER: 'text-slate-300',
    GOLD: 'text-amber-400',
    PLATINUM: 'text-violet-400',
  };

  return (
    <div
      className={`min-h-screen bg-zinc-950 font-sans pb-24 ${isRTL ? 'rtl' : 'ltr'}`}
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* ── Topbar ── */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <span className="text-base font-black tracking-widest uppercase text-white">
            Brandy<span className="text-indigo-400">.Affiliate</span>
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              {lang === 'ar' ? 'حسابي' : 'My Account'}
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {lang === 'ar' ? 'المتجر' : 'Shop'}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
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

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        {/* ── Hero identity card ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                {t('AffiliateMyDashboard') || 'Affiliate Dashboard'}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${sBadge.bg} ${sBadge.text}`}
              >
                {statusLabels[affiliate.status] ?? affiliate.status}
              </span>
            </div>
            <p className="text-zinc-500 text-xs font-medium">
              {session?.user?.name}
              {' · '}
              {t('AffiliateJoined') || 'Joined'}{' '}
              {new Date(affiliate.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="sm:text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1">
              {t('AffiliateTierLabel') || 'Tier'}
            </p>
            <p
              className={`text-xl font-black uppercase ${tierAccent[affiliate.tier] ?? 'text-indigo-400'}`}
            >
              {translateTier(affiliate.tierName)}
            </p>
            <p className="text-[11px] text-zinc-500 font-bold mt-0.5">
              {lang === 'ar'
                ? `عمولة ${affiliate.commissionPct}%`
                : `${affiliate.commissionPct}% commission`}
            </p>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: t('AffiliateTotalEarned') || 'Total Earned',
              value:
                lang === 'ar'
                  ? `${affiliate.totalEarnedEgp.toLocaleString('ar-EG')} ج.م`
                  : `${affiliate.totalEarnedEgp.toLocaleString()} EGP`,
              accent: 'text-emerald-400',
              icon: '💰',
            },
            {
              label: t('AffiliatePending') || 'Pending Balance',
              value:
                lang === 'ar'
                  ? `${affiliate.pendingEarningsEgp.toLocaleString('ar-EG')} ج.م`
                  : `${affiliate.pendingEarningsEgp.toLocaleString()} EGP`,
              accent: 'text-amber-400',
              icon: '⏳',
            },
            {
              label: t('AffiliateTotalReferrals') || 'Referrals',
              value:
                lang === 'ar'
                  ? affiliate.totalConversions.toLocaleString('ar-EG')
                  : affiliate.totalConversions.toString(),
              accent: 'text-sky-400',
              icon: '👥',
            },
            {
              label: t('AffiliateConversions') || 'Conversions',
              value:
                lang === 'ar'
                  ? affiliate.totalConversions.toLocaleString('ar-EG')
                  : affiliate.totalConversions.toString(),
              accent: 'text-violet-400',
              icon: '📈',
            },
          ].map((s, idx) => (
            <div
              key={idx}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 relative overflow-hidden"
            >
              <div className="absolute right-3 top-3 text-base opacity-30">{s.icon}</div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">
                {s.label}
              </p>
              <p className={`text-lg font-black ${s.accent}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Promo Code & Referral Link ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Promo code */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
              {t('AffiliateMyPromoCode') || 'My Promo Code'}
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-black border border-zinc-700 rounded-xl py-3 px-4 font-mono text-xl font-black text-center tracking-[0.2em] text-white uppercase select-all">
                {affiliate.promoCode}
              </div>
              <CopyButton text={affiliate.promoCode} />
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              {(
                t('AffiliatePromoCodeDesc') ||
                'Share this code to offer your audience {discountPct}% off their orders, while you earn a {commissionPct}% commission!'
              )
                .replace('{discountPct}', affiliate.discountPct.toString())
                .replace('{commissionPct}', affiliate.commissionPct.toString())}
            </p>
          </div>

          {/* Referral link */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
              {t('AffiliateMyReferralLink') || 'My Referral Link'}
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-black border border-zinc-700 rounded-xl py-3 px-3 text-[11px] text-zinc-400 select-all truncate font-mono">
                {affiliate.referralLink}
              </div>
              <CopyButton text={affiliate.referralLink} />
            </div>
            {settings.bonusesEnabled && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-1">
                  {t('AffiliateReferralBonus') || 'Referral Bonus'}
                </p>
                <p className="text-[11px] text-indigo-300/80 leading-relaxed">
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

        {/* ── Signup Bonuses ── */}
        {settings.bonusesEnabled && bonuses.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
              {lang === 'ar' ? 'مكافآتي' : 'My Bonuses'}
            </h3>
            <div className="flex flex-col gap-3">
              {bonuses.map(b => {
                const isActive = b.status === 'ACTIVE';
                const label =
                  b.type === 'JOINER_SIGNUP'
                    ? lang === 'ar'
                      ? 'مكافأة الانضمام'
                      : 'Welcome Bonus'
                    : lang === 'ar'
                      ? 'مكافأة الإحالة'
                      : 'Referral Reward';
                const statusLabel = isActive
                  ? lang === 'ar'
                    ? 'نشط'
                    : 'Active'
                  : lang === 'ar'
                    ? 'معلق'
                    : 'Pending';
                return (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 ${isActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-zinc-800/60 border border-zinc-700'}`}
                  >
                    <div>
                      <p
                        className={`text-xs font-black ${isActive ? 'text-emerald-300' : 'text-zinc-400'}`}
                      >
                        {label}
                      </p>
                      {b.expiresAt && (
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {lang === 'ar'
                            ? `تنتهي: ${new Date(b.expiresAt).toLocaleDateString('ar-EG')}`
                            : `Expires: ${new Date(b.expiresAt).toLocaleDateString('en-EG')}`}
                        </p>
                      )}
                      {!isActive && b.type === 'REFERRER_SIGNUP' && (
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {lang === 'ar'
                            ? 'يُفعَّل عند إتمام إحالتك أول طلب'
                            : 'Activates when your referral completes their first order'}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-black ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`}
                      >
                        {lang === 'ar'
                          ? `${b.amountEgp.toLocaleString('ar-EG')} ج.م`
                          : `${b.amountEgp.toLocaleString()} EGP`}
                      </p>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-500'}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tier progression ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
            {t('AffiliateProgressNextTier') || 'Tier Progression'}
          </h3>
          {nextTier ? (
            <>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
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
              <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2.5 text-[10px] text-zinc-600 font-bold">
                <span>
                  {lang === 'ar'
                    ? `${affiliate.totalConversions.toLocaleString('ar-EG')} / ${nextTier.minConversions.toLocaleString('ar-EG')} تحويل`
                    : `${affiliate.totalConversions} / ${nextTier.minConversions} conversions`}
                </span>
                <span className="text-zinc-400">{progress}%</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-emerald-400 font-bold">
              🎉{' '}
              {t('AffiliateHighestTierReached') ||
                'Congratulations! You have reached the highest affiliate tier.'}
            </p>
          )}
        </div>

        {/* ── Recent Commissions ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
            {t('AffiliateRecentCommissions') || 'Recent Commissions'}
          </h3>
          {recentCommissions.length === 0 ? (
            <p className="text-xs text-zinc-600 italic text-center py-8">
              {t('AffiliateNoCommissions') || 'No conversions registered yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-600 uppercase tracking-widest font-black text-[9px]">
                    <th className="pb-3">{t('AffiliateOrderHeader') || 'Order'}</th>
                    <th className="pb-3">{t('AffiliateSaleValueHeader') || 'Sale'}</th>
                    <th className="pb-3">{t('AffiliateRateHeader') || 'Rate'}</th>
                    <th className="pb-3 text-right">{t('AffiliateEarnedHeader') || 'Earned'}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCommissions.slice(0, 6).map(c => (
                    <tr
                      key={c.id}
                      className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-3 font-bold text-white">
                        #{c.orderId.slice(-6).toUpperCase()}
                        <span className="text-[10px] text-zinc-600 font-normal block">
                          {new Date(c.orderCreatedAt).toLocaleDateString(
                            lang === 'ar' ? 'ar-EG' : 'en-EG'
                          )}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-400">
                        {lang === 'ar'
                          ? `${c.orderTotalEgp.toLocaleString('ar-EG')} ج.م`
                          : `${c.orderTotalEgp.toLocaleString()} EGP`}
                      </td>
                      <td className="py-3 font-bold text-zinc-300">{c.commissionPct}%</td>
                      <td className="py-3 text-right font-black text-emerald-400">
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

        {/* ── Payout Request ── */}
        {affiliate.status === 'ACTIVE' && affiliate.pendingEarningsEgp > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
              {t('AffiliateRequestPayoutLabel') || 'Request Withdrawal'}
            </h3>
            <p className="text-xs text-zinc-500 mb-5">
              {lang === 'ar'
                ? `لديك مبلغ ${affiliate.pendingEarningsEgp.toLocaleString('ar-EG')} ج.م متاح للسحب.`
                : `You have ${affiliate.pendingEarningsEgp.toLocaleString()} EGP available to withdraw.`}
            </p>
            <form onSubmit={requestPayout} className="flex flex-col sm:flex-row gap-3">
              <select
                required
                value={payoutForm.method}
                onChange={e => setPayoutForm(f => ({ ...f, method: e.target.value }))}
                className="flex-1 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs bg-zinc-800 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">{t('AffiliateSelectMethod') || 'Select method'}</option>
                <option value="VODAFONE_CASH">{translatePayoutMethod('Vodafone Cash')}</option>
                <option value="ORANGE_MONEY">{translatePayoutMethod('Orange Money')}</option>
                <option value="ETISALAT_CASH">{translatePayoutMethod('Etisalat Cash')}</option>
                <option value="INSTAPAY">{translatePayoutMethod('InstaPay')}</option>
                <option value="BANK_TRANSFER">{translatePayoutMethod('Bank Transfer')}</option>
              </select>
              <input
                required
                placeholder={t('AffiliatePhoneOrIban') || 'Phone or IBAN'}
                value={payoutForm.payoutDetails}
                onChange={e => setPayoutForm(f => ({ ...f, payoutDetails: e.target.value }))}
                className="flex-[2] border border-zinc-700 rounded-xl px-4 py-2.5 text-xs bg-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={payoutLoading}
                className="px-6 py-2.5 bg-white text-zinc-950 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors disabled:opacity-40"
              >
                {payoutLoading
                  ? t('AffiliateRequestingPayout') || 'Requesting…'
                  : t('AffiliateRequestPayoutBtn') || 'Withdraw'}
              </button>
            </form>
            {payoutMsg && (
              <p
                className={`text-xs mt-3 font-bold ${payoutMsg.includes('EGP') || payoutMsg.includes('ج.م') || payoutMsg.includes('بنجاح') || payoutMsg.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}
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
