// Screen 5a — Affiliate / Earn with Brandyy
import { View, Text, StyleSheet, Pressable, ScrollView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Copy } from 'lucide-react-native';
import { useAuth } from '@/store/auth';
import { colors, radii, spacing } from '@/lib/tokens';

const TIER_COLORS: Record<string, string> = {
  Gold: '#f59e0b',
  Silver: '#94a3b8',
  Platinum: '#7c3aed',
  Bronze: '#b45309',
};

export default function Affiliate() {
  const router = useRouter();
  const { user } = useAuth();

  const tier = 'Gold';
  const rate = '8%';
  const conversions = 96;
  const nextTierAt = 200;
  const referralCode = `OMAR15`;
  const referralLink = `brandyy.shop/ref/${referralCode}`;

  const stats = [
    { label: 'Pending', value: '1,284 EGP' },
    { label: 'Confirmed', value: '3,960 EGP' },
    { label: 'Link clicks', value: '2,418' },
    { label: 'Conversions', value: String(conversions) },
  ];

  function copyLink() {
    Share.share({ message: `https://${referralLink}` });
  }

  async function shareVia(platform: string) {
    Share.share({ message: `Shop on Brandyy with my link: https://${referralLink}` });
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Earn with Brandyy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.inner}>
        {/* Tier card */}
        <View style={[styles.tierCard, { backgroundColor: TIER_COLORS[tier] ?? colors.accent }]}>
          <View style={styles.tierTop}>
            <View>
              <Text style={styles.tierLabel}>YOUR TIER</Text>
              <Text style={styles.tierName}>{tier}</Text>
            </View>
            <Text style={styles.tierRate}>{rate}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(conversions / nextTierAt) * 100}%` as any },
              ]}
            />
          </View>
          <Text style={styles.tierHint}>
            {conversions}/{nextTierAt} conversions to Platinum (12%)
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
              brandyy.shop/ref/
              <Text style={styles.linkCode}>{referralCode}</Text>
            </Text>
            <Pressable style={styles.copyBtn} onPress={copyLink}>
              <Text style={styles.copyBtnText}>Copy</Text>
            </Pressable>
          </View>
          <Text style={styles.linkHint}>
            Friends get 15% off. You earn once their order is delivered.
          </Text>

          {/* Share buttons */}
          <View style={styles.shareRow}>
            {[
              { label: 'WhatsApp', bg: '#25d366', color: '#fff' },
              { label: 'Instagram', bg: '#e1306c', color: '#fff' },
              { label: 'TikTok', bg: '#111', color: '#fff' },
            ].map(({ label, bg, color }) => (
              <Pressable
                key={label}
                style={[styles.shareBtn, { backgroundColor: bg }]}
                onPress={() => shareVia(label)}
              >
                <Text style={[styles.shareBtnText, { color }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Payout */}
        <Pressable style={styles.payoutBtn}>
          <Text style={styles.payoutBtnText}>Request payout · 3,960 EGP</Text>
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
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink },
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
  shareBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13 },
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
