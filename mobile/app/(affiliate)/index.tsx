// Affiliate home — the only screen an AFFILIATE account sees.
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Share,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

const TIER_COLORS: Record<string, string> = {
  GOLD: '#f59e0b',
  SILVER: '#94a3b8',
  PLATINUM: '#7c3aed',
  STARTER: '#b45309',
};

type Dashboard = {
  affiliate: {
    referralLink: string;
    tier: string;
    tierName: string;
    commissionPct: number;
    discountPct: number;
    totalEarnedEgp: number;
    pendingEarningsEgp: number;
    confirmedEgp?: number;
    totalConversions: number;
  };
  nextTier: { name: string; minConversions: number; commissionPct: number | string } | null;
  recentCommissions: {
    id: string;
    orderTotalEgp: number;
    commissionPct: number;
    commissionEgp: number;
    status: string;
    usedByName?: string;
    usedByRole?: string;
  }[];
};

const egp = (n: number) => `${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })} EGP`;

// react-native-web's Alert ignores buttons, so use the browser dialogs there.
const notify = (msg: string) =>
  Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Brandyy', msg);

export default function Affiliate() {
  const signOut = useAuth(s => s.signOut);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['affiliate-dashboard'],
    queryFn: () => api.get<Dashboard>('/api/affiliate/dashboard'),
  });
  const payout = useMutation({
    mutationFn: () => api.post<{ amountEgp: number }>('/api/affiliate/payout', {}),
    onSuccess: r => {
      notify(`Payout of ${egp(r.amountEgp)} requested.`);
      qc.invalidateQueries({ queryKey: ['affiliate-dashboard'] });
    },
    onError: () =>
      notify('Could not request a payout. Check your payout method is set on brandyy.shop.'),
  });

  function confirmSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out?')) signOut();
      return;
    }
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Earn with Brandyy</Text>
      <Pressable onPress={confirmSignOut} accessibilityRole="button" hitSlop={8}>
        <Text style={styles.signOut}>Sign out</Text>
      </Pressable>
    </View>
  );

  if (!data)
    return (
      <View style={styles.root}>
        {header}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <Text style={styles.empty}>
            {error ? 'Could not load your affiliate account.' : 'No affiliate account found.'}
          </Text>
        )}
      </View>
    );

  const a = data.affiliate;
  const next = data.nextTier;
  const confirmed = a.confirmedEgp ?? 0;
  const link = a.referralLink.replace(/^https?:\/\//, '');
  const slash = link.lastIndexOf('/') + 1;
  const progress = next ? Math.min(100, (a.totalConversions / next.minConversions) * 100) : 100;

  const stats = [
    { label: 'Pending', value: egp(a.pendingEarningsEgp) },
    { label: 'Confirmed', value: egp(confirmed) },
    { label: 'Total earned', value: egp(a.totalEarnedEgp) },
    { label: 'Conversions', value: String(a.totalConversions) },
  ];

  const share = (message: string) => Share.share({ message });

  return (
    <View style={styles.root}>
      {header}

      <ScrollView contentContainerStyle={styles.inner}>
        {/* Tier card */}
        <View style={[styles.tierCard, { backgroundColor: TIER_COLORS[a.tier] ?? colors.accent }]}>
          <View style={styles.tierTop}>
            <View>
              <Text style={styles.tierLabel}>YOUR TIER</Text>
              <Text style={styles.tierName}>{a.tierName}</Text>
            </View>
            <Text style={styles.tierRate}>{a.commissionPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.tierHint}>
            {next
              ? `${a.totalConversions}/${next.minConversions} conversions to ${next.name} (${Number(next.commissionPct)}%)`
              : 'Top tier reached'}
          </Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {stats.map(({ label, value }) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Referral link */}
        <View style={styles.linkCard}>
          <Text style={styles.linkCardTitle}>Your referral link</Text>
          <View style={styles.linkRow}>
            <Text style={styles.linkText} numberOfLines={1}>
              {link.slice(0, slash)}
              <Text style={styles.linkCode}>{link.slice(slash)}</Text>
            </Text>
            <Pressable style={styles.copyBtn} onPress={() => share(a.referralLink)}>
              <Text style={styles.copyBtnText}>Copy</Text>
            </Pressable>
          </View>
          <Text style={styles.linkHint}>
            Friends get {a.discountPct}% off. You earn once their order is delivered.
          </Text>

          {/* Share buttons */}
          <View style={styles.shareRow}>
            {[
              { label: 'WhatsApp', bg: '#25d366' },
              { label: 'Instagram', bg: '#e1306c' },
              { label: 'TikTok', bg: '#111' },
            ].map(({ label, bg }) => (
              <Pressable
                key={label}
                style={[styles.shareBtn, { backgroundColor: bg }]}
                onPress={() => share(`Shop on Brandyy with my link: ${a.referralLink}`)}
              >
                <Text style={styles.shareBtnText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Who used the code */}
        <View style={styles.secHead}>
          <Text style={styles.secTitle}>Who used your code</Text>
          <Text style={styles.statLabel}>Last 10 orders</Text>
        </View>
        <View style={styles.usageCard}>
          {data.recentCommissions.length === 0 && (
            <Text style={[styles.statLabel, { paddingVertical: 16 }]}>
              No one has used your code yet.
            </Text>
          )}
          {data.recentCommissions.map((c, i) => {
            const seller = c.usedByRole === 'SELLER';
            const done = c.status === 'CONFIRMED' || c.status === 'PAID';
            return (
              <View key={c.id} style={[styles.usageRow, i > 0 && styles.usageDivider]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.usageNameRow}>
                    <Text style={styles.usageName}>{c.usedByName ?? 'Guest'}</Text>
                    <Text style={[styles.chip, seller ? styles.chipSeller : styles.chipBuyer]}>
                      {seller ? 'SELLER' : 'BUYER'}
                    </Text>
                  </View>
                  <Text style={styles.statLabel}>
                    Order {egp(c.orderTotalEgp)} · {c.commissionPct}%
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.usageAmount}>+{egp(c.commissionEgp)}</Text>
                  <Text style={[styles.usageStatus, { color: done ? '#15803d' : '#b45309' }]}>
                    {c.status[0] + c.status.slice(1).toLowerCase()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Payout */}
        <Pressable
          style={[styles.payoutBtn, (confirmed <= 0 || payout.isPending) && { opacity: 0.5 }]}
          disabled={confirmed <= 0 || payout.isPending}
          onPress={() => payout.mutate()}
        >
          <Text style={styles.payoutBtnText}>Request payout · {egp(confirmed)}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
  },
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink },
  signOut: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.muted },
  empty: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted, padding: spacing.page },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 40 },
  tierCard: {
    borderRadius: radii.cardLg,
    padding: 20,
    marginBottom: 16,
  },
  tierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tierLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,.8)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  tierName: { fontFamily: 'Outfit-ExtraBold', fontSize: 28, color: '#fff' },
  tierRate: { fontFamily: 'Outfit-ExtraBold', fontSize: 32, color: '#fff' },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,.3)',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  tierHint: { fontFamily: 'Inter-Regular', fontSize: 12, color: 'rgba(255,255,255,.8)' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink, marginBottom: 2 },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted },
  linkCard: {
    backgroundColor: colors.ink,
    borderRadius: radii.cardLg,
    padding: 20,
    marginBottom: 16,
  },
  linkCardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,.6)',
    marginBottom: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.sm,
    paddingLeft: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  linkText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: 'rgba(255,255,255,.8)' },
  linkCode: { fontFamily: 'Inter-Bold', color: colors.accent },
  copyBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  copyBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.ink },
  linkHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,.5)',
    marginBottom: 16,
    lineHeight: 17,
  },
  shareRow: { flexDirection: 'row', gap: 10 },
  shareBtn: {
    flex: 1,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff' },
  secHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  secTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, color: colors.ink },
  usageCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  usageDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  usageNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  usageName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  chip: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  chipBuyer: { backgroundColor: '#e0e7ff', color: colors.primary },
  chipSeller: { backgroundColor: '#fef3c7', color: colors.accentText },
  usageAmount: { fontFamily: 'Outfit-Bold', fontSize: 15, color: colors.ink },
  usageStatus: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
  payoutBtn: {
    height: 56,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  payoutBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.ink },
});
