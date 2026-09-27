// Screen 4b — Seller Orders
import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

type Status = 'all' | 'PENDING' | 'CONFIRMED' | 'SHIPPED';

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  itemCount: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: colors.accentBg, text: '#92400e' },
  CONFIRMED: { bg: '#e8edf9', text: colors.primary },
  SHIPPED: { bg: '#dcfce7', text: colors.success },
};

export default function SellerOrders() {
  const [filter, setFilter] = useState<Status>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['seller-orders', filter],
    queryFn: () =>
      api.get<{ orders: Order[] }>(
        `/api/seller/orders${filter !== 'all' ? `?status=${filter}` : ''}`
      ),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
      </View>

      {/* Status filter chips */}
      <View style={styles.chips}>
        {(['all', 'PENDING', 'CONFIRMED', 'SHIPPED'] as Status[]).map(s => (
          <Pressable
            key={s}
            style={[styles.chip, filter === s && styles.chipActive]}
            onPress={() => setFilter(s)}
          >
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data?.orders ?? []}
          keyExtractor={o => o.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const sc = STATUS_COLORS[item.status] ?? { bg: colors.border, text: colors.muted };
            return (
              <View style={styles.orderCard}>
                <View style={styles.orderRow}>
                  <Text style={styles.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
                  <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.pillText, { color: sc.text }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={styles.orderMeta}>
                  {item.itemCount} item{item.itemCount !== 1 ? 's' : ''} · {fmtEGP(item.total)}
                </Text>
                <Text style={styles.orderDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No orders found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  header: { paddingTop: 56, paddingHorizontal: spacing.page, paddingBottom: 16 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 26, color: colors.ink },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.page, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.muted },
  chipTextActive: { color: '#fff' },
  list: { paddingHorizontal: spacing.page, paddingBottom: 40 },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 12,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderId: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  pillText: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
  orderMeta: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted },
  orderDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.placeholder, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontFamily: 'Inter-Regular' },
});
