'use client';
// src/app/affiliate/dashboard/page.tsx
// User-facing affiliate dashboard

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

export default function AffiliateDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
      .catch(() => setError('Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, [status, router]);

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
      setPayoutMsg(`Payout of ${d.amountEgp} EGP requested successfully!`);
    } catch (err: unknown) {
      setPayoutMsg((err as Error).message);
    } finally {
      setPayoutLoading(false);
    }
  }

  if (loading)
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ color: '#64748b' }}>Loading your dashboard...</div>
      </div>
    );

  if (error === 'No affiliate account found.') {
    return (
      <div style={{ maxWidth: 520, margin: '80px auto', textAlign: 'center', padding: '0 16px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          {"You're not an affiliate yet"}
        </h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          Apply to the affiliate program to get your promo code and start earning.
        </p>
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
          {"Apply now — it's free"}
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

  const tierColors: Record<string, string> = {
    STARTER: '#64748b',
    SILVER: '#94a3b8',
    GOLD: '#d97706',
    PLATINUM: '#7c3aed',
  };

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>My affiliate dashboard</h1>
          <p
            style={{
              fontSize: 13,
              color: '#64748b',
              margin: '4px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {session?.user?.name} · Joined{' '}
            {new Date(affiliate.createdAt).toLocaleDateString('en-EG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            ·
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
              {affiliate.status}
            </span>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Tier</p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              margin: 0,
              color: tierColors[affiliate.tier] ?? '#1e3b8a',
            }}
          >
            {affiliate.tierName} · {affiliate.commissionPct}% commission
          </p>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: 'Total earned', value: `${affiliate.totalEarnedEgp.toLocaleString()} EGP` },
          { label: 'Pending', value: `${affiliate.pendingEarningsEgp.toLocaleString()} EGP` },
          { label: 'Total referrals', value: affiliate.totalConversions },
          { label: 'Conversions', value: affiliate.totalConversions },
        ].map(s => (
          <div
            key={s.label}
            style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px' }}
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
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>My promo code</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
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
            }}
          >
            {affiliate.promoCode}
          </div>
          <CopyButton text={affiliate.promoCode} />
        </div>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
          Buyers using this code get{' '}
          <strong style={{ color: '#085041' }}>{affiliate.discountPct}% off</strong> · You earn{' '}
          <strong style={{ color: '#1e3b8a' }}>{affiliate.commissionPct}%</strong> of each sale
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
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>My referral link</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
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
            }}
          >
            {affiliate.referralLink}
          </div>
          <CopyButton text={affiliate.referralLink} />
        </div>
        {settings.bonusesEnabled && (
          <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ fontSize: 12, color: '#1e3b8a', margin: 0, fontWeight: 600 }}>
              Referral bonus
            </p>
            <p style={{ fontSize: 12, color: '#1e3b8a', margin: '4px 0 0' }}>
              When someone signs up via your link:{' '}
              <strong>You get {settings.referrerBonusEgp} EGP</strong> ·{' '}
              <strong>They get {settings.joinerBonusEgp} EGP</strong> store credit on their first
              order
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
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>Recent commissions</p>
        {recentCommissions.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No commissions yet. Share your code!
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
              <span>Order</span>
              <span>Sale value</span>
              <span>Rate</span>
              <span style={{ textAlign: 'right' }}>Earned</span>
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
                <span style={{ color: '#1e293b' }}>
                  #{c.orderId.slice(-6)} · {new Date(c.orderCreatedAt).toLocaleDateString()}
                </span>
                <span>{c.orderTotalEgp.toLocaleString()} EGP</span>
                <span>{c.commissionPct}%</span>
                <span style={{ textAlign: 'right', color: '#085041', fontWeight: 600 }}>
                  {c.commissionEgp.toFixed(1)} EGP
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
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Progress to next tier</p>
        {nextTier ? (
          <>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
              {affiliate.tierName} → {nextTier.name}:{' '}
              {nextTier.minConversions - affiliate.totalConversions} more conversions needed ·
              unlocks {nextTier.commissionPct}% commission
            </p>
            <div style={{ background: '#F1F5F9', borderRadius: 4, height: 8, overflow: 'hidden' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {affiliate.totalConversions} / {nextTier.minConversions} conversions
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{progress}%</span>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#085041', fontWeight: 500 }}>
            🏆 {"You've reached the highest tier (Platinum)!"}
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
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>
            Request payout — {affiliate.pendingEarningsEgp.toLocaleString()} EGP available
          </p>
          <form onSubmit={requestPayout} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
              }}
            >
              <option value="">Select method</option>
              <option value="VODAFONE_CASH">Vodafone Cash</option>
              <option value="ORANGE_MONEY">Orange Money</option>
              <option value="ETISALAT_CASH">Etisalat Cash</option>
              <option value="INSTAPAY">InstaPay</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
            <input
              required
              placeholder="Phone number / IBAN"
              value={payoutForm.payoutDetails}
              onChange={e => setPayoutForm(f => ({ ...f, payoutDetails: e.target.value }))}
              style={{
                flex: 2,
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                minWidth: 200,
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
              {payoutLoading ? 'Requesting...' : 'Request payout'}
            </button>
          </form>
          {payoutMsg && (
            <p
              style={{
                fontSize: 12,
                marginTop: 8,
                color: payoutMsg.includes('EGP') ? '#085041' : '#B91C1C',
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
