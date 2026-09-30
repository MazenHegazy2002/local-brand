// Platform fee breakdown under the price field (mirrors web PriceCommissionCalculator).
// Rate comes from the server: SellerProfile.commissionRate via GET /api/seller/settings.
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { colors, radii } from '@/lib/tokens';

export type FeeMode = 'add' | 'deduct';

export function useCommissionRate() {
  const { data } = useQuery({
    queryKey: ['seller-settings'],
    queryFn: () => api.get<{ commissionRate?: number }>('/api/seller/settings'),
    staleTime: 5 * 60_000,
  });
  return data?.commissionRate ?? 0.1;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Price the buyer sees: in 'add' mode the fee sits on top of the seller's price. */
export const customerPrice = (price: number, rate: number, mode: FeeMode) =>
  mode === 'add' ? round2(price * (1 + rate)) : price;

const egp = (n: number) => `${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })} EGP`;

export function FeeBreakdown({
  price,
  rate,
  mode,
  onMode,
}: {
  price: number;
  rate: number;
  mode: FeeMode;
  onMode: (m: FeeMode) => void;
}) {
  const fee = round2(price * rate);
  const pct = `${Math.round(rate * 100)}%`;
  const add = mode === 'add';

  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.title}>Platform fee breakdown</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>{pct} Fee</Text>
        </View>
      </View>

      <View style={s.toggle}>
        {(['deduct', 'add'] as const).map(m => (
          <Pressable
            key={m}
            style={[s.opt, mode === m && s.optOn]}
            onPress={() => onMode(m)}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === m }}
          >
            <Text style={[s.optText, mode === m && s.optTextOn]}>
              {m === 'add' ? 'Add percentage' : 'Take from me'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={s.boxes}>
        <View style={s.box}>
          <Text style={s.lbl}>{add ? 'Markup added' : 'Platform fee'}</Text>
          <Text style={s.val}>
            {add ? '+' : '−'}
            {egp(fee)}
          </Text>
        </View>
        <View style={[s.box, s.boxMain]}>
          <Text style={[s.lbl, { color: 'rgba(255,255,255,.7)' }]}>
            {add ? 'New customer price' : 'You receive'}
          </Text>
          <Text style={[s.val, { color: '#fff' }]}>
            {egp(add ? customerPrice(price, rate, mode) : round2(price - fee))}
          </Text>
        </View>
      </View>

      <Text style={s.help}>
        {add
          ? `Buyers see ${egp(customerPrice(price, rate, mode))}. You keep the full ${egp(price)}.`
          : `Buyers see ${egp(price)}. The ${pct} fee comes out of your payout.`}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  badge: { backgroundColor: '#fef3c7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: 12, color: colors.accentText },
  toggle: { flexDirection: 'row', backgroundColor: '#eceef2', borderRadius: 12, padding: 3 },
  opt: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optOn: { backgroundColor: '#fff' },
  optText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.muted },
  optTextOn: { fontFamily: 'Inter-SemiBold', color: colors.primary },
  boxes: { flexDirection: 'row', gap: 8 },
  box: { flex: 1, borderRadius: 12, padding: 12, backgroundColor: '#f5f6f8' },
  boxMain: { backgroundColor: colors.primary },
  lbl: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.subtle,
    textTransform: 'uppercase',
  },
  val: { fontFamily: 'Outfit-Bold', fontSize: 17, color: colors.ink, marginTop: 4 },
  help: { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 17, color: colors.muted },
});
