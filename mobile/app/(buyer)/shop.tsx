// Screen 2c — Shop / Discovery
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

interface Product {
  id: string;
  title: string;
  priceEGP: number;
  brand: string;
  category: string;
  image: string;
  inStock: boolean;
}
interface Category {
  id: string;
  name: string;
}

export default function Shop() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState<'all' | 'women' | 'men'>('all');

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: Category[] }>('/api/categories'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, gender],
    queryFn: () =>
      api.get<{ products: Product[] }>(
        `/api/products?search=${encodeURIComponent(search)}&limit=40`
      ),
    staleTime: 20_000,
  });

  const products = data?.products ?? [];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={18} color={colors.placeholder} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search brands & products"
              placeholderTextColor={colors.placeholder}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
          </View>
          <Pressable style={styles.filterBtn}>
            <SlidersHorizontal size={20} color={colors.ink} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Gender tabs */}
        <View style={styles.tabs}>
          {(['all', 'women', 'men'] as const).map(g => (
            <Pressable
              key={g}
              style={[styles.tab, gender === g && styles.tabActive]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.tabText, gender === g && styles.tabTextActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Categories row */}
      {cats?.categories && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catsRow}
        >
          {cats.categories.slice(0, 8).map((cat, i) => {
            const bgs = [
              '#efe9df',
              '#e8edf9',
              '#f3e7e5',
              '#ecebe6',
              '#fdf3dc',
              '#e8f4ea',
              '#f3e7f9',
              '#e7f3f9',
            ];
            return (
              <Pressable
                key={cat.id}
                style={[styles.catCard, { backgroundColor: bgs[i % bgs.length] }]}
              >
                <Text style={styles.catName}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Product grid */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={i => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/(buyer)/product/${item.id}`)}
            >
              <Image source={{ uri: item.image }} style={styles.cardImg} contentFit="cover" />
              <Text style={styles.cardBrand} numberOfLines={1}>
                {item.brand}
              </Text>
              <Text style={styles.cardName} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.cardPrice}>{fmtEGP(item.priceEGP)}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No products found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 38,
    color: colors.ink,
    marginBottom: 16,
  },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchBox: {
    flex: 1,
    height: 48,
    borderRadius: radii.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: colors.ink },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: { flexDirection: 'row', gap: 0 },
  tab: { paddingBottom: 10, marginRight: 24 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.ink },
  tabText: { fontFamily: 'Inter-Medium', fontSize: 15, color: colors.muted },
  tabTextActive: { fontFamily: 'Inter-SemiBold', color: colors.ink },
  catsRow: { paddingHorizontal: spacing.page, paddingVertical: 12, gap: 10 },
  catCard: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.cardLg },
  catName: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.ink },
  grid: { paddingHorizontal: spacing.page, paddingBottom: 24, gap: 12 },
  card: { flex: 1, maxWidth: '50%' },
  cardImg: { width: '100%', aspectRatio: 0.82, borderRadius: radii.card, marginBottom: 8 },
  cardBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardName: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.ink,
    lineHeight: 17,
    marginBottom: 4,
  },
  cardPrice: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.ink },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontFamily: 'Inter-Regular' },
});
