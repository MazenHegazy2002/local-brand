// Screen 4a — Seller Dashboard
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, AlertTriangle } from 'lucide-react-native';
import { colors, radii, spacing } from '@/lib/tokens';
import { useSellerStats, compact, type Range, type SellerStats } from '@/lib/seller';
import { StoreLogo } from '@/components/seller/StoreLogo';

const RANGES: { id: Range; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
];

export default function SellerDashboard() {
  const router = useRouter();
  const [range, setRange] = useState<Range>('7d');
  const { data, isLoading, isError, error, refetch, isRefetching } = useSellerStats(range);

  const waiting = (data?.newOrders ?? 0) + (data?.toShip ?? 0);
  const lowStock = data?.lowStockVariants ?? 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.inner}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <StoreLogo name={data?.store.name} uri={data?.store.logoUrl} />
        <View style={{ flex: 1 }}>
          <Text style={styles.hubLabel}>Seller Hub</Text>
          <Text style={styles.storeName} numberOfLines={1}>
            {data?.store.name ?? (isLoading ? ' ' : 'Your store')}
          </Text>
        </View>
        <Pressable style={styles.bell} onPress={() => router.push('./notifications')}>
          <Bell size={20} color={colors.ink} strokeWidth={1.9} />
          {!!data?.unreadNotifications && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {data.unreadNotifications > 99 ? '99+' : data.unreadNotifications}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {data && data.store.status !== 'ACTIVE' && (
        <View style={styles.notice}>
          <AlertTriangle size={16} color={colors.accentText} />
          <Text style={styles.noticeText}>
            {data.store.status === 'PENDING_APPROVAL'
              ? 'Your store is awaiting approval. Listings stay as drafts until an admin approves it.'
              : 'Your store is suspended. Listings can’t go live — contact support.'}
          </Text>
        </View>
      )}

      <View style={styles.segment}>
        {RANGES.map(r => (
          <Pressable
            key={r.id}
            style={[styles.segBtn, range === r.id && styles.segBtnOn]}
            onPress={() => setRange(r.id)}
          >
            <Text style={[styles.segText, range === r.id && styles.segTextOn]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      {isError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>Couldn’t load stats: {(error as Error).message}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : !data ? (
        <>
          <View style={[styles.salesCard, { height: 230, opacity: 0.35 }]} />
          <View style={styles.grid}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[styles.tile, { height: 84, opacity: 0.6 }]} />
            ))}
          </View>
        </>
      ) : (
        <>
          <SalesCard data={data} range={range} />
          <View style={styles.grid}>
            <Tile label="Orders" value={String(data.orders)} />
            <Tile label="Store visits" value={compact(data.storeVisits)} />
            <Tile label="To ship" value={String(data.toShip)} />
            <Tile label="Rating" value={data.rating == null ? '—' : `${data.rating.toFixed(1)}★`} />
          </View>

          <Text style={styles.sectionTitle}>Needs action</Text>
          {waiting > 0 && (
            <ActionRow
              count={waiting}
              tone="amber"
              title={`${waiting} order${waiting === 1 ? '' : 's'} waiting to ship`}
              onPress={() =>
                router.push({
                  pathname: '/(seller)/orders',
                  params: { tab: data.newOrders > 0 ? 'new' : 'to_ship' },
                })
              }
            />
          )}
          {lowStock > 0 && (
            <ActionRow
              count={lowStock}
              tone="red"
              title={`${lowStock} variant${lowStock === 1 ? '' : 's'} low on stock`}
              onPress={() =>
                router.push({ pathname: '/(seller)/products', params: { filter: 'low_stock' } })
              }
            />
          )}
          {waiting === 0 && lowStock === 0 && <Text style={styles.caughtUp}>All caught up.</Text>}
        </>
      )}
    </ScrollView>
  );
}

function SalesCard({ data, range }: { data: SellerStats; range: Range }) {
  const max = Math.max(1, ...data.series.map(s => s.value));
  const thin = data.series.length > 12;
  const pct = data.changePct;
  return (
    <View style={styles.salesCard}>
      <View style={styles.salesTop}>
        <Text style={styles.salesLabel}>Net sales</Text>
        {pct != null && (
          <View
            style={[
              styles.pill,
              { backgroundColor: pct >= 0 ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.22)' },
            ]}
          >
            <Text style={[styles.pillText, { color: pct >= 0 ? '#86efac' : '#fca5a5' }]}>
              {pct >= 0 ? '+' : ''}
              {Math.round(pct)}%
            </Text>
          </View>
        )}
      </View>
      <View style={styles.amountRow}>
        <Text style={styles.amount}>{Math.round(data.netSales).toLocaleString('en-EG')}</Text>
        <Text style={styles.amountUnit}>EGP</Text>
      </View>
      <View style={styles.chart}>
        {data.series.map((s, i) => (
          <View key={i} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={{
                  height: `${Math.max(3, (s.value / max) * 100)}%`,
                  borderRadius: thin ? 2 : 6,
                  marginHorizontal: thin ? 1 : 4,
                  backgroundColor:
                    i === data.series.length - 1 ? colors.accent : 'rgba(255,255,255,.28)',
                }}
              />
            </View>
            <Text style={styles.barLabel} numberOfLines={1}>
              {range !== '30d' || i % 5 === 0 ? s.label : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function ActionRow({
  count,
  tone,
  title,
  onPress,
}: {
  count: number;
  tone: 'amber' | 'red';
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionRow} onPress={onPress}>
      <View
        style={[
          styles.countBox,
          { backgroundColor: tone === 'amber' ? colors.accentBg : '#fee2e2' },
        ]}
      >
        <Text
          style={[
            styles.countText,
            { color: tone === 'amber' ? colors.accentText : colors.danger },
          ]}
        >
          {count}
        </Text>
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <ChevronRight size={18} color={colors.placeholder} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  inner: { paddingTop: spacing.top, paddingHorizontal: spacing.page, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  hubLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.muted },
  storeName: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: { fontFamily: 'Inter-Bold', fontSize: 9.5, color: '#fff' },
  notice: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.accentBg,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    color: colors.accentText,
    lineHeight: 18,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#e7e9ef',
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: 14,
  },
  segBtn: {
    flex: 1,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnOn: { backgroundColor: colors.surface },
  segText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.muted },
  segTextOn: { color: colors.ink },
  salesCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.cardLg,
    padding: 20,
    marginBottom: 12,
  },
  salesTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  salesLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: 'rgba(255,255,255,.72)' },
  pill: { borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontFamily: 'Inter-Bold', fontSize: 12 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
    marginBottom: 16,
  },
  amount: { fontFamily: 'Outfit-ExtraBold', fontSize: 36, color: '#fff' },
  amountUnit: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: 'rgba(255,255,255,.72)' },
  chart: { flexDirection: 'row', height: 110 },
  barCol: { flex: 1 },
  barTrack: { flex: 1, justifyContent: 'flex-end' },
  barLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: 'rgba(255,255,255,.6)',
    textAlign: 'center',
    marginTop: 6,
    width: 40,
    alignSelf: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
  },
  tileLabel: { fontFamily: 'Inter-Medium', fontSize: 12.5, color: colors.muted, marginBottom: 6 },
  tileValue: { fontFamily: 'Outfit-Bold', fontSize: 24, color: colors.ink },
  sectionTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, color: colors.ink, marginBottom: 10 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 12,
    marginBottom: 8,
  },
  countBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: 'Outfit-Bold', fontSize: 16 },
  actionTitle: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  caughtUp: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.muted },
  errorCard: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 16, gap: 8 },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.danger },
  retry: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.primary },
});
