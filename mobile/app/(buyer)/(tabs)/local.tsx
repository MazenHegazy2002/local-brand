// Local Brands tab — brand discovery
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';
import { MapPin } from 'lucide-react-native';

export default function Local() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['public-brands'],
    queryFn: () =>
      api.get<{ products: { brand: string; image: string; sellerId?: string }[] }>(
        '/api/export/public-products?limit=100'
      ),
  });

  const brands = Array.from(new Map((data?.products ?? []).map(p => [p.brand, p])).values());

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Local Brands</Text>
        <Text style={styles.sub}>Discover Egyptian makers</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={brands}
          keyExtractor={i => i.brand}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push(`/(buyer)/brand/${encodeURIComponent(item.sellerId ?? item.brand)}`)
              }
            >
              <Image source={{ uri: item.image }} style={styles.cardImg} contentFit="cover" />
              <View style={styles.cardInfo}>
                <MapPin size={12} color={colors.primary} strokeWidth={2} />
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.brand}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: spacing.top, paddingHorizontal: spacing.page, paddingBottom: 16 },
  title: { fontFamily: 'InstrumentSerif-Regular', fontSize: 38, color: colors.ink },
  sub: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted, marginTop: 4 },
  grid: { paddingHorizontal: spacing.page, paddingBottom: 24, gap: 12 },
  card: { flex: 1 },
  cardImg: { width: '100%', aspectRatio: 1, borderRadius: radii.cardLg, marginBottom: 8 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardName: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.ink, flex: 1 },
});
