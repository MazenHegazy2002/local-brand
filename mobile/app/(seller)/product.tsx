// Seller product details + inline edit (design: "Seller: product details" board)
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ChevronLeft } from 'lucide-react-native';
import {
  FeeBreakdown,
  useCommissionRate,
  customerPrice,
  type FeeMode,
} from '@/components/seller/FeeBreakdown';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

interface Variant {
  id: string;
  title: string;
  sku: string;
  price: number;
  stockCount: number;
  attributes: string | null;
}
interface ProductDetail {
  id: string;
  title: string;
  description: string | null;
  basePrice: number;
  categoryId: string | null;
  condition: string | null;
  weightGrams: number | null;
  flashSalePrice: number | null;
  flashSaleEndsAt: string | null;
  flashSaleLimit: number | null;
  loyaltyPointPct: number | null;
  published: boolean;
  category: { name: string } | null;
  images: { url: string }[];
  variants: Variant[];
}

const sizesOf = (v: Variant): string[] => {
  try {
    return JSON.parse(v.attributes ?? '{}').sizes ?? [];
  } catch {
    return [];
  }
};

export default function SellerProduct() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const rate = useCommissionRate();
  const [feeMode, setFeeMode] = useState<FeeMode>('deduct');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState<Record<string, string>>({});

  const { data: p, isLoading } = useQuery({
    queryKey: ['seller-product', id],
    queryFn: () => api.get<ProductDetail>(`/api/products/${id}`),
    enabled: !!id,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['seller-product', id] });
    qc.invalidateQueries({ queryKey: ['seller-products'] });
  };

  const togglePublish = useMutation({
    mutationFn: (published: boolean) =>
      api.patch<{ error?: string }>(`/api/seller/products/${id}`, { published }),
    onSuccess: res => {
      if (res.error) Alert.alert('Couldn’t publish', res.error);
      refresh();
    },
    onError: e => Alert.alert('Couldn’t update product', (e as Error).message),
  });

  // PUT overwrites every field it gets, so send the product back whole with the edits on top.
  const save = useMutation({
    mutationFn: () => {
      const q = p!;
      return api.put(`/api/products/${id}`, {
        title: title.trim(),
        description,
        basePrice: customerPrice(Number(price), rate, feeMode),
        categoryId: q.categoryId,
        condition: q.condition,
        weightGrams: q.weightGrams,
        flashSalePrice: q.flashSalePrice,
        flashSaleEndsAt: q.flashSaleEndsAt,
        flashSaleLimit: q.flashSaleLimit,
        loyaltyPointPct: q.loyaltyPointPct,
        published: q.published,
        variants: q.variants.map(v => ({
          id: v.id,
          color: v.title,
          sizes: sizesOf(v),
          sku: v.sku,
          price: v.price,
          stockCount: Number(stock[v.id] ?? v.stockCount),
        })),
      });
    },
    onSuccess: () => {
      setEditing(false);
      refresh();
    },
    onError: e => Alert.alert('Couldn’t save', (e as Error).message),
  });

  function startEdit() {
    if (!p) return;
    setTitle(p.title);
    setPrice(String(p.basePrice));
    setDescription(p.description ?? '');
    setStock(Object.fromEntries(p.variants.map(v => [v.id, String(v.stockCount)])));
    setEditing(true);
  }

  function submit() {
    if (!title.trim()) return Alert.alert('Title is required');
    if (!(Number(price) > 0)) return Alert.alert('Enter a valid price');
    save.mutate();
  }

  if (isLoading || !p) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const totalStock = p.variants.reduce((n, v) => n + v.stockCount, 0);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.hero}>
          <Image
            source={p.images[0] ? { uri: p.images[0].url } : null}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Back">
            <ChevronLeft size={20} color={colors.ink} />
          </Pressable>
          <View style={[styles.badge, { backgroundColor: p.published ? '#dcfce7' : '#eceef2' }]}>
            <Text
              style={[styles.badgeText, { color: p.published ? colors.success : colors.muted }]}
            >
              {p.published ? 'Live' : 'Draft'}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {editing ? (
            <>
              <Text style={styles.lbl}>Title</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} />
              <Text style={styles.lbl}>Price (EGP)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
              {Number(price) > 0 && (
                <FeeBreakdown
                  price={Number(price)}
                  rate={rate}
                  mode={feeMode}
                  onMode={setFeeMode}
                />
              )}
              <Text style={styles.lbl}>Description</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </>
          ) : (
            <View>
              {!!p.category && <Text style={styles.meta}>{p.category.name}</Text>}
              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.price}>
                {Math.round(p.basePrice).toLocaleString('en-EG')} EGP
              </Text>
            </View>
          )}

          {!editing && (
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.lbl}>Stock</Text>
                <Text style={styles.statVal}>{totalStock}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.lbl}>Variants</Text>
                <Text style={styles.statVal}>{p.variants.length}</Text>
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.lbl}>Variants</Text>
            {p.variants.map(v => (
              <View key={v.id} style={styles.row}>
                <Text style={styles.rowText}>
                  {v.title}
                  {sizesOf(v).length ? ` · ${sizesOf(v).join(', ')}` : ''}
                </Text>
                {editing ? (
                  <TextInput
                    style={styles.stockInput}
                    value={stock[v.id] ?? String(v.stockCount)}
                    placeholder="0"
                    onChangeText={t => setStock(s => ({ ...s, [v.id]: t.replace(/\D/g, '') }))}
                    keyboardType="number-pad"
                  />
                ) : (
                  <Text
                    style={[
                      styles.rowVal,
                      v.stockCount <= 0 && { color: colors.danger },
                      v.stockCount > 0 && v.stockCount < 5 && { color: colors.accentText },
                    ]}
                  >
                    {v.stockCount <= 0 ? 'Out' : v.stockCount}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {!editing && !!p.description && (
            <View style={styles.card}>
              <Text style={styles.lbl}>Description</Text>
              <Text style={styles.desc}>{p.description}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bar}>
        {editing ? (
          <>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setEditing(false)}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnMain]}
              onPress={submit}
              disabled={save.isPending}
            >
              {save.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnMainText}>Save changes</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={[styles.btn, styles.btnGhost]}
              onPress={() => togglePublish.mutate(!p.published)}
              disabled={togglePublish.isPending}
            >
              <Text style={styles.btnGhostText}>{p.published ? 'Unpublish' : 'Publish'}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnMain]} onPress={startEdit}>
              <Text style={styles.btnMainText}>Edit product</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  hero: { height: 340, backgroundColor: colors.inputBorder },
  back: {
    position: 'absolute',
    top: spacing.top,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: spacing.top + 6,
    right: 16,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
  body: { padding: spacing.page, gap: 14 },
  meta: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.subtle },
  title: { fontFamily: 'InstrumentSerif-Regular', fontSize: 32, color: colors.navy },
  price: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.primary, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.card, padding: 12 },
  statVal: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink },
  lbl: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eceef2',
  },
  rowText: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.ink, flex: 1 },
  rowVal: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.ink },
  desc: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    marginTop: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.ink,
  },
  stockInput: {
    width: 70,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    textAlign: 'center',
    padding: 0,
    fontSize: 15,
    backgroundColor: colors.surface,
    fontFamily: 'Inter-SemiBold',
    color: colors.ink,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: spacing.page,
    paddingTop: 14,
    paddingBottom: 30,
  },
  btn: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { flex: 1, backgroundColor: '#eceef2' },
  btnGhostText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.ink },
  btnMain: { flex: 1.4, backgroundColor: colors.primary },
  btnMainText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
});
