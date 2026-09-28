// Screen 4b — Seller Orders
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { Search, X } from 'lucide-react-native';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

type Tab = 'all' | 'new' | 'to_ship' | 'shipped' | 'delivered';
type Status = 'new' | 'accepted' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

interface Order {
  id: string;
  number: string;
  createdAt: string;
  status: Status;
  total: number;
  itemCount: number;
  firstItem: { title: string; image: string | null; category: string | null; quantity: number };
  city: string | null;
  paymentMethod: string | null;
}
interface OrdersRes {
  counts: Record<Tab, number>;
  orders: Order[];
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'to_ship', label: 'To ship' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
];

const BADGE: Record<Status, { label: string; bg: string; fg: string }> = {
  new: { label: 'New', bg: colors.accentBg, fg: colors.accentText },
  accepted: { label: 'Accepted', bg: '#e8edf9', fg: colors.primary },
  shipped: { label: 'Shipped', bg: '#e0ecff', fg: '#1d4ed8' },
  delivered: { label: 'Delivered', bg: '#dcfce7', fg: colors.success },
  cancelled: { label: 'Cancelled', bg: '#eceef2', fg: colors.muted },
  returned: { label: 'Returned', bg: '#eceef2', fg: colors.muted },
};

export default function SellerOrders() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (params.tab) setTab(params.tab);
  }, [params.tab]);
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['seller-orders', tab, q],
    queryFn: () =>
      api.get<OrdersRes>(`/api/seller/orders?tab=${tab}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Pressable
          style={styles.iconBtn}
          onPress={() => {
            if (searchOpen) setText('');
            setSearchOpen(o => !o);
          }}
        >
          {searchOpen ? (
            <X size={20} color={colors.ink} />
          ) : (
            <Search size={20} color={colors.ink} />
          )}
        </Pressable>
      </View>
      {searchOpen && (
        <TextInput
          style={styles.search}
          value={text}
          onChangeText={setText}
          placeholder="Search order number or item"
          placeholderTextColor={colors.placeholder}
          autoFocus
        />
      )}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {TABS.map(t => {
            const on = tab === t.id;
            return (
              <Pressable
                key={t.id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setTab(t.id)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {t.label}
                  {data ? ` ${data.counts[t.id] ?? 0}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.empty}>
          <Text style={styles.errorText}>{(error as Error).message}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={styles.link}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.orders ?? []}
          keyExtractor={o => o.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {q ? 'No orders match your search.' : 'No orders here yet.'}
            </Text>
          }
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      )}
    </View>
  );
}

function OrderCard({ order }: { order: Order }) {
  const qc = useQueryClient();
  const badge = BADGE[order.status] ?? BADGE.cancelled;
  const more = order.itemCount - order.firstItem.quantity;

  const action = useMutation({
    mutationFn: (a: 'accept' | 'ship') =>
      api.post<{ ok: boolean; status: string }>(`/api/seller/orders/${order.id}`, { action: a }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
      qc.invalidateQueries({ queryKey: ['seller-stats'] });
    },
    onError: e => Alert.alert('Couldn’t update order', (e as Error).message),
  });
  const label = useMutation({
    mutationFn: () => api.post<{ url: string }>(`/api/seller/orders/${order.id}/label`, {}),
    onSuccess: ({ url }) => {
      if (Platform.OS === 'web') window.open(url);
      else WebBrowser.openBrowserAsync(url);
    },
    onError: e => Alert.alert('Couldn’t create label', (e as Error).message),
  });

  function ship() {
    const msg = 'This marks the order as shipped and notifies the buyer.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) action.mutate('ship');
      return;
    }
    Alert.alert('Mark ready to ship?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => action.mutate('ship') },
    ]);
  }

  const busy = action.isPending || label.isPending;
  const primary =
    order.status === 'new'
      ? { text: 'Accept order', onPress: () => action.mutate('accept') }
      : order.status === 'accepted'
        ? { text: 'Mark ready to ship', onPress: ship }
        : null;
  const canPrint = order.status !== 'cancelled' && order.status !== 'returned';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.number}>#{order.number}</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
        </View>
      </View>
      <View style={styles.itemRow}>
        <Image
          source={order.firstItem.image ? { uri: order.firstItem.image } : null}
          style={styles.thumb}
          contentFit="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {order.firstItem.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[order.firstItem.category, `×${order.firstItem.quantity}`].filter(Boolean).join(' · ')}
            {more > 0 ? `  +${more} more` : ''}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[order.city, order.paymentMethod].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Text style={styles.total}>{Math.round(order.total).toLocaleString('en-EG')} EGP</Text>
      </View>
      {(canPrint || primary) && (
        <View style={styles.btnRow}>
          {canPrint && (
            <Pressable
              style={[styles.btn, styles.btnOutline]}
              disabled={busy}
              onPress={() => label.mutate()}
            >
              {label.isPending ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.btnOutlineText}>Print label</Text>
              )}
            </Pressable>
          )}
          {primary && (
            <Pressable
              style={[styles.btn, styles.btnPrimary, busy && { opacity: 0.7 }]}
              disabled={busy}
              onPress={primary.onPress}
            >
              {action.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>{primary.text}</Text>
              )}
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 10,
  },
  title: { fontFamily: 'InstrumentSerif-Regular', fontSize: 36, color: colors.ink },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    marginHorizontal: spacing.page,
    marginBottom: 10,
    height: 44,
    borderRadius: radii.input,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.ink,
  },
  chips: { paddingHorizontal: spacing.page, gap: 8, paddingBottom: 12 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.navy },
  chipText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.ink },
  chipTextOn: { color: '#fff' },
  list: { paddingHorizontal: spacing.page, paddingBottom: 40, gap: 10 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 14 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  number: { fontFamily: 'Outfit-Bold', fontSize: 15, color: colors.ink },
  badge: { borderRadius: radii.badge, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: 'Inter-SemiBold', fontSize: 11.5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#eceef2' },
  itemTitle: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.ink, marginBottom: 2 },
  meta: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted },
  total: { fontFamily: 'Outfit-Bold', fontSize: 15, color: colors.primary },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.inputBorder },
  btnOutlineText: { fontFamily: 'Inter-SemiBold', fontSize: 13.5, color: colors.ink },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontFamily: 'Inter-SemiBold', fontSize: 13.5, color: '#fff' },
  empty: { alignItems: 'center', marginTop: 40, gap: 8 },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 40,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  link: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.primary },
});
