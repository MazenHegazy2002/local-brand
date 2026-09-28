// My orders — list of the buyer's orders
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

export interface OrderRow {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  itemCount: number;
  title: string;
  image: string | null;
}

export default function Orders() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<{ orders: OrderRow[] }>('/api/orders'),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>My orders</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={data?.orders ?? []}
          keyExtractor={o => o.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/(buyer)/order/${item.id}`)}>
              <Image source={item.image} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.meta}>
                  {new Date(item.createdAt).toLocaleDateString()} · {item.itemCount} item
                  {item.itemCount === 1 ? '' : 's'}
                </Text>
                <Text style={styles.meta}>
                  {item.status.replace(/_/g, ' ').toLowerCase()} · {fmtEGP(item.total)}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.placeholder} strokeWidth={2} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 56,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink },
  list: { padding: spacing.page, gap: 10 },
  empty: { fontFamily: 'Inter-Regular', color: colors.muted, textAlign: 'center', marginTop: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 56, height: 56, borderRadius: radii.sm, backgroundColor: colors.border },
  name: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  meta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
});
