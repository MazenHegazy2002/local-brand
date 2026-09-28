// Screen 4a — Seller Hub dashboard
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronDown, ChevronRight } from 'lucide-react-native';
import { api, fmtEGP } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { colors, radii, spacing } from '@/lib/tokens';

type Period = 'today' | '7days' | '30days';

export default function SellerDashboard() {
  const [period, setPeriod] = useState<Period>('7days');
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['seller-stats', period],
    queryFn: () =>
      api.get<{
        totalRevenue: number;
        totalOrders: number;
        pendingOrders: number;
        totalProducts: number;
      }>('/api/seller/stats'),
  });

  const storeName = user?.name ?? 'My Store';
  const storeInitial = storeName.charAt(0).toUpperCase();

  const stats = [
    { label: 'Orders', value: String(data?.totalOrders ?? 0) },
    { label: 'Store visits', value: '1.2k' },
    { label: 'To ship', value: String(data?.pendingOrders ?? 0) },
    { label: 'Rating', value: '4.8★' },
  ];

  const actions = [
    {
      label: 'Orders waiting to ship',
      count: data?.pendingOrders ?? 0,
      color: '#fef3c7',
      countColor: '#b45309',
    },
    { label: 'Variants low on stock', count: 2, color: '#fee2e2', countColor: '#dc2626' },
  ];

  // Bar chart mock (7 bars for S S M T W T F)
  const DAYS = ['S', 'S', 'M', 'T', 'W', 'T', 'F'];
  const barHeights = [30, 40, 55, 60, 70, 65, 100]; // relative %

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.storeAvatar}>
            <Text style={styles.storeAvatarText}>{storeInitial}</Text>
          </View>
          <View>
            <Text style={styles.headerLabel}>Seller Hub</Text>
            <Pressable style={styles.storeNameRow}>
              <Text style={styles.storeName}>{storeName}</Text>
              <ChevronDown size={14} color={colors.ink} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
        <Pressable style={styles.bellWrap}>
          <Bell size={22} color={colors.ink} strokeWidth={1.8} />
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>5</Text>
          </View>
        </Pressable>
      </View>

      {/* Period tabs */}
      <View style={styles.periods}>
        {(['today', '7days', '30days'] as Period[]).map(p => (
          <Pressable
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === 'today' ? 'Today' : p === '7days' ? '7 days' : '30 days'}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.inner}>
          {/* Net sales card */}
          <View style={styles.salesCard}>
            <View style={styles.salesTop}>
              <View>
                <Text style={styles.salesLabel}>Net sales</Text>
                <Text style={styles.salesValue}>{fmtEGP(data?.totalRevenue ?? 48350)}</Text>
              </View>
              <View style={styles.trendBadge}>
                <Text style={styles.trendText}>+18%</Text>
              </View>
            </View>
            {/* Bar chart */}
            <View style={styles.barChart}>
              {DAYS.map((day, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${barHeights[i]}%` as any,
                          backgroundColor: i === 6 ? colors.accent : 'rgba(255,255,255,0.3)',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barDay}>{day}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Stats 2x2 */}
          <View style={styles.statsGrid}>
            {stats.map(({ label, value }) => (
              <View key={label} style={styles.statCard}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Needs action */}
          <Text style={styles.sectionTitle}>Needs action</Text>
          {actions.map(({ label, count, color, countColor }) =>
            count > 0 ? (
              <Pressable key={label} style={styles.actionItem}>
                <View style={[styles.actionBadge, { backgroundColor: color }]}>
                  <Text style={[styles.actionCount, { color: countColor }]}>{count}</Text>
                </View>
                <Text style={styles.actionLabel}>{label}</Text>
                <ChevronRight size={16} color={colors.placeholder} strokeWidth={2} />
              </Pressable>
            ) : null
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeAvatarText: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  headerLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.muted },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeName: { fontFamily: 'Outfit-Bold', fontSize: 15, color: colors.ink },
  bellWrap: { position: 'relative', padding: 4 },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: colors.ink },
  periods: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.page,
    gap: 0,
  },
  periodBtn: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  periodBtnActive: { borderBottomColor: colors.ink },
  periodText: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.muted },
  periodTextActive: { fontFamily: 'Inter-SemiBold', color: colors.ink },
  inner: { padding: spacing.page, paddingBottom: 40 },
  salesCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.cardLg,
    padding: 20,
    marginBottom: 16,
  },
  salesTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  salesLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,.65)',
    marginBottom: 4,
  },
  salesValue: { fontFamily: 'Outfit-Bold', fontSize: 30, color: '#fff' },
  trendBadge: {
    backgroundColor: 'rgba(74,222,128,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#4ade80' },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 60 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  barDay: { fontFamily: 'Inter-Regular', fontSize: 10, color: 'rgba(255,255,255,.5)' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink, marginBottom: 2 },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted },
  sectionTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, color: colors.ink, marginBottom: 12 },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCount: { fontFamily: 'Outfit-Bold', fontSize: 16 },
  actionLabel: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 14, color: colors.ink },
});
