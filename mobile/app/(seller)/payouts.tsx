// Seller Payouts
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

const egp = (n: number) => Math.round(n).toLocaleString('en-EG');

export default function Payouts() {
  const { data, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['seller-earnings'],
    queryFn: () =>
      api.get<{ available: number; held: number; paid: number }>('/api/seller/earnings'),
  });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <Text style={styles.title}>Payouts</Text>
      {isError ? (
        <View style={styles.row}>
          <Text style={styles.error}>{(error as Error).message}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={styles.link}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.balance, !data && { opacity: 0.4 }]}>
            <Text style={styles.balanceLabel}>Available to withdraw</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amount}>{data ? egp(data.available) : ' '}</Text>
              <Text style={styles.unit}>EGP</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>In escrow</Text>
            <Text style={styles.rowValue}>{data ? `${egp(data.held)} EGP` : '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total paid out</Text>
            <Text style={styles.rowValue}>{data ? `${egp(data.paid)} EGP` : '—'}</Text>
          </View>
        </>
      )}
      <Text style={styles.note}>Funds are released 14 days after delivery confirmation.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  inner: { paddingTop: spacing.top, paddingHorizontal: spacing.page, paddingBottom: 40 },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 36,
    color: colors.ink,
    marginBottom: 14,
  },
  balance: {
    backgroundColor: colors.primary,
    borderRadius: radii.cardLg,
    padding: 20,
    marginBottom: 12,
  },
  balanceLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: 'rgba(255,255,255,.72)' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  amount: { fontFamily: 'Outfit-ExtraBold', fontSize: 36, color: '#fff' },
  unit: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: 'rgba(255,255,255,.72)' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 8,
  },
  rowLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.muted },
  rowValue: { fontFamily: 'Outfit-Bold', fontSize: 16, color: colors.ink },
  error: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 13, color: colors.danger },
  link: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.primary },
  note: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 12,
  },
});
