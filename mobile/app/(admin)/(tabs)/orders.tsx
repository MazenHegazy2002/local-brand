// Admin orders: filter by status, search, open an order to change status / payment.
import { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Linking, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { api, fmtEGP } from '@/lib/api';
import { absUrl } from '@/lib/seller';
import { useT, statusKey } from '@/lib/i18n';
import {
  Header,
  Chips,
  SearchBox,
  StatusPill,
  Card,
  Btn,
  ListState,
  useOptionSheet,
  s,
} from '@/components/admin/ui';

const STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;
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

interface AdminOrder {
  id: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentReceiptUrl: string | null;
  paymentReference: string | null;
  paymentSenderDetail: string | null;
  createdAt: string;
  guestEmail: string | null;
  user: { name: string; email: string; phone: string | null } | null;
  address: Record<string, string>;
  items: {
    id: string;
    productTitleSnapshot: string;
    sellerNameSnapshot: string;
    priceAtPurchase: number;
    quantity: number;
    selectedSize: string | null;
    selectedColor: string | null;
  }[];
}
interface OrdersRes {
  orders: AdminOrder[];
  total: number;
  totalPages: number;
  counts: Record<string, number>;
}

export default function AdminOrders() {
  const { t } = useT();
  // `at` changes on every shortcut tap, so the same shortcut re-applies its filter.
  const params = useLocalSearchParams<{ status?: string; at?: string }>();
  const [status, setStatus] = useState(params.status ?? '');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    if (params.status) setStatus(params.status);
  }, [params.status, params.at]);
  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);

  const { data, isLoading, error, refetch, isRefetching, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['admin-orders', status, q],
      initialPageParam: 1,
      queryFn: ({ pageParam }) =>
        api.get<OrdersRes>(
          `/api/admin/orders?status=${status}&q=${encodeURIComponent(q)}&page=${pageParam}`
        ),
      getNextPageParam: (last, pages) =>
        pages.length < last.totalPages ? pages.length + 1 : undefined,
    });
  const first = data?.pages[0];
  const orders = data?.pages.flatMap(p => p.orders) ?? [];
  const counts = first?.counts ?? {};
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const toFulfil = (counts.CONFIRMED ?? 0) + (counts.PROCESSING ?? 0);

  return (
    <View style={s.root}>
      <Header title={t('Orders')} />
      <SearchBox value={text} onChange={setText} placeholder={t('Search order, name or email')} />
      <Chips
        options={[
          { id: '', label: 'All' },
          { id: 'CONFIRMED,PROCESSING', label: 'To fulfil' },
          ...STATUSES.map(id => ({ id, label: statusKey(id) })),
        ]}
        value={status}
        onChange={setStatus}
        counts={{ '': all, 'CONFIRMED,PROCESSING': toFulfil, ...counts }}
      />
      <FlatList
        data={orders}
        onEndReached={() => hasNextPage && fetchNextPage()}
        keyExtractor={o => o.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />
        }
        ListEmptyComponent={
          <ListState
            loading={isLoading}
            error={error}
            onRetry={refetch}
            empty={t('No orders here yet.')}
          />
        }
        renderItem={({ item }) => <OrderCard order={item} />}
      />
    </View>
  );
}

function OrderCard({ order: o }: { order: AdminOrder }) {
  const { t, lang } = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const sheet = useOptionSheet();
  const update = useMutation({
    mutationFn: (body: { status?: string; paymentStatus?: string }) =>
      api.patch(`/api/admin/orders/${o.id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
  const customer = o.user?.name ?? o.address.fullName ?? o.guestEmail ?? t('Guest');
  const units = o.items.reduce((n, i) => n + i.quantity, 0);
  const addr = [o.address.street, o.address.city, o.address.governorate].filter(Boolean).join(', ');

  return (
    <Card onPress={() => setOpen(v => !v)}>
      <View style={s.between}>
        <Text style={s.strong}>#{o.id.slice(0, 8).toUpperCase()}</Text>
        <Text style={s.amount}>{fmtEGP(Math.round(o.totalAmount))}</Text>
      </View>
      <View style={s.between}>
        <Text style={s.body} numberOfLines={1}>
          {customer} · {t(units === 1 ? '{n} item' : '{n} items', { n: units })}
        </Text>
        {open ? (
          <ChevronUp size={16} color="rgba(255,255,255,.4)" />
        ) : (
          <ChevronDown size={16} color="rgba(255,255,255,.4)" />
        )}
      </View>
      <View style={s.row}>
        <StatusPill status={o.status} label={t(statusKey(o.status))} />
        <StatusPill status={o.paymentStatus} label={t(statusKey(o.paymentStatus))} />
        <Text style={s.muted}>{t(PAY_LABEL[o.paymentMethod] ?? o.paymentMethod)}</Text>
      </View>
      <Text style={s.muted}>
        {new Date(o.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </Text>

      {open && (
        <View style={{ gap: 6, marginTop: 6 }}>
          {o.items.map(i => (
            <Text key={i.id} style={s.body}>
              {i.quantity}× {i.productTitleSnapshot}
              {[i.selectedColor, i.selectedSize].filter(Boolean).length
                ? ` (${[i.selectedColor, i.selectedSize].filter(Boolean).join(' · ')})`
                : ''}{' '}
              — {i.sellerNameSnapshot} · {fmtEGP(i.priceAtPurchase * i.quantity)}
            </Text>
          ))}
          {!!addr && <Text style={s.muted}>📍 {addr}</Text>}
          {!!(o.address.phone || o.user?.phone) && (
            <Pressable onPress={() => Linking.openURL(`tel:${o.address.phone || o.user?.phone}`)}>
              <Text style={s.link}>📞 {o.address.phone || o.user?.phone}</Text>
            </Pressable>
          )}
          {!!o.paymentSenderDetail && (
            <Text style={s.muted}>
              {t('Paid from {who}', { who: o.paymentSenderDetail })}
              {o.paymentReference ? ` · ${o.paymentReference}` : ''}
            </Text>
          )}
          {!!o.paymentReceiptUrl && (
            <Pressable onPress={() => Linking.openURL(absUrl(o.paymentReceiptUrl!))}>
              <Text style={s.link}>{t('View payment receipt')}</Text>
            </Pressable>
          )}
          <View style={s.btns}>
            <Btn
              label={t('Change status')}
              busy={update.isPending}
              onPress={() =>
                sheet.open({
                  title: t('Change status'),
                  options: STATUSES.filter(x => x !== o.status).map(x => ({
                    label: t(statusKey(x)),
                    danger: x === 'CANCELLED',
                    onPress: () => update.mutate({ status: x }),
                  })),
                })
              }
            />
            {o.paymentStatus !== 'PAID' && (
              <Btn
                kind="primary"
                label={t('Mark as paid')}
                busy={update.isPending}
                onPress={() => update.mutate({ paymentStatus: 'PAID' })}
              />
            )}
          </View>
          {update.isError && <Text style={s.errorText}>{(update.error as Error).message}</Text>}
        </View>
      )}
      {sheet.element}
    </Card>
  );
}
