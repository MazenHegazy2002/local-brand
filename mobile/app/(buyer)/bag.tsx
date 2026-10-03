// Screen 3a — Bag
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { useCart } from '@/store/cart';
import { colors, radii, spacing } from '@/lib/tokens';
import { fmtEGP } from '@/lib/api';

const FREE_THRESHOLD = 1000;

export default function Bag() {
  const router = useRouter();
  const { items, setQty, remove, total, count } = useCart();
  const [promo, setPromo] = useState('');
  const subtotal = total();
  const remaining = FREE_THRESHOLD - subtotal;
  const progress = Math.min(subtotal / FREE_THRESHOLD, 1);

  if (count() === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Your bag is empty</Text>
        <Text style={styles.emptySub}>Add items from the shop to get started</Text>
        <Pressable style={styles.shopBtn} onPress={() => router.push('/(buyer)/shop')}>
          <Text style={styles.shopBtnText}>Browse shop</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Bag</Text>
        <Text style={styles.count}>
          {count()} item{count() !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.inner}>
        {/* Free shipping progress */}
        {remaining > 0 && (
          <View style={styles.progressCard}>
            <Text style={styles.progressText}>{fmtEGP(remaining)} away from free shipping</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
          </View>
        )}

        {/* Line items */}
        {items.map(item => (
          <View key={item.productId} style={styles.item}>
            <Image source={{ uri: item.image }} style={styles.itemImg} contentFit="cover" />
            <View style={styles.itemInfo}>
              <Text style={styles.itemBrand} numberOfLines={1}>
                BRANDYY STORE
              </Text>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.title}
              </Text>
              {item.size && <Text style={styles.itemMeta}>{item.size}</Text>}
              <Text style={styles.itemPrice}>{fmtEGP(item.basePrice)}</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepBtn}
                onPress={() =>
                  item.qty <= 1 ? remove(item.productId) : setQty(item.productId, item.qty - 1)
                }
              >
                <Minus size={14} color={colors.ink} strokeWidth={2} />
              </Pressable>
              <Text style={styles.stepQty}>{item.qty}</Text>
              <Pressable
                style={styles.stepBtn}
                onPress={() => setQty(item.productId, item.qty + 1)}
              >
                <Plus size={14} color={colors.ink} strokeWidth={2} />
              </Pressable>
            </View>
          </View>
        ))}

        {/* Promo code */}
        <View style={styles.promoRow}>
          <TextInput
            style={styles.promoInput}
            placeholder="Promo or referral code"
            placeholderTextColor={colors.placeholder}
            value={promo}
            onChangeText={setPromo}
            autoCapitalize="characters"
          />
          <Pressable style={styles.promoBtn}>
            <Text style={styles.promoBtnText}>Apply</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>Subtotal</Text>
          <Text style={styles.footerTotal}>{fmtEGP(subtotal)}</Text>
        </View>
        <Pressable style={styles.checkoutBtn} onPress={() => router.push('/(buyer)/checkout')}>
          <Text style={styles.checkoutText}>Checkout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  title: { fontFamily: 'InstrumentSerif-Regular', fontSize: 34, color: colors.ink },
  count: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 140 },
  progressCard: {
    backgroundColor: colors.accentBg,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 20,
  },
  progressText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.accentText,
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentLight,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: colors.accent, borderRadius: 3 },
  item: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  itemImg: { width: 72, height: 90, borderRadius: radii.sm },
  itemInfo: { flex: 1 },
  itemBrand: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  itemName: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.ink,
    lineHeight: 17,
    marginBottom: 2,
  },
  itemMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted, marginBottom: 4 },
  itemPrice: { fontFamily: 'Outfit-Bold', fontSize: 15, color: colors.ink },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    height: 34,
  },
  stepBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepQty: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.ink,
    minWidth: 22,
    textAlign: 'center',
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    marginTop: 20,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  promoInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.ink,
  },
  promoBtn: { paddingHorizontal: 16 },
  promoBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.primary },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.page,
  },
  emptyTitle: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink, marginBottom: 8 },
  emptySub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 28,
  },
  shopBtn: {
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.page,
    paddingBottom: 36,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  footerLabel: { fontFamily: 'Inter-Regular', fontSize: 15, color: colors.muted },
  footerTotal: { fontFamily: 'Outfit-Bold', fontSize: 18, color: colors.ink },
  checkoutBtn: {
    height: 56,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
});
