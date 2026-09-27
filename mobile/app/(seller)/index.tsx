// Screen 4a — Seller Dashboard
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';
import { TrendingUp, Package, ShoppingBag, DollarSign } from 'lucide-react-native';

export default function SellerDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['seller-stats'],
    queryFn: () =>
      api.get<{
        totalRevenue: number;
        totalOrders: number;
        pendingOrders: number;
        totalProducts: number;
      }>('/api/seller/stats'),
  });

  const kpis = [
    { label: 'Revenue', value: fmtEGP(data?.totalRevenue ?? 0), Icon: DollarSign },
    { label: 'Orders', value: String(data?.totalOrders ?? 0), Icon: ShoppingBag },
    { label: 'Pending', value: String(data?.pendingOrders ?? 0), Icon: Package },
    { label: 'Products', value: String(data?.totalProducts ?? 0), Icon: TrendingUp },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Seller Hub</Text>
        <Text style={styles.sub}>Your store performance</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.inner}>
          {/* KPI grid */}
          <View style={styles.kpiGrid}>
            {kpis.map(({ label, value, Icon }) => (
              <View key={label} style={styles.kpiCard}>
                <Icon size={20} color={colors.primary} strokeWidth={1.8} />
                <Text style={styles.kpiValue}>{value}</Text>
                <Text style={styles.kpiLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Needs action</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No items need action right now</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  header: { paddingTop: 56, paddingHorizontal: spacing.page, paddingBottom: 20 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 26, color: colors.ink },
  sub: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 40 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  kpiCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    gap: 4,
  },
  kpiValue: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink },
  kpiLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted },
  sectionTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, color: colors.ink, marginBottom: 12 },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted },
});
