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
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

const { width } = Dimensions.get('window');
const COVER_H = 200;
const CARD_W = (width - spacing.page * 2 - 12) / 2;

type Tab = 'products' | 'reviews' | 'about';

export default function BrandPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('products');
  const [following, setFollowing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['seller', id],
    queryFn: () =>
      api.get<{
        storeName: string;
        description: string;
        logo: string;
        cover: string;
        totalProducts: number;
        rating: number;
        badges: string[];
        products: { id: string; title: string; priceEGP: number; image: string }[];
      }>(`/api/seller/${id}/profile`),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  const brand = data ?? {
    storeName: 'Brandy Store',
    description: '',
    logo: '',
    cover: '',
    totalProducts: 100,
    rating: 4.8,
    badges: ['Verified local', 'Pharma'],
    products: [],
  };

  const initial = brand.storeName.charAt(0).toUpperCase();

  return (
    <View style={styles.root}>
      <ScrollView stickyHeaderIndices={[1]}>
        {/* Cover */}
        <View style={styles.coverWrap}>
          {brand.cover ? (
            <Image source={{ uri: brand.cover }} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, { backgroundColor: '#e8edf9' }]} />
          )}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.ink} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Brand info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.logoWrap}>
              {brand.logo ? (
                <Image source={{ uri: brand.logo }} style={styles.logo} contentFit="cover" />
              ) : (
                <View style={[styles.logo, styles.logoFallback]}>
                  <Text style={styles.logoInitial}>{initial}</Text>
                </View>
              )}
            </View>
            <Pressable
              style={[styles.followBtn, following && styles.followBtnActive]}
              onPress={() => setFollowing(!following)}
            >
              <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.storeName}>{brand.storeName}</Text>
            <CheckCircle size={16} color={colors.primary} fill={colors.primary} strokeWidth={0} />
          </View>
          <Text style={styles.productCount}>{brand.totalProducts} products on Brandy</Text>

          <View style={styles.badges}>
            {brand.badges.map(b => (
              <View key={b} style={styles.badge}>
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ))}
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {brand.rating.toFixed(1)}</Text>
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

        {/* Products grid */}
        {tab === 'products' && (
          <View style={styles.grid}>
            {brand.products.map(p => (
              <Pressable
                key={p.id}
                style={styles.card}
                onPress={() => router.push(`/(buyer)/product/${p.id}`)}
              >
                <Image source={{ uri: p.image }} style={styles.cardImg} contentFit="cover" />
                <Text style={styles.cardPrice}>{fmtEGP(p.priceEGP)}</Text>
              </Pressable>
            ))}
            {brand.products.length === 0 && <Text style={styles.empty}>No products yet</Text>}
          </View>
        )}

        {tab === 'about' && (
          <View style={styles.aboutSection}>
            <Text style={styles.aboutText}>
              {brand.description || `${brand.storeName} is a verified Egyptian brand on Brandyy.`}
            </Text>
          </View>
        )}

        {tab === 'reviews' && (
          <View style={styles.aboutSection}>
            <Text style={styles.aboutText}>No reviews yet.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  coverWrap: { height: COVER_H, position: 'relative' },
  cover: { width, height: COVER_H },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: spacing.page,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: { paddingHorizontal: spacing.page, paddingBottom: 16, backgroundColor: colors.bg },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -28,
    marginBottom: 12,
  },
  logoWrap: {
    borderWidth: 3,
    borderColor: colors.bg,
    borderRadius: 16,
  },
  logo: { width: 68, height: 68, borderRadius: 14 },
  logoFallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoInitial: { fontFamily: 'Outfit-Bold', fontSize: 26, color: '#fff' },
  followBtn: {
    height: 38,
    paddingHorizontal: 20,
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
  followBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
  followBtnTextActive: { color: colors.ink },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  storeName: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink },
  productCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
    marginBottom: 10,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  badgeText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: colors.muted },
  ratingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ratingText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: colors.accentText },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.page,
  },
  tabBtn: {
    paddingBottom: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: colors.ink },
  tabText: { fontFamily: 'Inter-Medium', fontSize: 15, color: colors.muted },
  tabTextActive: { fontFamily: 'Inter-SemiBold', color: colors.ink },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: spacing.page,
  },
  card: { width: CARD_W },
  cardImg: { width: CARD_W, height: CARD_W * 1.15, borderRadius: radii.card, marginBottom: 6 },
  cardPrice: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.ink },
  empty: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted, margin: spacing.page },
  aboutSection: { padding: spacing.page },
  aboutText: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted, lineHeight: 22 },
});
