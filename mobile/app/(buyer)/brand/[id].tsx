// Screen 2f — Brand page
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BadgeCheck, Star } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

const { width } = Dimensions.get('window');
const COVER_H = 230;
const CARD_W = (width - spacing.page * 2 - 12) / 2;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Tab = 'products' | 'reviews' | 'about';

interface Seller {
  storeName: string;
  description: string | null;
  logoUrl: string | null;
  averageRating: string;
  reviewCount: number;
}

interface BrandProduct {
  id: string;
  basePrice: number;
  isVerifiedLocal?: boolean;
  images: { url: string }[];
  category?: { name: string } | null;
  seller?: { storeName: string } | null;
}

// Route param is a seller id (from product page) or a brand/store name (from Home / Local).
export default function BrandPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('products');
  const [following, setFollowing] = useState(false);
  const param = decodeURIComponent(id ?? '');
  const isSellerId = UUID.test(param);

  const { data: seller, isLoading: sellerLoading } = useQuery({
    queryKey: ['seller-profile', param],
    enabled: isSellerId,
    queryFn: () => api.get<{ seller: Seller }>(`/api/seller/${param}/profile`),
  });

  const storeName = isSellerId ? seller?.seller.storeName : param;

  const { data: list, isLoading: productsLoading } = useQuery({
    queryKey: ['brand-products', storeName],
    enabled: !!storeName,
    queryFn: () =>
      api.get<{ products: BrandProduct[]; pagination?: { total: number } }>(
        `/api/products?brand=${encodeURIComponent(storeName!)}&limit=40`
      ),
  });

  if (sellerLoading || productsLoading)
    return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  const products = list?.products ?? [];
  const name = storeName || 'Brand';
  const cover = products[0]?.images?.[0]?.url;
  const rating = parseFloat(seller?.seller.averageRating ?? '0');
  const topCategory = mostCommon(products.map(p => p.category?.name).filter(Boolean) as string[]);
  const verified = isSellerId || products.some(p => p.isVerifiedLocal);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Cover */}
        <View style={styles.coverWrap}>
          {cover ? <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" /> : null}
          <View style={styles.coverShade} />
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.ink} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Info sheet */}
        <View style={styles.sheet}>
          <View style={styles.infoRow}>
            <View style={styles.logoTile}>
              {seller?.seller.logoUrl ? (
                <Image
                  source={{ uri: seller.seller.logoUrl }}
                  style={styles.logoImg}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.logoInitial}>{name.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <Pressable
              style={[styles.followBtn, following && styles.followBtnActive]}
              onPress={() => setFollowing(!following)}
            >
              <Text style={[styles.followText, following && styles.followTextActive]}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.storeName}>{name}</Text>
            {verified && (
              <BadgeCheck size={18} color="#fff" fill={colors.primary} strokeWidth={2} />
            )}
          </View>
          <Text style={styles.productCount}>
            {list?.pagination?.total ?? products.length} products on Brandy
          </Text>

          <View style={styles.chips}>
            {verified && (
              <View style={[styles.chip, styles.chipBlue]}>
                <Text style={[styles.chipText, { color: colors.primary }]}>Verified local</Text>
              </View>
            )}
            {topCategory && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{topCategory}</Text>
              </View>
            )}
            <View style={[styles.chip, styles.chipRow]}>
              <Star size={12} color={colors.accent} fill={colors.accent} strokeWidth={0} />
              <Text style={styles.chipText}>{rating > 0 ? rating.toFixed(1) : 'New'}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['products', 'reviews', 'about'] as Tab[]).map(t => (
            <Pressable
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'products' && (
          <View style={styles.grid}>
            {products.map(p => (
              <Pressable
                key={p.id}
                style={styles.card}
                onPress={() => router.push(`/(buyer)/product/${p.id}`)}
              >
                <Image
                  source={p.images?.[0]?.url ? { uri: p.images[0].url } : undefined}
                  style={styles.cardImg}
                  contentFit="cover"
                />
                <Text style={styles.cardPrice}>{fmtEGP(p.basePrice)}</Text>
              </Pressable>
            ))}
            {products.length === 0 && <Text style={styles.empty}>No products yet</Text>}
          </View>
        )}

        {tab === 'reviews' && (
          <View style={styles.section}>
            <Text style={styles.sectionText}>
              {seller?.seller.reviewCount
                ? `${seller.seller.reviewCount} reviews · ★ ${rating.toFixed(1)}`
                : 'No reviews yet.'}
            </Text>
          </View>
        )}

        {tab === 'about' && (
          <View style={styles.section}>
            <Text style={styles.sectionText}>
              {seller?.seller.description || `${name} is a verified Egyptian brand on Brandyy.`}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function mostCommon(items: string[]) {
  const counts = new Map<string, number>();
  items.forEach(i => counts.set(i, (counts.get(i) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  coverWrap: { height: COVER_H, backgroundColor: '#e8edf9' },
  cover: { width, height: COVER_H },
  coverShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,22,51,0.12)' },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: spacing.page,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    marginTop: -24,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -34,
    marginBottom: 12,
  },
  logoTile: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: colors.navy,
    borderWidth: 4,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%' },
  logoInitial: { fontFamily: 'Outfit-Bold', fontSize: 30, color: '#fff' },
  followBtn: {
    height: 40,
    paddingHorizontal: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  followText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
  followTextActive: { color: colors.ink },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  storeName: { fontFamily: 'Outfit-Bold', fontSize: 24, color: colors.ink },
  productCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: '#f4f2ee',
  },
  chipBlue: { backgroundColor: '#e8edf9' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: colors.ink },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.page,
    marginTop: 4,
  },
  tabBtn: {
    paddingBottom: 12,
    marginRight: 28,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: colors.ink },
  tabText: { fontFamily: 'Inter-Medium', fontSize: 15, color: colors.muted },
  tabTextActive: { fontFamily: 'Inter-SemiBold', color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: spacing.page },
  card: { width: CARD_W },
  cardImg: {
    width: CARD_W,
    height: CARD_W * 1.2,
    borderRadius: radii.card,
    marginBottom: 8,
    backgroundColor: '#f1ede7',
  },
  cardPrice: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.ink },
  empty: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted },
  section: { padding: spacing.page },
  sectionText: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted, lineHeight: 22 },
});
