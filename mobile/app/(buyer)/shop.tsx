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
  Modal,
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
  basePrice: number;
  brand: string;
  category: string;
  images: { url: string; isPrimary: boolean }[];
  inStock: boolean;
}
interface Category {
  id: string;
  name: string;
}

export default function Shop() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: Category[] }>('/api/categories'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, selectedCat],
    queryFn: () =>
      api.get<{ products: Product[] }>(
        `/api/products?search=${encodeURIComponent(search)}&category=${selectedCat}&limit=40`
      ),
    staleTime: 20_000,
  });

  const products = [...(data?.products ?? [])].sort((a, b) => {
    if (sortBy === 'price_asc') return a.basePrice - b.basePrice;
    if (sortBy === 'price_desc') return b.basePrice - a.basePrice;
    return 0;
  });

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
          <Pressable style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
            <SlidersHorizontal size={20} color={colors.ink} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Category tabs from API */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabs}>
            {[{ id: '', name: 'All' }, ...(cats?.categories ?? [])].map(cat => (
              <Pressable
                key={cat.id}
                style={[styles.tab, selectedCat === cat.id && styles.tabActive]}
                onPress={() => setSelectedCat(cat.id)}
              >
                <Text style={[styles.tabText, selectedCat === cat.id && styles.tabTextActive]}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Filter sheet */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Sort & Filter</Text>
          <Text style={styles.sheetLabel}>Sort by</Text>
          {(
            [
              ['newest', 'Newest'],
              ['price_asc', 'Price: Low to High'],
              ['price_desc', 'Price: High to Low'],
            ] as const
          ).map(([val, label]) => (
            <Pressable
              key={val}
              style={[styles.sortOption, sortBy === val && styles.sortOptionActive]}
              onPress={() => {
                setSortBy(val);
                setFilterOpen(false);
              }}
            >
              <Text style={[styles.sortOptionText, sortBy === val && styles.sortOptionTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Modal>

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
              <Image
                source={{ uri: item.images?.[0]?.url }}
                style={styles.cardImg}
                contentFit="cover"
              />
              <Text style={styles.cardBrand} numberOfLines={1}>
                {item.brand}
              </Text>
              <Text style={styles.cardName} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.cardPrice}>{fmtEGP(item.basePrice)}</Text>
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
  tabsScroll: { marginTop: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.page, paddingBottom: 2 },
  tab: { paddingBottom: 10, marginRight: 24 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.ink },
  tabText: { fontFamily: 'Inter-Medium', fontSize: 15, color: colors.muted },
  tabTextActive: { fontFamily: 'Inter-SemiBold', color: colors.ink },
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 48,
  },
  sheetTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: colors.ink, marginBottom: 20 },
  sheetLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.muted, marginBottom: 10 },
  sortOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.card,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
  },
  sortOptionActive: { borderColor: colors.primary, backgroundColor: '#f5f0ff' },
  sortOptionText: { fontFamily: 'Inter-Regular', fontSize: 15, color: colors.ink },
  sortOptionTextActive: { fontFamily: 'Inter-SemiBold', color: colors.primary },
});
