// Seller Products
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

type Filter = 'all' | 'live' | 'draft' | 'low_stock';

interface Product {
  id: string;
  title: string;
  basePrice: number;
  published: boolean;
  image: string | null;
  totalStock: number;
  variantCount: number;
  lowStock: boolean;
  categoryName: string | null;
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'draft', label: 'Drafts' },
  { id: 'low_stock', label: 'Low stock' },
];

export default function SellerProducts() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: Filter }>();
  const [filter, setFilter] = useState<Filter>(params.filter ?? 'all');
  useEffect(() => {
    if (params.filter) setFilter(params.filter);
  }, [params.filter]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['seller-products', filter],
    queryFn: () =>
      api.get<{ products: Product[] }>(
        `/api/seller/products${filter === 'all' ? '' : `?filter=${filter}`}`
      ),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <Pressable style={styles.newBtn} onPress={() => router.push('/(seller)/add-product')}>
          <Plus size={16} color="#fff" strokeWidth={2.4} />
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {FILTERS.map(f => (
            <Pressable
              key={f.id}
              style={[styles.chip, filter === f.id && styles.chipOn]}
              onPress={() => setFilter(f.id)}
            >
              <Text style={[styles.chipText, filter === f.id && styles.chipTextOn]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={{ alignItems: 'center', marginTop: 40, gap: 8 }}>
          <Text style={styles.errorText}>{(error as Error).message}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={styles.link}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.products ?? []}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No products here yet.</Text>}
          renderItem={({ item }) => <ProductCard p={item} />}
        />
      )}
    </View>
  );
}

function ProductCard({ p }: { p: Product }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (published: boolean) =>
      api.patch<{ ok: boolean; published: boolean; error?: string }>(
        `/api/seller/products/${p.id}`,
        { published }
      ),
    onSuccess: res => {
      if (res.error) Alert.alert('Couldn’t publish', res.error);
      qc.invalidateQueries({ queryKey: ['seller-products'] });
      qc.invalidateQueries({ queryKey: ['seller-stats'] });
    },
    onError: e => Alert.alert('Couldn’t update product', (e as Error).message),
  });
  const out = p.totalStock <= 0;

  return (
    <View style={styles.card}>
      <Image source={p.image ? { uri: p.image } : null} style={styles.thumb} contentFit="cover" />
      <View style={{ flex: 1 }}>
        <Text style={styles.pTitle} numberOfLines={1}>
          {p.title}
        </Text>
        {!!p.categoryName && <Text style={styles.meta}>{p.categoryName}</Text>}
        <Text style={styles.price}>{Math.round(p.basePrice).toLocaleString('en-EG')} EGP</Text>
        <Text
          style={[
            styles.meta,
            out && { color: colors.danger },
            !out && p.lowStock && { color: colors.accentText },
          ]}
        >
          {out ? 'Out of stock' : `${p.totalStock} in stock`}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <View style={[styles.badge, { backgroundColor: p.published ? '#dcfce7' : '#eceef2' }]}>
          <Text style={[styles.badgeText, { color: p.published ? colors.success : colors.muted }]}>
            {p.published ? 'Live' : 'Draft'}
          </Text>
        </View>
        {toggle.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={p.published}
            onValueChange={v => toggle.mutate(v)}
            trackColor={{ true: colors.primary, false: '#d4d7de' }}
            thumbColor="#fff"
          />
        )}
      </View>
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
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  newBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13.5, color: '#fff' },
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
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 12,
  },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#eceef2' },
  pTitle: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.ink },
  meta: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted },
  price: { fontFamily: 'Outfit-Bold', fontSize: 14, color: colors.primary, marginVertical: 2 },
  badge: { borderRadius: radii.badge, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: 'Inter-SemiBold', fontSize: 11.5 },
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
