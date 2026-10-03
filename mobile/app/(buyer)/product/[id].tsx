// Screen 2e — Product detail
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, Share2, ArrowLeft, BadgeCheck, Star, Sparkles, Truck } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { useCart } from '@/store/cart';
import { colors, radii, spacing } from '@/lib/tokens';

const { width } = Dimensions.get('window');
const GALLERY_H = 440;
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

interface Product {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  basePrice: number;
  brand: string | null;
  isVerifiedLocal: boolean;
  loyaltyPointPct: number | null;
  images: { url: string }[];
  variants?: { size?: string; color?: string; stockCount?: number }[];
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const qc = useQueryClient();
  const { data: wish } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get<{ items: { id: string }[] }>('/api/wishlist?view=items'),
  });
  const liked = !!wish?.items.some(w => w.id === id);
  const toggleLike = useMutation({
    mutationFn: () => api.post('/api/wishlist', { productId: id }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  });
  const [selectedSize, setSelectedSize] = useState<string>();
  const [selectedColor, setSelectedColor] = useState<string>();
  const [imgIdx, setImgIdx] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get<Product>(`/api/products/${id}`),
  });

  const { data: seller } = useQuery({
    queryKey: ['seller-profile', product?.sellerId],
    enabled: !!product?.sellerId,
    queryFn: () =>
      api.get<{ seller: { storeName: string } }>(`/api/seller/${product!.sellerId}/profile`),
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () =>
      api.get<{ stats: { total: number; averageRating: string } }>(
        `/api/reviews?productId=${id}&limit=1`
      ),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;
  if (!product) return <Text style={{ margin: 40 }}>Product not found</Text>;

  const images = product.images?.length ? product.images.map(i => i.url) : [''];
  const variants = product.variants ?? [];
  const stockOf = (size: string) =>
    variants.filter(v => v.size === size).reduce((n, v) => n + (v.stockCount ?? 0), 0);
  const sizes = [...new Set(variants.map(v => v.size).filter((s): s is string => !!s))].sort(
    (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
  );
  const productColors = [...new Set(variants.map(v => v.color).filter((c): c is string => !!c))];
  const outOfStock = variants.length > 0 && variants.every(v => (v.stockCount ?? 0) <= 0);
  const brandName = product.brand || seller?.seller.storeName || '';
  const rating = parseFloat(reviews?.stats.averageRating ?? '0');
  const points = product.loyaltyPointPct
    ? Math.floor((product.basePrice * product.loyaltyPointPct) / 100)
    : Math.max(10, Math.floor(product.basePrice * 0.1));

  function handleAddToBag() {
    add({
      productId: product!.id,
      title: product!.title,
      image: images[0],
      basePrice: product!.basePrice,
      size: selectedSize,
      color: selectedColor,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Gallery */}
        <View style={styles.gallery}>
          <FlatList
            data={images}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={e => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item: uri }) => (
              <Image
                source={uri ? { uri } : undefined}
                style={styles.galleryImg}
                contentFit="cover"
              />
            )}
          />

          <Pressable style={[styles.galleryBtn, { left: 16 }]} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Pressable
            style={[styles.galleryBtn, { right: 64 }]}
            onPress={() =>
              Share.share({
                message: `${process.env.EXPO_PUBLIC_API_URL ?? 'https://brandyy.shop'}/product/${id}`,
              })
            }
          >
            <Share2 size={18} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Pressable
            style={[styles.galleryBtn, { right: 16 }]}
            onPress={() => toggleLike.mutate()}
            disabled={toggleLike.isPending}
          >
            <Heart
              size={18}
              color={liked ? colors.favorite : colors.ink}
              fill={liked ? colors.favorite : 'transparent'}
              strokeWidth={2}
            />
          </Pressable>

          {images.length > 1 && (
            <View style={styles.pager}>
              {images.map((_, i) => (
                <View key={i} style={[styles.pagerDot, i === imgIdx && styles.pagerDotActive]} />
              ))}
            </View>
          )}

          <View style={styles.tryOn}>
            <Sparkles size={14} color="#fff" strokeWidth={2} />
            <Text style={styles.tryOnText}>Try it on</Text>
          </View>
        </View>

        {/* Sheet */}
        <View style={styles.sheet}>
          <View style={styles.headRow}>
            <Pressable
              style={styles.brandRow}
              onPress={() => router.push(`/(buyer)/brand/${product.sellerId}`)}
            >
              <Text style={styles.brand}>{brandName}</Text>
              {product.isVerifiedLocal || seller ? (
                <BadgeCheck size={14} color="#fff" fill={colors.primary} strokeWidth={2} />
              ) : null}
            </Pressable>
            <Text style={styles.price}>{fmtEGP(product.basePrice)}</Text>
          </View>

          <Text style={styles.title}>{product.title.trim()}</Text>
          <View style={styles.ratingRow}>
            <Star size={14} color={colors.accent} fill={colors.accent} strokeWidth={0} />
            <Text style={styles.ratingText}>
              {rating > 0 ? rating.toFixed(1) : 'New'}
              {reviews?.stats.total ? (
                <Text style={styles.ratingCount}> · {reviews.stats.total}</Text>
              ) : null}
            </Text>
          </View>

          {productColors.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.label}>
                Color <Text style={styles.labelValue}>· {selectedColor ?? productColors[0]}</Text>
              </Text>
              <View style={styles.optionRow}>
                {productColors.map((c, i) => {
                  const active = (selectedColor ?? productColors[0]) === c;
                  const uri = images[i % images.length];
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setSelectedColor(c)}
                      style={[styles.colorThumb, active && styles.colorThumbActive]}
                    >
                      <Image
                        source={uri ? { uri } : undefined}
                        style={styles.colorThumbImg}
                        contentFit="cover"
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {sizes.length > 0 && (
            <View style={styles.block}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Size</Text>
                <Text style={styles.sizeGuide}>Size guide</Text>
              </View>
              <View style={styles.optionRow}>
                {sizes.map(s => {
                  const soldOut = stockOf(s) <= 0;
                  const active = selectedSize === s;
                  return (
                    <Pressable
                      key={s}
                      disabled={soldOut}
                      onPress={() => setSelectedSize(s)}
                      style={[
                        styles.sizePill,
                        active && styles.sizePillActive,
                        soldOut && styles.sizePillOut,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sizeText,
                          active && styles.sizeTextActive,
                          soldOut && styles.sizeTextOut,
                        ]}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.delivery}>
            <View style={styles.deliveryIcon}>
              <Truck size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryTitle}>Delivery to Cairo in 2–4 days</Text>
              <Text style={styles.deliverySub}>14-day escrow protection · COD available</Text>
            </View>
          </View>

          {product.description ? <Text style={styles.desc}>{product.description}</Text> : null}
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <Text style={styles.points}>Earn +{points} pts</Text>
        <Pressable
          style={[styles.addBtn, added && styles.addBtnDone, outOfStock && styles.addBtnOff]}
          onPress={handleAddToBag}
          disabled={outOfStock}
        >
          <Text style={styles.addBtnText}>
            {outOfStock ? 'Out of stock' : added ? 'Added ✓' : 'Add to bag'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  gallery: { height: GALLERY_H, backgroundColor: '#f1ede7' },
  galleryImg: { width, height: GALLERY_H },
  galleryBtn: {
    position: 'absolute',
    top: 52,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pager: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  pagerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.55)' },
  pagerDotActive: { backgroundColor: '#fff', width: 18 },
  tryOn: {
    position: 'absolute',
    right: 16,
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(14,22,51,0.85)',
  },
  tryOnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff' },
  sheet: {
    marginTop: -22,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.page,
    paddingTop: 22,
  },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  brand: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  price: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink },
  title: { fontFamily: 'Outfit-Bold', fontSize: 24, color: colors.ink, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginBottom: 18 },
  ratingText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.ink },
  ratingCount: { fontFamily: 'Inter-Regular', color: colors.muted },
  block: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink, marginBottom: 10 },
  labelValue: { fontFamily: 'Inter-Regular', color: colors.muted },
  sizeGuide: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.primary,
    marginBottom: 10,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  colorThumbActive: { borderColor: colors.primary },
  colorThumbImg: { flex: 1, borderRadius: 9, backgroundColor: '#f1ede7' },
  sizePill: {
    minWidth: 52,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizePillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  sizePillOut: { backgroundColor: '#f4f2ee', borderColor: '#f4f2ee' },
  sizeText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  sizeTextActive: { color: '#fff' },
  sizeTextOut: { color: colors.placeholder, textDecorationLine: 'line-through' },
  delivery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginBottom: 18,
  },
  deliveryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e8edf9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  deliverySub: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  desc: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted, lineHeight: 21 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: spacing.page,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  points: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.accentText },
  addBtn: {
    flex: 1,
    height: 54,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDone: { backgroundColor: colors.success },
  addBtnOff: { backgroundColor: colors.placeholder },
  addBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
});
