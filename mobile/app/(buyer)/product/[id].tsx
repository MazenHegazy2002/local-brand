// Screen 2e — Product detail
import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, Share2, ArrowLeft, BadgeCheck, Star, Sparkles, Truck } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { useCart } from '@/store/cart';
import { colors, radii, spacing, screen } from '@/lib/tokens';
import { useT } from '@/lib/i18n';

const { width } = screen;
const GALLERY_H = 440;
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// API variants carry color/sizes in a JSON `attributes` string; flatten to one entry per size.
interface RawVariant {
  title?: string | null;
  price?: number | string | null;
  attributes?: string | null;
  stockCount?: number;
}
function flattenVariant(v: RawVariant) {
  let attr: {
    color?: string;
    size?: string;
    sizes?: string[];
    image?: string;
    imageUrl?: string;
  } = {};
  try {
    attr = JSON.parse(v.attributes ?? '{}') ?? {};
  } catch {}
  // Size-only variants ({"size":"50g"}) must not fall back to the title as a color.
  const raw = attr.color || (attr.size ? undefined : v.title) || undefined;
  const color = raw && raw.toLowerCase() !== 'default' ? raw : undefined;
  const sizes = attr.sizes?.length ? attr.sizes : attr.size ? [attr.size] : [undefined];
  const image = attr.image || attr.imageUrl || undefined;
  const price = v.price != null ? Number(v.price) : undefined;
  return sizes.map(size => ({ color, size, image, price, stockCount: v.stockCount }));
}

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
  variants?: { size?: string; color?: string; price?: number; stockCount?: number }[];
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
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
  // Variant photo not in the product gallery; shown as the first slide while its color is picked.
  const [extraImg, setExtraImg] = useState<string>();
  const galleryRef = useRef<FlatList<string>>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const p = await api.get<Product & { variants?: RawVariant[] }>(`/api/products/${id}`);
      return { ...p, variants: (p.variants ?? []).flatMap(flattenVariant) };
    },
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
  if (!product) return <Text style={{ margin: 40 }}>{t('Product not found')}</Text>;

  const baseImages = product.images?.length ? product.images.map(i => i.url) : [''];
  const images = extraImg ? [extraImg, ...baseImages] : baseImages;
  const variants = product.variants ?? [];
  const stockOf = (size: string) =>
    variants.filter(v => v.size === size).reduce((n, v) => n + (v.stockCount ?? 0), 0);
  const sizes = [...new Set(variants.map(v => v.size).filter((s): s is string => !!s))].sort(
    (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
  );
  const productColors = [...new Set(variants.map(v => v.color).filter((c): c is string => !!c))];
  const outOfStock = variants.length > 0 && variants.every(v => (v.stockCount ?? 0) <= 0);
  const brandName = product.brand || seller?.seller.storeName || '';
  const needSize = sizes.length > 0 && !selectedSize;
  // Sizes and colors can carry their own price; show and charge the picked variant's.
  const pickedColor = selectedColor ?? productColors[0];
  const picked =
    variants.find(v => v.size === selectedSize && v.color === pickedColor) ??
    variants.find(v => v.size === selectedSize) ??
    (sizes.length === 0 ? variants.find(v => v.color === pickedColor) : undefined);
  const unitPrice = picked?.price || product.basePrice;
  const rating = parseFloat(reviews?.stats.averageRating ?? '0');
  const points = product.loyaltyPointPct
    ? Math.floor((unitPrice * product.loyaltyPointPct) / 100)
    : Math.max(10, Math.floor(unitPrice * 0.1));

  function handleAddToBag() {
    add({
      productId: product!.id,
      title: product!.title,
      image: images[0],
      basePrice: unitPrice,
      size: selectedSize,
      color: pickedColor,
      brand: brandName,
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
            ref={galleryRef}
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
            <Text style={styles.tryOnText}>{t('Try it on')}</Text>
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
            <Text style={styles.price}>{fmtEGP(unitPrice)}</Text>
          </View>

          <Text style={styles.title}>{product.title.trim()}</Text>
          <View style={styles.ratingRow}>
            <Star size={14} color={colors.accent} fill={colors.accent} strokeWidth={0} />
            <Text style={styles.ratingText}>
              {rating > 0 ? rating.toFixed(1) : t('New')}
              {reviews?.stats.total ? (
                <Text style={styles.ratingCount}> · {reviews.stats.total}</Text>
              ) : null}
            </Text>
          </View>

          {productColors.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.label}>
                {t('Color')}{' '}
                <Text style={styles.labelValue}>· {selectedColor ?? productColors[0]}</Text>
              </Text>
              <View style={styles.optionRow}>
                {productColors.map((c, i) => {
                  const active = (selectedColor ?? productColors[0]) === c;
                  // Same order as the website: the variant's own photo, else the gallery photo at the color's position.
                  const uri =
                    variants.find(v => v.color === c && v.image)?.image ??
                    baseImages[i % baseImages.length];
                  return (
                    <Pressable
                      key={c}
                      onPress={() => {
                        setSelectedColor(c);
                        // Drop a size this color doesn't come in, so the price never mixes variants.
                        if (
                          selectedSize &&
                          !variants.some(v => v.color === c && v.size === selectedSize)
                        )
                          setSelectedSize(undefined);
                        const idx = baseImages.indexOf(uri);
                        setExtraImg(idx < 0 ? uri : undefined);
                        const target = idx < 0 ? 0 : idx;
                        galleryRef.current?.scrollToOffset({
                          offset: target * width,
                          animated: true,
                        });
                        setImgIdx(target);
                      }}
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
                <Text style={styles.label}>{t('Size')}</Text>
                <Text style={styles.sizeGuide}>{t('Size guide')}</Text>
              </View>
              <View style={styles.optionRow}>
                {sizes.map(s => {
                  const soldOut = stockOf(s) <= 0;
                  const active = selectedSize === s;
                  return (
                    <Pressable
                      key={s}
                      disabled={soldOut}
                      onPress={() => {
                        setSelectedSize(s);
                        // Follow the size to a color that comes in it.
                        const match = variants.find(v => v.size === s && v.color);
                        if (match && !variants.some(v => v.size === s && v.color === pickedColor))
                          setSelectedColor(match.color);
                      }}
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
              <Text style={styles.deliveryTitle}>{t('Delivery to Cairo in 2–4 days')}</Text>
              <Text style={styles.deliverySub}>
                {t('14-day escrow protection · COD available')}
              </Text>
            </View>
          </View>

          {product.description ? <Text style={styles.desc}>{product.description}</Text> : null}
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <Text style={styles.points}>{t('Earn +{n} pts', { n: points })}</Text>
        <Pressable
          style={[
            styles.addBtn,
            added && styles.addBtnDone,
            (outOfStock || needSize) && styles.addBtnOff,
          ]}
          onPress={handleAddToBag}
          disabled={outOfStock || needSize}
        >
          <Text style={styles.addBtnText}>
            {outOfStock
              ? t('Out of stock')
              : needSize
                ? t('Pick a size')
                : added
                  ? t('Added ✓')
                  : t('Add to bag')}
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
