// Screen 2e — Product detail
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
import { Heart, Share2, ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { useCart } from '@/store/cart';
import { colors, radii, spacing } from '@/lib/tokens';

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  title: string;
  description: string;
  priceEGP: number;
  brand: string;
  category: string;
  images: string[];
  inStock: boolean;
  sizes?: string[];
  colors?: string[];
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>();
  const [selectedColor, setSelectedColor] = useState<string>();
  const [imgIdx, setImgIdx] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get<{ product: Product }>(`/api/products/${id}`),
  });

  const product = data?.product;

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;
  if (!product) return <Text style={{ margin: 40 }}>Product not found</Text>;

  const images = product.images?.length ? product.images : ['https://placehold.co/400x500'];

  function handleAddToBag() {
    add({
      productId: product!.id,
      title: product!.title,
      image: images[0],
      priceEGP: product!.priceEGP,
      size: selectedSize,
      color: selectedColor,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <View style={styles.root}>
      {/* Gallery */}
      <View style={styles.gallery}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={e => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
          scrollEventThrottle={100}
        >
          {images.map((uri, i) => (
            <Image key={i} source={{ uri }} style={{ width, height: 470 }} contentFit="cover" />
          ))}
        </ScrollView>

        {/* Overlay buttons */}
        <Pressable style={[styles.galleryBtn, { left: 16, top: 52 }]} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Pressable style={[styles.galleryBtn, { right: 56, top: 52 }]}>
          <Share2 size={20} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Pressable style={[styles.galleryBtn, { right: 16, top: 52 }]}>
          <Heart size={20} color={colors.favorite} strokeWidth={2} />
        </Pressable>

        {/* Pager dots */}
        {images.length > 1 && (
          <View style={styles.pager}>
            {images.map((_, i) => (
              <View key={i} style={[styles.pagerDot, i === imgIdx && styles.pagerDotActive]} />
            ))}
          </View>
        )}
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetInner}>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.productTitle}>{product.title}</Text>
        <Text style={styles.price}>{fmtEGP(product.priceEGP)}</Text>

        {/* Sizes */}
        {product.sizes && product.sizes.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Size</Text>
            <View style={styles.optionRow}>
              {product.sizes.map(s => (
                <Pressable
                  key={s}
                  style={[styles.sizeBtn, selectedSize === s && styles.sizeBtnActive]}
                  onPress={() => setSelectedSize(s)}
                >
                  <Text
                    style={[styles.sizeBtnText, selectedSize === s && styles.sizeBtnTextActive]}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Escrow badge */}
        <View style={styles.escrow}>
          <ShieldCheck size={16} color={colors.success} strokeWidth={2} />
          <Text style={styles.escrowText}>
            14-day buyer protection · Escrow held until delivery
          </Text>
        </View>

        <Text style={styles.desc}>{product.description}</Text>
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.addBtn, added && styles.addBtnDone]}
          onPress={handleAddToBag}
          disabled={!product.inStock}
        >
          <Text style={styles.addBtnText}>
            {!product.inStock ? 'Out of stock' : added ? 'Added ✓' : 'Add to bag'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  gallery: { height: 470 },
  galleryBtn: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pager: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  pagerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.5)' },
  pagerDotActive: { backgroundColor: '#fff', width: 16 },
  sheet: { flex: 1, backgroundColor: colors.bg },
  sheetInner: { paddingHorizontal: spacing.page, paddingTop: 20, paddingBottom: 120 },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  productTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: colors.ink,
    lineHeight: 28,
    marginBottom: 8,
  },
  price: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink, marginBottom: 16 },
  sectionBlock: { marginBottom: 16 },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBtnActive: { borderColor: colors.primary, backgroundColor: '#e8edf9' },
  sizeBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.ink },
  sizeBtnTextActive: { color: colors.primary },
  escrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: radii.sm,
    marginBottom: 16,
  },
  escrowText: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.success, flex: 1 },
  desc: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted, lineHeight: 20 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.page,
    paddingBottom: 36,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addBtn: {
    height: 54,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDone: { backgroundColor: colors.success },
  addBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
});
