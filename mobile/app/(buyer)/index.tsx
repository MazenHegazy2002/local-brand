// Screen 1a — Home
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
  ImageBackground,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bell, Search } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, spacing, radii } from '@/lib/tokens';
import { useAuth } from '@/store/auth';

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  title: string;
  titleAr: string;
  priceEGP: number;
  brand: string;
  category: string;
  image: string;
  inStock: boolean;
}

function FlashCard({ item }: { item: Product }) {
  const router = useRouter();
  return (
    <Pressable style={styles.flashCard} onPress={() => router.push(`/(buyer)/product/${item.id}`)}>
      <Image source={{ uri: item.image }} style={styles.flashImg} contentFit="cover" />
      <View style={styles.flashBadge}>
        <Text style={styles.flashBadgeText}>Sale</Text>
      </View>
      <Text style={styles.flashName} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.flashPrice}>{fmtEGP(item.priceEGP)}</Text>
    </Pressable>
  );
}

export default function Home() {
  const router = useRouter();
  const lang = useAuth(s => s.lang);
  const [countdown, setCountdown] = useState(3600);

  const { data, isLoading } = useQuery({
    queryKey: ['public-products'],
    queryFn: () => api.get<{ products: Product[] }>('/api/export/public-products?limit=30'),
  });

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(countdown / 3600);
  const m = Math.floor((countdown % 3600) / 60);
  const s = countdown % 60;

  const products = data?.products ?? [];

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <ImageBackground
            source={require('../../assets/hero-bg.jpg')}
            style={styles.heroBg}
            imageStyle={{ borderRadius: 0 }}
          >
            <View style={styles.heroGradient} />
            <View style={styles.heroHeader}>
              <Text style={styles.wordmark}>brandyy</Text>
              <View style={styles.heroActions}>
                <Pressable style={styles.heroBtn} onPress={() => router.push('/(buyer)/shop')}>
                  <Search size={20} color="#fff" strokeWidth={2} />
                </Pressable>
                <Pressable style={styles.heroBtn} onPress={() => router.push('/(buyer)/account')}>
                  <Bell size={20} color="#fff" strokeWidth={2} />
                </Pressable>
              </View>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>NEW ARRIVALS</Text>
              <Text style={styles.heroTitle}>Egyptian brands,{'\n'}crafted for you</Text>
              <Pressable style={styles.heroCtaBtn} onPress={() => router.push('/(buyer)/shop')}>
                <Text style={styles.heroCtaText}>Explore now</Text>
              </Pressable>
            </View>
          </ImageBackground>
        </View>

        {/* Content sheet */}
        <View style={styles.sheet}>
          {/* Flash Sale */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Flash Sale</Text>
            </View>
            <View style={styles.countdownChip}>
              <Text style={styles.countdownText}>
                {pad(h)}:{pad(m)}:{pad(s)}
              </Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={products.slice(0, 10)}
              keyExtractor={i => i.id}
              renderItem={({ item }) => <FlashCard item={item} />}
              contentContainerStyle={{ paddingHorizontal: spacing.page, gap: 12 }}
            />
          )}

          {/* Featured Products */}
          <Text style={[styles.sectionTitle, { marginHorizontal: spacing.page, marginTop: 28 }]}>
            New arrivals
          </Text>
          <View style={styles.grid}>
            {products.slice(10, 20).map(item => (
              <Pressable
                key={item.id}
                style={styles.gridCard}
                onPress={() => router.push(`/(buyer)/product/${item.id}`)}
              >
                <Image source={{ uri: item.image }} style={styles.gridImg} contentFit="cover" />
                <Text style={styles.gridName} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.gridPrice}>{fmtEGP(item.priceEGP)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const HERO_H = 520;
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { height: HERO_H },
  heroBg: { width, height: HERO_H },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(14,22,51,0.4)',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingTop: 56,
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
  heroCopy: { position: 'absolute', bottom: 48, left: spacing.page },
  heroKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    color: '#fff',
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 44,
    lineHeight: 50,
    color: '#fff',
    marginBottom: 20,
  },
  heroCtaBtn: {
    backgroundColor: '#fff',
    borderRadius: radii.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  heroCtaText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.ink },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -26,
    paddingTop: 24,
    minHeight: 600,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    marginBottom: 16,
  },
  sectionTitle: { fontFamily: 'Outfit-Bold', fontSize: 19, color: colors.ink },
  countdownChip: {
    backgroundColor: colors.accentBg,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countdownText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: colors.accentText },
  flashCard: { width: 128, marginBottom: 8 },
  flashImg: { width: 128, height: 160, borderRadius: radii.card, marginBottom: 6 },
  flashBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  flashBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#fff' },
  flashName: { fontFamily: 'Inter-Medium', fontSize: 12.5, color: colors.ink },
  flashPrice: { fontFamily: 'Inter-Bold', fontSize: 13, color: colors.primary },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: spacing.page,
    paddingBottom: 24,
  },
  gridCard: { width: (width - spacing.page * 2 - 12) / 2 },
  gridImg: { width: '100%', aspectRatio: 0.85, borderRadius: radii.card, marginBottom: 6 },
  gridName: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.ink },
  gridPrice: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.primary },
});
