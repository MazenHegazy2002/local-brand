// Screen 6a — Admin overview: live KPIs, pipeline, top sellers, recent orders, approvals
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Store,
  Package,
  Wallet,
  ShieldAlert,
  LifeBuoy,
  Globe,
  LogOut,
} from 'lucide-react-native';
import { api, fmtEGP } from '@/lib/api';
import { API_BASE } from '@/lib/seller';
import { colors, radii, spacing } from '@/lib/tokens';
import { useT, statusKey, LANGS, LANG_NAMES } from '@/lib/i18n';
import { useAuth } from '@/store/auth';

type Range = 'today' | '7d' | '30d';
interface Summary {
  sales: number;
  collected: number;
  orders: number;
  newUsers: number;
  cancelRate: number;
}
interface AdminStats {
  current: Summary;
  previous: Summary;
  series: { label: string; value: number }[];
  statusCounts: Record<string, number>;
  paymentMix: Record<string, number>;
  topSellers: { name: string; revenue: number; units: number }[];
  recentOrders: {
    id: string;
    total: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
    customer: string | null;
  }[];
  totals: {
    users: number;
    activeSellers: number;
    pendingSellers: number;
    liveProducts: number;
    toFulfil: number;
    awaitingPayment: number;
    disputes: number;
    tickets: number;
  };
}

const RANGES: { id: Range; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
];
const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: '#a78bfa',
  CONFIRMED: '#60a5fa',
  PROCESSING: colors.accent,
  SHIPPED: '#38bdf8',
  DELIVERED: '#4ade80',
  CANCELLED: '#f87171',
  RETURNED: '#fb923c',
};
const PAY_LABEL: Record<string, string> = {
  CASH_ON_DELIVERY: 'Cash on delivery',
  INSTAPAY: 'InstaPay',
  VODAFONE_CASH: 'Vodafone Cash',
  CREDIT_CARD: 'Card',
  PAYSKY: 'Card',
  PAYMOB: 'Card',
  MOBILE_WALLET: 'Wallet',
  FAWRY: 'Fawry',
};
const PAY_COLORS: Record<string, string> = {
  'Cash on delivery': colors.accent,
  InstaPay: '#a78bfa',
  'Vodafone Cash': '#f87171',
  Card: '#60a5fa',
  Wallet: '#38bdf8',
  Fawry: '#4ade80',
};

// % change vs the previous period; null when there is nothing to compare with.
const change = (now: number, before: number) => (before ? ((now - before) / before) * 100 : null);
const aov = (s: Summary) => (s.orders ? s.sales / s.orders : 0);

export default function AdminOverview() {
  const router = useRouter();
  const qc = useQueryClient();
  const { t, lang } = useT();
  const { user, setLang, signOut } = useAuth();
  const [range, setRange] = useState<Range>('today');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-stats', range],
    queryFn: () => api.get<AdminStats>(`/api/admin/stats?range=${range}`),
    refetchInterval: 60_000,
  });
  const { data: pendingSellers } = useQuery({
    queryKey: ['admin-pending-sellers'],
    queryFn: () =>
      api.get<{ sellers: { id: string; storeName: string; user: { email: string } }[] }>(
        '/api/admin/sellers?status=PENDING_APPROVAL&limit=3'
      ),
  });
  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      api.post(`/api/admin/sellers/${id}/${action}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending-sellers'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: e => Alert.alert(t('Error'), (e as Error).message),
  });

  const openWeb = (path: string) => Linking.openURL(`${API_BASE}${path}`);
  function confirmSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm(t('Sign out?'))) signOut();
      return;
    }
    Alert.alert(t('Sign out'), t('Are you sure?'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Sign out'), style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const cur = data?.current;
  const prev = data?.previous;
  const tot = data?.totals;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.inner}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />
        }
      >
        {/* Header */}
        <Text style={styles.adminLabel}>{t('ADMIN OS')}</Text>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('Overview')}</Text>
            {!!user?.name && (
              <Text style={styles.hello}>{t('Hi, {name}', { name: user.name })}</Text>
            )}
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t('Live now')}</Text>
          </View>
          <Pressable
            style={styles.langPill}
            onPress={() => setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length])}
          >
            <Text style={styles.langText}>{LANG_NAMES[lang]}</Text>
          </Pressable>
        </View>

        {/* Range */}
        <View style={styles.segment}>
          {RANGES.map(r => (
            <Pressable
              key={r.id}
              style={[styles.segBtn, range === r.id && styles.segBtnOn]}
              onPress={() => setRange(r.id)}
            >
              <Text style={[styles.segText, range === r.id && styles.segTextOn]}>{t(r.label)}</Text>
            </Pressable>
          ))}
        </View>

        {isError ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>
              {t('Couldn’t load stats: {msg}', { msg: (error as Error).message })}
            </Text>
            <Pressable onPress={() => refetch()}>
              <Text style={styles.link}>{t('Try again')}</Text>
            </Pressable>
          </View>
        ) : isLoading || !data || !cur || !prev || !tot ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 60 }} />
        ) : (
          <>
            {/* Sales hero */}
            <View style={styles.hero}>
              <View style={styles.rowBetween}>
                <Text style={styles.heroLabel}>{t('Sales')}</Text>
                <Trend pct={change(cur.sales, prev.sales)} />
              </View>
              <Text style={styles.heroAmount}>{fmtEGP(Math.round(cur.sales))}</Text>
              <Text style={styles.heroSub}>
                {t('Collected {amount}', { amount: fmtEGP(Math.round(cur.collected)) })}
              </Text>
              <Bars series={data.series} sparseLabels={range !== '7d'} />
            </View>

            {/* KPIs */}
            <View style={styles.kpiGrid}>
              <Kpi
                label={t('Orders')}
                value={String(cur.orders)}
                pct={change(cur.orders, prev.orders)}
              />
              <Kpi
                label={t('Avg. order')}
                value={fmtEGP(Math.round(aov(cur)))}
                pct={change(aov(cur), aov(prev))}
              />
              <Kpi
                label={t('New users')}
                value={String(cur.newUsers)}
                pct={change(cur.newUsers, prev.newUsers)}
              />
              <Kpi
                label={t('Cancel rate')}
                value={`${(cur.cancelRate * 100).toFixed(1)}%`}
                pct={change(cur.cancelRate, prev.cancelRate)}
                lowerIsBetter
              />
            </View>

            {/* Needs attention */}
            <Text style={styles.sectionTitle}>{t('Needs attention')}</Text>
            <View style={styles.card}>
              {[
                {
                  Icon: Store,
                  n: tot.pendingSellers,
                  label: 'Sellers awaiting approval',
                  onPress: () => router.push('/(admin)/approvals' as Href),
                },
                { Icon: Package, n: tot.toFulfil, label: 'Orders to fulfil' },
                { Icon: Wallet, n: tot.awaitingPayment, label: 'Orders awaiting payment' },
                { Icon: ShieldAlert, n: tot.disputes, label: 'Open disputes' },
                { Icon: LifeBuoy, n: tot.tickets, label: 'Open support tickets' },
              ].map(({ Icon, n, label, onPress }, i) => (
                <Pressable
                  key={label}
                  style={[styles.listRow, i > 0 && styles.divider]}
                  onPress={onPress ?? (() => openWeb('/admin-os'))}
                >
                  <View style={[styles.iconBox, n > 0 && styles.iconBoxHot]}>
                    <Icon size={16} color={n > 0 ? colors.accent : 'rgba(255,255,255,.5)'} />
                  </View>
                  <Text style={styles.rowLabel}>{t(label)}</Text>
                  <Text style={[styles.rowCount, n > 0 && { color: colors.accent }]}>{n}</Text>
                  <ChevronRight size={16} color="rgba(255,255,255,.3)" />
                </Pressable>
              ))}
            </View>

            {/* Pending sellers, decided in place */}
            {(pendingSellers?.sellers ?? []).map(s => (
              <View key={s.id} style={styles.approvalCard}>
                <View style={styles.approvalTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{s.storeName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.approvalName}>{s.storeName}</Text>
                    <Text style={styles.muted}>{s.user?.email}</Text>
                  </View>
                </View>
                <View style={styles.approvalBtns}>
                  <Pressable
                    style={styles.rejectBtn}
                    disabled={decide.isPending}
                    onPress={() => decide.mutate({ id: s.id, action: 'reject' })}
                  >
                    <Text style={styles.rejectText}>{t('Reject')}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.approveBtn}
                    disabled={decide.isPending}
                    onPress={() => decide.mutate({ id: s.id, action: 'approve' })}
                  >
                    <Text style={styles.approveText}>{t('Approve')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {/* Order pipeline */}
            <Text style={styles.sectionTitle}>{t('Order pipeline')}</Text>
            <View style={styles.card}>
              <Breakdown
                counts={data.statusCounts}
                colorOf={k => STATUS_COLORS[k] ?? '#94a3b8'}
                labelOf={k => t(statusKey(k))}
              />
            </View>

            {/* Payment mix */}
            <Text style={styles.sectionTitle}>{t('Payment methods')}</Text>
            <View style={styles.card}>
              <Breakdown
                counts={Object.entries(data.paymentMix).reduce<Record<string, number>>(
                  (acc, [k, n]) => {
                    const label = PAY_LABEL[k] ?? k;
                    acc[label] = (acc[label] ?? 0) + n;
                    return acc;
                  },
                  {}
                )}
                colorOf={k => PAY_COLORS[k] ?? '#94a3b8'}
                labelOf={k => t(k)}
              />
            </View>

            {/* Top sellers */}
            <Text style={styles.sectionTitle}>{t('Top sellers')}</Text>
            <View style={styles.card}>
              {data.topSellers.length === 0 ? (
                <Text style={styles.muted}>{t('No sales in this period.')}</Text>
              ) : (
                data.topSellers.map((s, i) => (
                  <View key={s.name} style={[styles.sellerRow, i > 0 && styles.divider]}>
                    <Text style={styles.rank}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.rowLabel} numberOfLines={1}>
                          {s.name}
                        </Text>
                        <Text style={styles.sellerRev}>{fmtEGP(Math.round(s.revenue))}</Text>
                      </View>
                      <View style={styles.meter}>
                        <View
                          style={[
                            styles.meterFill,
                            {
                              width: `${(s.revenue / Math.max(1, data.topSellers[0].revenue)) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.muted}>{t('{n} units sold', { n: s.units })}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Recent orders */}
            <Text style={styles.sectionTitle}>{t('Recent orders')}</Text>
            <View style={styles.card}>
              {data.recentOrders.length === 0 ? (
                <Text style={styles.muted}>{t('No orders yet.')}</Text>
              ) : (
                data.recentOrders.map((o, i) => (
                  <View key={o.id} style={[styles.orderRow, i > 0 && styles.divider]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel} numberOfLines={1}>
                        #{o.id.slice(0, 8).toUpperCase()} · {o.customer ?? t('Guest')}
                      </Text>
                      <Text style={styles.muted}>
                        {new Date(o.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {' · '}
                        {t(PAY_LABEL[o.paymentMethod] ?? o.paymentMethod)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={styles.orderTotal}>{fmtEGP(Math.round(o.total))}</Text>
                      <Text
                        style={[styles.statusText, { color: STATUS_COLORS[o.status] ?? '#94a3b8' }]}
                      >
                        {t(statusKey(o.status))}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Platform totals */}
            <Text style={styles.sectionTitle}>{t('Platform')}</Text>
            <View style={styles.kpiGrid}>
              {[
                { label: t('Customers'), value: tot.users },
                { label: t('Active sellers'), value: tot.activeSellers },
                { label: t('Live products'), value: tot.liveProducts },
              ].map(k => (
                <View key={k.label} style={[styles.kpiCard, styles.kpiThird]}>
                  <Text style={styles.kpiValue}>{k.value.toLocaleString()}</Text>
                  <Text style={styles.kpiLabel}>{k.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer actions */}
        <Pressable style={styles.footerBtn} onPress={() => openWeb('/admin-os')}>
          <Globe size={18} color="#fff" />
          <Text style={styles.footerText}>{t('Open full Admin OS on the web')}</Text>
        </Pressable>
        <Pressable style={[styles.footerBtn, styles.signOutBtn]} onPress={confirmSignOut}>
          <LogOut size={18} color="#f87171" />
          <Text style={[styles.footerText, { color: '#f87171' }]}>{t('Sign out')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Kpi(p: { label: string; value: string; pct: number | null; lowerIsBetter?: boolean }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{p.label}</Text>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {p.value}
      </Text>
      <Trend pct={p.pct} lowerIsBetter={p.lowerIsBetter} />
    </View>
  );
}

function Trend({ pct, lowerIsBetter }: { pct: number | null; lowerIsBetter?: boolean }) {
  const { t } = useT();
  if (pct == null) return <Text style={styles.trendFlat}>{t('No prior data')}</Text>;
  const good = lowerIsBetter ? pct <= 0 : pct >= 0;
  return (
    <Text style={[styles.trend, { color: good ? '#4ade80' : '#f87171' }]}>
      {pct >= 0 ? '▲' : '▼'} {t('{pct}% vs previous', { pct: Math.abs(pct).toFixed(0) })}
    </Text>
  );
}

function Bars({
  series,
  sparseLabels,
}: {
  series: { label: string; value: number }[];
  sparseLabels: boolean;
}) {
  const max = Math.max(1, ...series.map(s => s.value));
  const thin = series.length > 12;
  return (
    <View style={styles.chart}>
      {series.map((s, i) => (
        <View key={i} style={styles.barCol}>
          <View style={styles.barTrack}>
            <View
              style={{
                height: `${Math.max(3, (s.value / max) * 100)}%`,
                borderRadius: thin ? 2 : 5,
                marginHorizontal: thin ? 1 : 4,
                backgroundColor:
                  s.value > 0 && s.value === max ? colors.accent : 'rgba(255,255,255,.25)',
              }}
            />
          </View>
          <Text style={styles.barLabel} numberOfLines={1}>
            {!sparseLabels || i % 6 === 0 ? s.label : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Breakdown({
  counts,
  colorOf,
  labelOf,
}: {
  counts: Record<string, number>;
  colorOf: (k: string) => string;
  labelOf: (k: string) => string;
}) {
  const { t } = useT();
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((n, [, c]) => n + c, 0);
  if (!total) return <Text style={styles.muted}>{t('No orders in this period.')}</Text>;
  return (
    <>
      <View style={styles.stack}>
        {entries.map(([k, n]) => (
          <View key={k} style={{ flex: n, backgroundColor: colorOf(k) }} />
        ))}
      </View>
      <View style={styles.legend}>
        {entries.map(([k, n]) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colorOf(k) }]} />
            <Text style={styles.legendText}>
              {labelOf(k)} · {n} ({Math.round((n / total) * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

const glass = 'rgba(255,255,255,.06)';
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgAdmin },
  inner: { paddingTop: spacing.top, paddingHorizontal: spacing.page, paddingBottom: 48 },
  adminLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 32, color: '#fff' },
  hello: { fontFamily: 'Inter-Regular', fontSize: 13, color: 'rgba(255,255,255,.55)' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74,222,128,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  liveText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#4ade80' },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.2)',
  },
  langText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fff' },
  segment: {
    flexDirection: 'row',
    backgroundColor: glass,
    borderRadius: radii.sm,
    padding: 4,
    marginBottom: 16,
  },
  segBtn: { flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segBtnOn: { backgroundColor: 'rgba(255,255,255,.14)' },
  segText: { fontFamily: 'Inter-Medium', fontSize: 13, color: 'rgba(255,255,255,.55)' },
  segTextOn: { fontFamily: 'Inter-SemiBold', color: '#fff' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.cardLg,
    padding: 18,
    marginBottom: 12,
  },
  heroLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: 'rgba(255,255,255,.7)' },
  heroAmount: { fontFamily: 'Outfit-ExtraBold', fontSize: 34, color: '#fff', marginTop: 6 },
  heroSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: 'rgba(255,255,255,.6)' },
  chart: { flexDirection: 'row', height: 110, marginTop: 16 },
  barCol: { flex: 1 },
  barTrack: { flex: 1, justifyContent: 'flex-end' },
  barLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    color: 'rgba(255,255,255,.5)',
    textAlign: 'center',
    marginTop: 4,
  },
  trend: { fontFamily: 'Inter-SemiBold', fontSize: 11, marginTop: 4 },
  trendFlat: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,.4)',
    marginTop: 4,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '48%', backgroundColor: glass, borderRadius: radii.card, padding: 14 },
  kpiThird: { width: '31%' },
  kpiLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: 'rgba(255,255,255,.5)' },
  kpiValue: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#fff', marginTop: 4 },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#fff',
    marginTop: 22,
    marginBottom: 10,
  },
  card: { backgroundColor: glass, borderRadius: radii.card, padding: 14 },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.08)' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxHot: { backgroundColor: 'rgba(245,158,11,.15)' },
  rowLabel: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 14, color: '#fff' },
  rowCount: { fontFamily: 'Outfit-Bold', fontSize: 16, color: 'rgba(255,255,255,.5)' },
  muted: { fontFamily: 'Inter-Regular', fontSize: 12, color: 'rgba(255,255,255,.5)' },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#fca5a5', marginBottom: 8 },
  link: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.accent },
  approvalCard: { backgroundColor: glass, borderRadius: radii.card, padding: 14, marginTop: 10 },
  approvalTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Outfit-Bold', fontSize: 17, color: '#fff' },
  approvalName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
  approvalBtns: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1,
    height: 42,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
  approveBtn: {
    flex: 1,
    height: 42,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'Inter-Regular', fontSize: 12, color: 'rgba(255,255,255,.75)' },
  sellerRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  rank: { fontFamily: 'Outfit-Bold', fontSize: 16, color: colors.accent, width: 18 },
  sellerRev: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff' },
  meter: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,.08)',
    marginVertical: 6,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  orderTotal: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
  statusText: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: radii.button,
    backgroundColor: glass,
    marginTop: 28,
  },
  signOutBtn: {
    marginTop: 12,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(248,113,113,.4)',
  },
  footerText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
});
