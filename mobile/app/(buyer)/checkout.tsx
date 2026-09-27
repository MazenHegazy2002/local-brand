// Screen 3b — Checkout
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, MapPin, Truck, CreditCard, Banknote, Building2 } from 'lucide-react-native';
import { useCart } from '@/store/cart';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

type PayMethod = 'paysky' | 'cod' | 'fawry';

export default function Checkout() {
  const router = useRouter();
  const { items, total, clear } = useCart();
  const [payMethod, setPayMethod] = useState<PayMethod>('paysky');
  const [usePoints, setUsePoints] = useState(false);
  const [loading, setLoading] = useState(false);
  const subtotal = total();
  const shipping = subtotal >= 1000 ? 0 : 45;
  const orderTotal = subtotal + shipping;

  const payOptions: { id: PayMethod; label: string; sub: string; Icon: typeof CreditCard }[] = [
    { id: 'paysky', label: 'Card / Meeza', sub: 'Visa, MasterCard, Meeza', Icon: CreditCard },
    { id: 'cod', label: 'Cash on delivery', sub: 'Pay when you receive', Icon: Banknote },
    { id: 'fawry', label: 'Fawry', sub: 'Pay at any Fawry outlet', Icon: Building2 },
  ];

  async function handlePlaceOrder() {
    setLoading(true);
    try {
      const res = await api.post<{ orderId: string; paySkyUrl?: string; fawryRef?: string }>(
        '/api/checkout',
        {
          paymentMethod: payMethod,
          usePoints,
          items: items.map(i => ({
            productId: i.productId,
            qty: i.qty,
            size: i.size,
            color: i.color,
          })),
        }
      );

      if (payMethod === 'paysky' && res.paySkyUrl) {
        await WebBrowser.openBrowserAsync(res.paySkyUrl);
      } else {
        clear();
        Alert.alert('Order placed!', `Order #${res.orderId}`);
        router.push('/(buyer)');
      }
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.inner}>
        {/* Ship to */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Ship to</Text>
          </View>
          <Text style={styles.cardSub}>Add a delivery address</Text>
        </View>

        {/* Shipping options */}
        <Text style={styles.sectionLabel}>Shipping</Text>
        <View style={styles.card}>
          <View style={styles.shippingRow}>
            <Truck size={18} color={colors.primary} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.shippingName}>Standard delivery</Text>
              <Text style={styles.shippingSub}>3–5 business days</Text>
            </View>
            <Text style={styles.shippingPrice}>{subtotal >= 1000 ? 'Free' : fmtEGP(45)}</Text>
          </View>
        </View>

        {/* Payment */}
        <Text style={styles.sectionLabel}>Payment</Text>
        {payOptions.map(({ id, label, sub, Icon }) => (
          <Pressable
            key={id}
            style={[styles.payOption, payMethod === id && styles.payOptionActive]}
            onPress={() => setPayMethod(id)}
          >
            <View style={[styles.radio, payMethod === id && styles.radioActive]}>
              {payMethod === id && <View style={styles.radioDot} />}
            </View>
            <Icon size={18} color={colors.muted} strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={styles.payLabel}>{label}</Text>
              <Text style={styles.paySub}>{sub}</Text>
            </View>
          </Pressable>
        ))}

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Subtotal</Text>
            <Text style={styles.summaryVal}>{fmtEGP(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Shipping</Text>
            <Text style={styles.summaryVal}>{shipping === 0 ? 'Free' : fmtEGP(shipping)}</Text>
          </View>
          <View
            style={[
              styles.summaryRow,
              { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 4 },
            ]}
          >
            <Text style={[styles.summaryKey, { fontFamily: 'Inter-SemiBold', color: colors.ink }]}>
              Total
            </Text>
            <Text
              style={[
                styles.summaryVal,
                { fontFamily: 'Outfit-Bold', fontSize: 18, color: colors.ink },
              ]}
            >
              {fmtEGP(orderTotal)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.ctaBtn, loading && { opacity: 0.7 }]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>
              {payMethod === 'cod' ? 'Place order' : `Pay ${fmtEGP(orderTotal)}`}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 120 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.ink },
  cardSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
    marginTop: 8,
  },
  shippingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shippingName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  shippingSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted },
  shippingPrice: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.success },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  payOptionActive: { borderColor: colors.primary, backgroundColor: '#f0f4ff' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  payLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  paySub: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted },
  summary: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 16, marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryKey: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted },
  summaryVal: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.ink },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.page,
    paddingBottom: 36,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ctaBtn: {
    height: 54,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
});
