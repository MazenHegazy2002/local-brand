// Seller Payouts
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

export default function Payouts() {
  const { data } = useQuery({
    queryKey: ['seller-earnings'],
    queryFn: () =>
      api.get<{ available: number; held: number; paid: number }>('/api/seller/earnings'),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Payouts</Text>
      </View>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Available to withdraw</Text>
          <Text style={styles.cardAmount}>{fmtEGP(data?.available ?? 0)}</Text>
        </View>
        <View style={styles.row}>
          <View style={[styles.miniCard, { flex: 1 }]}>
            <Text style={styles.miniLabel}>In escrow</Text>
            <Text style={styles.miniValue}>{fmtEGP(data?.held ?? 0)}</Text>
          </View>
          <View style={[styles.miniCard, { flex: 1 }]}>
            <Text style={styles.miniLabel}>Total paid</Text>
            <Text style={styles.miniValue}>{fmtEGP(data?.paid ?? 0)}</Text>
          </View>
        </View>
        <Pressable style={styles.requestBtn}>
          <Text style={styles.requestBtnText}>Request payout</Text>
        </Pressable>
        <Text style={styles.note}>Funds are released 14 days after delivery confirmation.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  header: { paddingTop: 56, paddingHorizontal: spacing.page, paddingBottom: 16 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 26, color: colors.ink },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 40 },
  card: {
    backgroundColor: colors.primary,
    borderRadius: radii.cardLg,
    padding: 24,
    marginBottom: 12,
  },
  cardLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,.7)',
    marginBottom: 6,
  },
  cardAmount: { fontFamily: 'Outfit-ExtraBold', fontSize: 36, color: '#fff' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  miniCard: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 16 },
  miniLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted, marginBottom: 4 },
  miniValue: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink },
  requestBtn: {
    height: 54,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  requestBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
  note: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted, textAlign: 'center' },
});
