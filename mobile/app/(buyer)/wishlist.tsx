// Screen 3d — Wishlist
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { useCart } from '@/store/cart';
import { colors, radii, spacing } from '@/lib/tokens';

const { width } = Dimensions.get('window');
const CARD_W = (width - spacing.page * 2 - 12) / 2;

interface WishItem {
  id: string;
  product: {
    id: string;
    title: string;
    basePrice: number;
    image: string;
    brand: string;
    inStock: boolean;
  };
}

export default function Wishlist() {
  const router = useRouter();
  const { add } = useCart();
  const [removing, setRemoving] = useState<string[]>([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get<{ items: WishItem[] }>('/api/wishlist?view=items'),
  });

  const items = data?.items ?? [];

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Heart size={48} color={colors.border} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>Nothing saved yet</Text>
        <Text style={styles.emptySub}>Heart items while browsing to save them here</Text>
        <Pressable style={styles.shopBtn} onPress={() => router.push('/(buyer)/shop')}>
          <Text style={styles.shopBtnText}>Browse shop</Text>
        </Pressable>
      </View>
    );
  }

  async function removeFromWishlist(itemId: string) {
    setRemoving(r => [...r, itemId]);
    try {
      // POST toggles; the item is already saved, so this removes it.
      await api.post('/api/wishlist', { productId: itemId });
      refetch();
    } finally {
      setRemoving(r => r.filter(x => x !== itemId));
    }
  }

  function moveToBag(item: WishItem) {
    add({
      productId: item.product.id,
      title: item.product.title,
      image: item.product.image,
      basePrice: item.product.basePrice,
    });
    removeFromWishlist(item.id);
    router.push('/(buyer)/bag');
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Wishlist</Text>
        <Text style={styles.count}>{items.length} items</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/(buyer)/product/${item.product.id}`)}
          >
            <View style={styles.imgWrap}>
              <Image source={{ uri: item.product.image }} style={styles.img} contentFit="cover" />
              <Pressable
                style={styles.heartBtn}
                onPress={() => removeFromWishlist(item.id)}
                disabled={removing.includes(item.id)}
              >
                <Heart size={16} color={colors.favorite} fill={colors.favorite} strokeWidth={2} />
              </Pressable>
            </View>
            <Text style={styles.name} numberOfLines={2}>
              {item.product.title}
            </Text>
            <Text style={styles.price}>{fmtEGP(item.product.basePrice)}</Text>
            <Pressable style={styles.moveBtn} onPress={() => moveToBag(item)}>
              <Text style={styles.moveBtnText}>Move to bag</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: { fontFamily: 'InstrumentSerif-Regular', fontSize: 34, color: colors.ink },
  count: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted },
  grid: { paddingHorizontal: spacing.page, paddingBottom: 32 },
  row: { gap: 12, marginBottom: 20 },
  card: { width: CARD_W },
  imgWrap: { position: 'relative', marginBottom: 8 },
  img: { width: CARD_W, height: CARD_W * 1.2, borderRadius: radii.card },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  name: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.ink,
    lineHeight: 17,
    marginBottom: 4,
  },
  price: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.primary, marginBottom: 8 },
  moveBtn: {
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: colors.ink },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.page,
    backgroundColor: colors.bg,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: colors.ink,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  shopBtn: {
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
});
