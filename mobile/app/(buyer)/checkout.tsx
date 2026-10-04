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
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { codeFields, useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

// Card (PaySky) and Fawry stay off until /api/checkout supports them for the app.
type PayMethod = 'cod' | 'instapay' | 'vodafone_cash';
const MANUAL: PayMethod[] = ['instapay', 'vodafone_cash'];
// Keys of /api/payment-methods (the admin on/off toggles).
const TOGGLE_KEY: Record<PayMethod, string> = {
  cod: 'CASH_ON_DELIVERY',
  instapay: 'INSTAPAY',
  vodafone_cash: 'VODAFONE_CASH',
};

interface PayConfig {
  [key: string]: unknown;
  details?: {
    INSTAPAY: {
      ipa: string;
      number: string;
      accountName: string;
      payLink: string;
      qrImageUrl: string;
    };
    VODAFONE_CASH: { number: string; accountName: string; dialShortcut: string };
  };
}
type ShipMethod = 'standard';
interface Quote {
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  shippingFee: number;
  total: number;
}

interface Address {
  id: string;
  street: string;
  city: string;
  governorate: string;
}

const SHIP_OPTIONS: { id: ShipMethod; label: string; sub: string; price: number }[] = [
  { id: 'standard', label: 'Standard', sub: '2–4 days', price: 65 },
  // Same-day (Before 10 pm, 120 EGP) hidden until the backend supports it.
];

const PAY_OPTIONS: { id: PayMethod; label: string; sub: string; badge: string }[] = [
  { id: 'cod', label: 'Cash on delivery', sub: 'Pay the courier in cash', badge: 'COD' },
  {
    id: 'instapay',
    label: 'InstaPay',
    sub: 'Bank transfer, then upload the receipt',
    badge: 'InstaPay',
  },
  {
    id: 'vodafone_cash',
    label: 'Vodafone Cash',
    sub: 'Wallet transfer, then upload the receipt',
    badge: 'VF Cash',
  },
];

export default function Checkout() {
  const router = useRouter();
  const user = useAuth(s => s.user);
  const { items, total, clear, applied } = useCart();
  const [shipMethod, setShipMethod] = useState<ShipMethod>('standard');
  const [payMethod, setPayMethod] = useState<PayMethod>('cod');
  const [usePoints, setUsePoints] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: payConfig } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api.get<PayConfig>('/api/payment-methods'),
  });
  // Until the toggles load (or if they fail) show everything; the server re-checks.
  const payOptions = PAY_OPTIONS.filter(o => payConfig?.[TOGGLE_KEY[o.id]] !== false);
  const manual = MANUAL.includes(payMethod);

  const { data: addrData } = useQuery({
    queryKey: ['addresses'],
    enabled: !!user,
    queryFn: () => api.get<{ addresses: Address[] }>('/api/addresses'),
  });
  const { data: loyalty } = useQuery({
    queryKey: ['loyalty'],
    enabled: !!user,
    queryFn: () => api.get<{ points: number; pointsValue: number }>('/api/loyalty'),
  });

  const address = addrData?.addresses?.[0];
  const points = loyalty?.points ?? 0;
  const pointsValue = Math.round(loyalty?.pointsValue ?? 0);

  const subtotal = total();
  const shipping = SHIP_OPTIONS.find(o => o.id === shipMethod)!.price;
  const codeOff = applied?.forSubtotal === subtotal ? applied.amount : 0;
  const orderBody = {
    shippingMethod: shipMethod,
    addressId: address?.id,
    usePoints,
    ...codeFields(applied, subtotal),
    items: items.map(i => ({ productId: i.productId, qty: i.qty, size: i.size, color: i.color })),
  };
  // The server owns the math (VAT, shipping by governorate, 60% discount cap); this is what gets charged.
  const { data: quoteData, isFetching: quoting } = useQuery({
    queryKey: ['checkout-quote', orderBody],
    enabled: !!address && items.length > 0,
    queryFn: () =>
      api.post<{ quote: Quote }>('/api/checkout', {
        ...orderBody,
        paymentMethod: 'cod',
        quote: true,
      }),
  });
  const quote = quoteData?.quote;
  const discount =
    quote?.discountAmount ?? Math.min(codeOff + (usePoints ? pointsValue : 0), subtotal);
  const vat = quote?.vatAmount ?? 0;
  const shippingFee = quote?.shippingFee ?? shipping;
  const orderTotal = Math.round((quote?.total ?? subtotal + shipping - discount) * 100) / 100;

  function openPay(method: PayMethod) {
    router.push({
      pathname: '/pay/[method]',
      params: {
        method,
        total: String(orderTotal),
        shippingMethod: shipMethod,
        addressId: address?.id ?? '',
        usePoints: usePoints ? '1' : '',
      },
    });
  }

  async function handlePlaceOrder() {
    if (manual) return openPay(payMethod);
    setLoading(true);
    try {
      const res = await api.post<{ orderId: string }>('/api/checkout', {
        ...orderBody,
        paymentMethod: payMethod,
      });
      clear();
      Alert.alert('Order placed!', `Order #${res.orderId}`);
      router.dismissTo('/(buyer)/(tabs)');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        {/* Ship to */}
        <Text style={styles.sectionLabel}>SHIP TO</Text>
        <View style={[styles.card, styles.row]}>
          <MapPin size={20} color={colors.primary} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            {address ? (
              <>
                <Text style={styles.bold}>{user?.name ?? 'Me'} · Home</Text>
                <Text style={styles.muted}>
                  {address.street}, {address.city}
                </Text>
                <Text style={styles.muted}>{address.governorate}</Text>
              </>
            ) : (
              <Text style={styles.bold}>Add a delivery address</Text>
            )}
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => (user ? setAddrOpen(true) : router.push('/(auth)/sign-in'))}
          >
            <Text style={styles.link}>{address ? 'Change' : 'Add'}</Text>
          </Pressable>
        </View>

        {/* Shipping */}
        <Text style={styles.sectionLabel}>SHIPPING</Text>
        <View style={styles.shipRow}>
          {SHIP_OPTIONS.map(o => (
            <Pressable
              key={o.id}
              style={[styles.card, styles.shipCard, shipMethod === o.id && styles.shipCardActive]}
              onPress={() => setShipMethod(o.id)}
            >
              <Text style={styles.bold}>{o.label}</Text>
              <Text style={styles.muted}>{o.sub}</Text>
              <Text style={styles.shipPrice}>{fmtEGP(o.price)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Payment */}
        <Text style={styles.sectionLabel}>PAYMENT</Text>
        <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
          {payOptions.map((o, i) => {
            const active = payMethod === o.id;
            return (
              <Pressable
                key={o.id}
                style={[styles.payRow, i > 0 && styles.divider, active && styles.payRowActive]}
                onPress={() => {
                  setPayMethod(o.id);
                  if (MANUAL.includes(o.id)) openPay(o.id);
                }}
              >
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.semi}>{o.label}</Text>
                  <Text style={styles.muted}>{o.sub}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{o.badge}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Points */}
        {points > 0 && (
          <View style={styles.pointsCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pointsTitle}>Use {points.toLocaleString()} points</Text>
              <Text style={styles.pointsSub}>Save {fmtEGP(pointsValue)} on this order</Text>
            </View>
            <Switch
              value={usePoints}
              onValueChange={setUsePoints}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
        )}
      </ScrollView>

      {/* Sticky summary */}
      <View style={styles.footer}>
        <View style={styles.sumRow}>
          <Text style={styles.muted}>Subtotal</Text>
          <Text style={styles.sumVal}>{fmtEGP(subtotal)}</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.muted}>Shipping{address ? ` · ${address.city}` : ''}</Text>
          <Text style={styles.sumVal}>{fmtEGP(shippingFee)}</Text>
        </View>
        {vat > 0 && (
          <View style={styles.sumRow}>
            <Text style={styles.muted}>VAT (14%)</Text>
            <Text style={styles.sumVal}>{fmtEGP(Math.round(vat * 100) / 100)}</Text>
          </View>
        )}
        {discount > 0 && (
          <View style={styles.sumRow}>
            <Text style={styles.muted}>Discount</Text>
            <Text style={[styles.sumVal, { color: colors.success }]}>−{fmtEGP(discount)}</Text>
          </View>
        )}
        <View style={[styles.sumRow, { marginTop: 4 }]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalVal}>{quoting && !quote ? '…' : fmtEGP(orderTotal)}</Text>
        </View>
        <Pressable
          style={[styles.ctaBtn, (loading || items.length === 0) && { opacity: 0.6 }]}
          onPress={handlePlaceOrder}
          disabled={loading || items.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>{manual ? 'Continue to payment' : 'Place order'}</Text>
          )}
        </Pressable>
      </View>

      <AddressSheet
        visible={addrOpen}
        onClose={() => setAddrOpen(false)}
        onSaved={() => {
          setAddrOpen(false);
          queryClient.invalidateQueries({ queryKey: ['addresses'] });
        }}
      />
    </View>
  );
}

function AddressSheet({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ street: '', city: '', governorate: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    setError('');
    try {
      // New address becomes the default, so it shows first on the Ship-to card.
      await api.post('/api/addresses', { ...form, isDefault: true });
      setForm({ street: '', city: '', governorate: '', phone: '' });
      onSaved();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof typeof form; placeholder: string }[] = [
    { key: 'street', placeholder: 'Street, building, apartment' },
    { key: 'city', placeholder: 'City / area (e.g. Nasr City)' },
    { key: 'governorate', placeholder: 'Governorate (e.g. Cairo)' },
    { key: 'phone', placeholder: 'Phone (optional)' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>Delivery address</Text>
        {fields.map(f => (
          <TextInput
            key={f.key}
            style={styles.input}
            placeholder={f.placeholder}
            placeholderTextColor={colors.placeholder}
            value={form[f.key]}
            onChangeText={set(f.key)}
            keyboardType={f.key === 'phone' ? 'phone-pad' : 'default'}
          />
        ))}
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          style={[styles.ctaBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Save address</Text>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
  },
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 260 },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 1,
    color: colors.muted,
    marginTop: 18,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bold: { fontFamily: 'Inter-Bold', fontSize: 15, color: colors.ink, marginBottom: 2 },
  semi: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.ink, marginBottom: 2 },
  muted: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted, lineHeight: 19 },
  link: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.primary },
  shipRow: { flexDirection: 'row', gap: 12 },
  shipCard: { flex: 1, borderWidth: 1.5 },
  shipCardActive: { borderColor: colors.primary },
  shipPrice: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.primary, marginTop: 8 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  payRowActive: { backgroundColor: '#f0f4ff' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f1efeb',
  },
  badgeText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: colors.muted },
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    padding: 16,
    borderRadius: radii.card,
    backgroundColor: '#fdf3dc',
  },
  pointsTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: colors.accentText },
  pointsSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.accentText, marginTop: 2 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.page,
    paddingTop: 14,
    paddingBottom: 28,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sumVal: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  totalLabel: { fontFamily: 'Outfit-Bold', fontSize: 18, color: colors.ink },
  totalVal: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink },
  ctaBtn: {
    height: 54,
    marginTop: 10,
    borderRadius: radii.button,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#fff' },
  backdrop: { flex: 1, backgroundColor: 'rgba(14,22,51,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: spacing.page,
    paddingBottom: 32,
    gap: 10,
  },
  sheetTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink, marginBottom: 4 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.ink,
  },
  error: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#dc2626' },
});
