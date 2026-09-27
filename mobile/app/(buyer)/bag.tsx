// Screen 3a — Bag + 3b Checkout entry
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { useCart } from '@/store/cart';
import { colors, radii, spacing } from '@/lib/tokens';
import { fmtEGP } from '@/lib/api';

const FREE_SHIPPING_THRESHOLD = 1000;

export default function Bag() {
  const router = useRouter();
  const { items, setQty, remove, total, count } = useCart();
  const subtotal = total();
  const shippingProgress = Math.min(subtotal / FREE_SHIPPING_THRESHOLD, 1);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;

  if (count() === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🛍️</Text>
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
        <Text style={styles.title}>My Bag</Text>
        <Text style={styles.count}>
          {count()} item{count() !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.inner}>
        {/* Free shipping progress */}
        <View style={styles.progressCard}>
          <Text style={styles.progressText}>
            {subtotal >= FREE_SHIPPING_THRESHOLD
              ? '🎉 You have free shipping!'
              : `Add ${fmtEGP(remaining)} more for free shipping`}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${shippingProgress * 100}%` as any }]} />
          </View>
        </View>

        {/* Line items */}
        {items.map(item => (
          <View key={item.productId} style={styles.item}>
            <Image source={{ uri: item.image }} style={styles.itemImg} contentFit="cover" />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.title}
              </Text>
              {item.size && <Text style={styles.itemMeta}>Size: {item.size}</Text>}
              {item.color && <Text style={styles.itemMeta}>Color: {item.color}</Text>}
              <Text style={styles.itemPrice}>{fmtEGP(item.priceEGP)}</Text>
            </View>
            <View style={styles.itemActions}>
              <Pressable style={styles.trash} onPress={() => remove(item.productId)}>
                <Trash2 size={16} color={colors.danger} strokeWidth={2} />
              </Pressable>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => setQty(item.productId, item.qty - 1)}
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
          </View>
        ))}
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>Subtotal</Text>
          <Text style={styles.footerTotal}>{fmtEGP(subtotal)}</Text>
        </View>
        <Pressable style={styles.checkoutBtn} onPress={() => router.push('/(buyer)/checkout')}>
          <Text style={styles.checkoutText}>Proceed to checkout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  title: { fontFamily: 'Outfit-Bold', fontSize: 26, color: colors.ink },
  count: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 120 },
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
  item: { flexDirection: 'row', gap: 12, marginBottom: 20, alignItems: 'flex-start' },
  itemImg: { width: 86, height: 106, borderRadius: radii.sm },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.ink, lineHeight: 18 },
  itemMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  itemPrice: { fontFamily: 'Outfit-Bold', fontSize: 16, color: colors.primary, marginTop: 6 },
  itemActions: { alignItems: 'flex-end', gap: 12 },
  trash: { padding: 6 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
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
    minWidth: 24,
    textAlign: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.page,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
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
    paddingBottom: 32,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  footerLabel: { fontFamily: 'Inter-Regular', fontSize: 15, color: colors.muted },
  footerTotal: { fontFamily: 'Outfit-Bold', fontSize: 18, color: colors.ink },
  checkoutBtn: {
    height: 54,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
});
