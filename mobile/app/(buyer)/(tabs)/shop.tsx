// Screen 2c — Shop / Discovery
import { useState, useRef } from 'react';
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
  category: string | { name: string; slug: string } | null;
  images: { url: string; isPrimary: boolean }[];
  inStock: boolean;
}
interface Category {
  id: string;
  name: string;
  slug?: string;
  _count?: { products: number };
  image?: string | null;
}

const P_MIN = 0;
const P_MAX = 5000;
const CAT_BG = ['#f5ede3', '#e8edf9', '#f9e8e8', '#e8f4e8', '#fdf3dc', '#f3e8f9', '#e8f4f9'];

function RangeSlider({
  minVal,
  maxVal,
  onMinChange,
  onMaxChange,
}: {
  minVal: number;
  maxVal: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}) {
  const trackRef = useRef<View>(null);
  const [trackWidth, setTrackWidth] = useState(1);
  const dragging = useRef<'min' | 'max' | null>(null);
  const trackX = useRef(0);

  const THUMB = 24;
  const range = P_MAX - P_MIN;
  const minLeft = ((minVal - P_MIN) / range) * (trackWidth - THUMB);
  const maxLeft = ((maxVal - P_MIN) / range) * (trackWidth - THUMB);

  const handleMove = (pageX: number) => {
    const rel = Math.max(0, Math.min(pageX - trackX.current, trackWidth - THUMB));
    const price = Math.round((P_MIN + (rel / (trackWidth - THUMB)) * range) / 100) * 100;
    if (dragging.current === 'min') onMinChange(Math.min(price, maxVal - 100));
    else if (dragging.current === 'max') onMaxChange(Math.max(price, minVal + 100));
  };

  return (
    <View
      ref={trackRef}
      style={styles.sliderTrack}
      onLayout={e => {
        setTrackWidth(e.nativeEvent.layout.width);
        // @ts-ignore
        trackRef.current?.measure((_x, _y, _w, _h, px) => {
          trackX.current = px ?? 0;
        });
      }}
      onStartShouldSetResponder={() => true}
      onResponderMove={e => handleMove(e.nativeEvent.pageX)}
      onResponderRelease={() => (dragging.current = null)}
    >
      <View style={[styles.sliderFill, { left: minLeft + THUMB / 2, width: maxLeft - minLeft }]} />
      <View
        style={[styles.sliderThumb, { left: minLeft }]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={() => (dragging.current = 'min')}
        onResponderMove={e => handleMove(e.nativeEvent.pageX)}
        onResponderRelease={() => (dragging.current = null)}
      />
      <View
        style={[styles.sliderThumb, { left: maxLeft }]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={() => (dragging.current = 'max')}
        onResponderMove={e => handleMove(e.nativeEvent.pageX)}
        onResponderRelease={() => (dragging.current = null)}
      />
    </View>
  );
}

export default function Shop() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const [priceMin, setPriceMin] = useState(P_MIN);
  const [priceMax, setPriceMax] = useState(P_MAX);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  const resetFilters = () => {
    setPriceMin(P_MIN);
    setPriceMax(P_MAX);
    setSortBy('newest');
  };

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: Category[] }>('/api/categories'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, selectedCat, priceMin, priceMax, sortBy],
    queryFn: () => {
      const sort = sortBy !== 'newest' ? sortBy : '';
      return api.get<{ products: Product[] }>(
        `/api/products?q=${encodeURIComponent(search)}&category=${selectedCat}&minPrice=${priceMin || ''}&maxPrice=${priceMax < P_MAX ? priceMax : ''}&sort=${sort}&limit=40`
      );
    },
    staleTime: 20_000,
  });

  const products = data?.products ?? [];

  const allCategories = cats?.categories ?? [];
  const resultCount = products.length;
  const showingAll = selectedCat === '' && !search;

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
              placeholder="Search brands, styles..."
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
            {[{ id: '', name: 'All' } as Category, ...allCategories].map(cat => (
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
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <Pressable onPress={resetFilters}>
              <Text style={styles.resetBtn}>Reset</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Price</Text>
          <RangeSlider
            minVal={priceMin}
            maxVal={priceMax}
            onMinChange={setPriceMin}
            onMaxChange={setPriceMax}
          />
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {priceMin === P_MIN ? `${P_MIN} EGP` : `${priceMin.toLocaleString()} EGP`}
            </Text>
            <Text style={styles.priceLabel}>{priceMax.toLocaleString()} EGP</Text>
          </View>

          <Text style={styles.sectionLabel}>Sort by</Text>
          <View style={styles.pillRow}>
            {(['newest', 'price-asc', 'price-desc'] as const).map(v => (
              <Pressable
                key={v}
                style={[styles.pill, sortBy === v && styles.pillActive]}
                onPress={() => setSortBy(v)}
              >
                <Text style={[styles.pillText, sortBy === v && styles.pillTextActive]}>
                  {v === 'newest' ? 'Newest' : v === 'price-asc' ? 'Price ↑' : 'Price ↓'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.cta} onPress={() => setFilterOpen(false)}>
            <Text style={styles.ctaText}>
              {isLoading ? 'Loading…' : `Show ${resultCount} result${resultCount !== 1 ? 's' : ''}`}
            </Text>
          </Pressable>
        </View>
      </Modal>

      {/* Category cards (All view) */}
      {showingAll ? (
        isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={allCategories}
            keyExtractor={c => c.id}
            contentContainerStyle={styles.catList}
            renderItem={({ item: cat, index }) => {
              const img = cat.image;
              return (
                <Pressable
                  style={[styles.catCard, { backgroundColor: CAT_BG[index % CAT_BG.length] }]}
                  onPress={() => setSelectedCat(cat.id)}
                >
                  <View style={styles.catCardLeft}>
                    <Text style={styles.catCardName}>{cat.name}</Text>
                    <Text style={styles.catCardCount}>{cat._count?.products ?? 0} items</Text>
                  </View>
                  {img ? (
                    <Image source={{ uri: img }} style={styles.catCardImg} contentFit="cover" />
                  ) : (
                    <View style={styles.catCardImgPlaceholder} />
                  )}
                </Pressable>
              );
            }}
          />
        )
      ) : /* Product grid */
      isLoading ? (
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
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 34,
    color: colors.ink,
    marginBottom: 12,
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

  // category cards
  catList: { paddingHorizontal: spacing.page, paddingTop: 8, paddingBottom: 32, gap: 12 },
  catCard: {
    height: 84,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  catCardLeft: { flex: 1, paddingHorizontal: 20 },
  catCardName: { fontFamily: 'Outfit-Bold', fontSize: 18, color: colors.ink, marginBottom: 4 },
  catCardCount: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted },
  catCardImg: { width: '38%', height: '100%' },
  catCardImgPlaceholder: { width: '38%', height: '100%', backgroundColor: 'rgba(0,0,0,0.06)' },

  // filter sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink },
  resetBtn: { fontFamily: 'Inter-Medium', fontSize: 15, color: colors.muted },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.ink,
    marginBottom: 14,
    marginTop: 20,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#E8E8E8',
    borderRadius: 2,
    marginHorizontal: 12,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    top: 0,
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.primary,
    top: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  priceLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.muted },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  pillActive: { borderColor: colors.primary, backgroundColor: '#EEF2FF' },
  pillText: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.ink },
  pillTextActive: { fontFamily: 'Inter-SemiBold', color: colors.primary },
  cta: {
    marginTop: 28,
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff' },

  // product grid
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
