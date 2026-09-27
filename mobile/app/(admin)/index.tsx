// Screen 6a — Admin overview
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

export default function AdminOverview() {
  const { data } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () =>
      api.get<{ revenue: number; orders: number; users: number; sellers: number }>(
        '/api/admin/stats'
      ),
  });

  const kpis = [
    { label: 'Revenue', value: fmtEGP(data?.revenue ?? 0) },
    { label: 'Orders', value: String(data?.orders ?? 0) },
    { label: 'Users', value: String(data?.users ?? 0) },
    { label: 'Sellers', value: String(data?.sellers ?? 0) },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.title}>Admin OS</Text>
      </View>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.grid}>
          {kpis.map(({ label, value }) => (
            <View key={label} style={styles.kpi}>
              <Text style={styles.kpiValue}>{value}</Text>
              <Text style={styles.kpiLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgAdmin },
  header: { paddingTop: 56, paddingHorizontal: spacing.page, paddingBottom: 20 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    marginBottom: 12,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  liveText: { fontFamily: 'Inter-Bold', fontSize: 11, color: colors.accent, letterSpacing: 1 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 28, color: '#fff' },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,.06)',
    borderRadius: radii.card,
    padding: 18,
  },
  kpiValue: { fontFamily: 'Outfit-Bold', fontSize: 24, color: '#fff', marginBottom: 4 },
  kpiLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: 'rgba(255,255,255,.5)' },
});
