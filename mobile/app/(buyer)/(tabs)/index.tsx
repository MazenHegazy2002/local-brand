// Screen 1a — Home (Editorial)
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Bell, Search, Heart } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, spacing, radii } from '@/lib/tokens';
import { useAuth } from '@/store/auth';

const { width } = Dimensions.get('window');
const HERO_H = 500;

interface Product {
  id: string;
  title: string;
  basePrice: number;
  brand: string;
  category: string;
  image: string;
  inStock: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function ProductCard({ item }: { item: Product }) {
  const router = useRouter();
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/(buyer)/product/${item.id}`)}>
      <View style={styles.cardImgWrap}>
        <Image source={{ uri: item.image }} style={styles.cardImg} contentFit="cover" />
        <Pressable style={styles.cardHeart}>
          <Heart size={16} color={colors.favorite} fill={colors.favorite} strokeWidth={2} />
        </Pressable>
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardBrand} numberOfLines={1}>
        {item.brand}
      </Text>
      <Text style={styles.cardName} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.cardPrice}>{fmtEGP(item.basePrice)}</Text>
    </Pressable>
  );
}

export default function Home() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(19855); // ~5:31 flash sale

  const { data, isLoading } = useQuery({
    queryKey: ['public-products'],
    queryFn: () => api.get<{ products: Product[] }>('/api/export/public-products?limit=30'),
  });

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(countdown / 3600);
  const m = Math.floor((countdown % 3600) / 60);
  const s = countdown % 60;

  const products = data?.products ?? [];
  const heroProduct = products[0];
  const flashProducts = products.slice(0, 8);
  const newProducts = products.slice(8, 20);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {heroProduct?.image ? (
            <Image
              source={{ uri: heroProduct.image }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.navy }]} />
          )}
          <View style={styles.heroOverlay} />

          {/* Header bar */}
          <View style={styles.heroHeader}>
            <Text style={styles.wordmark}>brandyy</Text>
            <View style={styles.heroActions}>
              <Pressable style={styles.heroBtn} onPress={() => router.push('/(buyer)/(tabs)/shop')}>
                <Search size={20} color="#fff" strokeWidth={2} />
              </Pressable>
              <Pressable
                style={styles.heroBtnWrap}
                onPress={() => router.push('/notifications' as Href)}
              >
                <View style={styles.heroBtn}>
                  <Bell size={20} color="#fff" strokeWidth={2} />
                </View>
                <View style={styles.notifDot} />
              </Pressable>
            </View>
          </View>

          {/* Hero copy */}
          <View style={styles.heroCopy}>
            <Text style={styles.heroSeason}>AUTUMN / WINTER 26</Text>
            <Text style={styles.heroTitle}>Made in Egypt.{'\n'}Worn everywhere.</Text>
            <View style={styles.heroCtaRow}>
              <Pressable
                style={styles.heroCtaBtn}
                onPress={() => router.push('/(buyer)/(tabs)/shop')}
              >
                <Text style={styles.heroCtaText}>Shop the edit</Text>
              </Pressable>
              {heroProduct && (
                <Text style={styles.heroStoreName} numberOfLines={1}>
                  {heroProduct.brand}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Content sheet */}
        <View style={styles.sheet}>
          {/* Brand avatar row */}
          {!isLoading && products.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.brandsRow}
            >
              {Array.from(new Set(products.map(p => p.brand)))
                .slice(0, 8)
                .map(brand => (
                  <Pressable
                    key={brand}
                    style={styles.brandItem}
                    onPress={() => router.push(`/(buyer)/brand/${encodeURIComponent(brand)}`)}
                  >
                    <View style={styles.brandAvatar}>
                      <Text style={styles.brandAvatarText}>{brand.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.brandName} numberOfLines={1}>
                      {brand.length > 8 ? brand.slice(0, 7) + '…' : brand}
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>
          )}

          {/* Flash Sale */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Flash Sale</Text>
            <View style={styles.countdownRow}>
              {[pad(h), pad(m), pad(s)].map((v, i) => (
                <View key={i} style={styles.countUnit}>
                  <Text style={styles.countDigit}>{v}</Text>
                  {i < 2 && <Text style={styles.countSep}>:</Text>}
                </View>
              ))}
              <Pressable style={styles.seeAll}>
                <Text style={styles.seeAllText}>See all</Text>
              </Pressable>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={flashProducts}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.flashCard}
                  onPress={() => router.push(`/(buyer)/product/${item.id}`)}
                >
                  <View style={styles.flashImgWrap}>
                    <Image
                      source={{ uri: item.image }}
                      style={styles.flashImg}
                      contentFit="cover"
                    />
                    {item.category && (
                      <View style={styles.flashBadge}>
                        <Text style={styles.flashBadgeText}>{item.category}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.flashName} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.flashPrice}>{fmtEGP(item.basePrice)}</Text>
                </Pressable>
              )}
              contentContainerStyle={{ paddingHorizontal: spacing.page, gap: 12 }}
            />
          )}

          {/* New in */}
          <View style={[styles.sectionHeader, { marginTop: 28 }]}>
            <Text style={styles.sectionTitle}>New in</Text>
            <Pressable style={styles.seeAll}>
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>
          <View style={styles.grid}>
            {newProducts.map(item => (
              <ProductCard key={item.id} item={item} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { height: HERO_H, overflow: 'hidden' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,22,51,0.38)',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingTop: spacing.top,
  },
  wordmark: { fontFamily: 'Outfit-ExtraBold', fontSize: 22, color: '#fff' },
  heroActions: { flexDirection: 'row', gap: 8 },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBtnWrap: { position: 'relative' },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  heroCopy: {
    position: 'absolute',
    bottom: 36,
    left: spacing.page,
    right: spacing.page,
  },
  heroSeason: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 40,
    lineHeight: 46,
    color: '#fff',
    marginBottom: 20,
  },
  heroCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroCtaBtn: {
    backgroundColor: '#fff',
    borderRadius: radii.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  heroCtaText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.ink },
  heroStoreName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 20,
    minHeight: 600,
  },
  brandsRow: {
    paddingHorizontal: spacing.page,
    gap: 16,
    marginBottom: 24,
  },
  brandItem: { alignItems: 'center', width: 64 },
  brandAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e9f4',
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  brandAvatarText: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.primary },
  brandName: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    marginBottom: 14,
  },
  sectionTitle: { fontFamily: 'Outfit-Bold', fontSize: 19, color: colors.ink },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  countUnit: { flexDirection: 'row', alignItems: 'center' },
  countDigit: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.accentBg,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    textAlign: 'center',
  },
  countSep: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: colors.accentText,
    marginHorizontal: 2,
  },
  seeAll: { paddingLeft: 8 },
  seeAllText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.primary },
  flashCard: { width: 120, marginBottom: 8 },
  flashImgWrap: { position: 'relative', marginBottom: 6 },
  flashImg: { width: 120, height: 150, borderRadius: radii.card },
  flashBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  flashBadgeText: { fontFamily: 'Inter-Bold', fontSize: 9, color: '#fff' },
  flashName: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.ink, lineHeight: 15 },
  flashPrice: { fontFamily: 'Inter-Bold', fontSize: 13, color: colors.primary, marginTop: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: spacing.page,
    paddingBottom: 32,
  },
  card: { width: (width - spacing.page * 2 - 12) / 2 },
  cardImgWrap: { position: 'relative', marginBottom: 6 },
  cardImg: { width: '100%', aspectRatio: 0.85, borderRadius: radii.card },
  cardHeart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryBadgeText: { fontFamily: 'Inter-Bold', fontSize: 9, color: '#fff' },
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
    marginBottom: 3,
  },
  cardPrice: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.ink },
});
