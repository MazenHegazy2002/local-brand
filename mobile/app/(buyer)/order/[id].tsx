// Screen 3c — Order tracking
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

const STEPS = [
  { key: 'ORDER_PLACED', label: 'Order confirmed' },
  { key: 'PROCESSING', label: 'Packed by brand' },
  { key: 'SHIPPED', label: 'Out for delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
];

// Order.status values from the server mapped onto the 4 timeline steps.
const STEP_RANK: Record<string, number> = {
  PENDING_PAYMENT: 0,
  CONFIRMED: 0,
  PROCESSING: 1,
  SHIPPED: 2,
  DELIVERED: 3,
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  const day =
    d.toDateString() === new Date().toDateString()
      ? 'Today'
      : d.toLocaleDateString([], { weekday: 'short' });
  return `${day} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export default function OrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<{ order: any }>(`/api/orders/${id}`),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  const order = data?.order;
  if (!order) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.summaryText}>Order not found.</Text>
      </View>
    );
  }
  const status: string = order.status;
  const currentStep = STEP_RANK[status] ?? 0;

  const eta =
    status === 'SHIPPED'
      ? 'On the way'
      : status === 'DELIVERED'
        ? 'Delivered'
        : status === 'CANCELLED' || status === 'RETURNED'
          ? status.toLowerCase()
          : 'In progress';

  const subtotal: number = order.total;
  const payMethod: string = order.paymentMethod;
  // No "packed" timestamp is stored, so that step only shows a dash.
  const stepTimes: (string | null)[] = [order.createdAt, null, order.shippedAt, order.deliveredAt];
  const itemCount: number = order.items.reduce((s: number, i: any) => s + i.quantity, 0);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.inner}>
        {/* ETA card */}
        <View style={styles.etaCard}>
          <View style={styles.etaTop}>
            <View>
              <Text style={styles.etaLabel}>
                {status === 'DELIVERED' ? 'Delivered' : 'Arriving'}
              </Text>
              <Text style={styles.etaTime}>{eta}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {status === 'SHIPPED'
                  ? 'Out for delivery'
                  : status === 'DELIVERED'
                    ? 'Delivered'
                    : 'Processing'}
              </Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.segment, i <= currentStep && styles.segmentDone]} />
            ))}
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {STEPS.map((step, i) => {
            const done = i <= currentStep;
            const isLast = i === STEPS.length - 1;
            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, done && styles.timelineDotDone]}>
                    {done && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineLine,
                        done && i < currentStep && styles.timelineLineDone,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, !done && styles.timelineLabelPending]}>
                    {step.label}
                  </Text>
                  <Text style={styles.timelineTime}>
                    {stepTimes[i] ? fmtTime(stepTimes[i]!) : '—'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Order summary */}
        <View style={styles.summaryCard}>
          <View style={styles.thumbs}>
            {order.items.slice(0, 2).map((i: any) => (
              <Image
                key={i.id}
                source={i.image ? { uri: i.image } : undefined}
                style={styles.thumb}
                contentFit="cover"
              />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryText}>
              {itemCount} item{itemCount !== 1 ? 's' : ''} · {fmtEGP(subtotal)}
            </Text>
            <Text style={styles.summaryPayment}>
              {payMethod === 'CASH_ON_DELIVERY' ? 'Cash on delivery' : payMethod.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.whatsappBtn} onPress={() => Linking.openURL('https://wa.me/')}>
            <Text style={styles.whatsappBtnText}>💬 Chat courier</Text>
          </Pressable>
          <Pressable
            style={styles.helpBtn}
            onPress={() =>
              Linking.openURL(`mailto:support@brandyy.shop?subject=Order%20${order.id}`)
            }
          >
            <Text style={styles.helpBtnText}>Get help</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 40 },
  etaCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.cardLg,
    padding: 20,
    marginBottom: 20,
  },
  etaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  etaLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,.65)',
    marginBottom: 4,
  },
  etaTime: { fontFamily: 'InstrumentSerif-Regular', fontSize: 28, color: '#fff' },
  statusPill: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: { fontFamily: 'Inter-Bold', fontSize: 12, color: colors.ink },
  progressTrack: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.25)' },
  segmentDone: { backgroundColor: colors.accent },
  timeline: { marginBottom: 20 },
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineLeft: { alignItems: 'center', width: 24 },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 },
  timelineLineDone: { backgroundColor: colors.primary },
  timelineContent: { flex: 1, paddingBottom: 20, paddingTop: 2 },
  timelineLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  timelineTime: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  timelineLabelPending: { color: colors.muted, fontFamily: 'Inter-Regular' },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbs: { flexDirection: 'row' },
  thumb: {
    marginRight: -8,
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  summaryText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink, marginBottom: 4 },
  summaryPayment: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted },
  actions: { flexDirection: 'row', gap: 12 },
  whatsappBtn: {
    flex: 1,
    height: 52,
    borderRadius: radii.button,
    backgroundColor: '#25d366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
  helpBtn: {
    flex: 1,
    height: 52,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  helpBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
});
