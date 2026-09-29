// Screen 4c — Seller New Product
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { X, Plus, Minus, ChevronDown } from 'lucide-react-native';
import {
  FeeBreakdown,
  useCommissionRate,
  customerPrice,
  type FeeMode,
} from '@/components/seller/FeeBreakdown';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';
import { colorHex, uploadImage } from '@/lib/seller';

interface Photo {
  key: string;
  uri: string;
  url?: string;
  failed?: boolean;
}
interface Variant {
  key: string;
  color: string;
  size: string;
  stock: number;
}
interface Category {
  id: string;
  name: string;
}

let seq = 0;
const nextKey = () => String(++seq);

export default function AddProduct() {
  const router = useRouter();
  const qc = useQueryClient();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [price, setPrice] = useState('');
  const rate = useCommissionRate();
  const [feeMode, setFeeMode] = useState<FeeMode>('add');
  const [weight, setWeight] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [adding, setAdding] = useState(false);
  const [newColor, setNewColor] = useState('');
  const [newSize, setNewSize] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<null | 'draft' | 'submit'>(null);

  const { data: cats, isLoading: catsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: Category[] }>('/api/categories'),
  });

  const uploading = photos.some(p => !p.url && !p.failed);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled) return;
    const asset = res.assets[0];
    const key = nextKey();
    setPhotos(ps => [...ps, { key, uri: asset.uri }]);
    try {
      const url = await uploadImage(asset.uri, asset.mimeType ?? 'image/jpeg');
      setPhotos(ps => ps.map(p => (p.key === key ? { ...p, url } : p)));
    } catch (e) {
      setPhotos(ps => ps.map(p => (p.key === key ? { ...p, failed: true } : p)));
      Alert.alert('Upload failed', (e as Error).message);
    }
  }

  const makeCover = (key: string) =>
    setPhotos(ps => [...ps.filter(p => p.key === key), ...ps.filter(p => p.key !== key)]);

  function addVariant() {
    if (!newColor.trim()) return;
    setVariants(vs => [
      ...vs,
      { key: nextKey(), color: newColor.trim(), size: newSize.trim(), stock: 1 },
    ]);
    setNewColor('');
    setNewSize('');
    setAdding(false);
  }
  const step = (key: string, d: number) =>
    setVariants(vs => vs.map(v => (v.key === key ? { ...v, stock: Math.max(0, v.stock + d) } : v)));

  function validate() {
    const e: Record<string, string> = {};
    if (title.trim().length < 3) e.title = 'At least 3 characters.';
    if (!(parseFloat(price) > 0)) e.price = 'Enter a price above 0.';
    if (!(parseFloat(weight) > 0)) e.weight = 'Needed for shipping.';
    if (!category) e.category = 'Pick a category.';
    const d = description.trim();
    if (d && d.length < 20) e.description = 'Leave empty or write at least 20 characters.';
    if (!variants.length) e.variants = 'Add at least one variant.';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function save(published: boolean) {
    if (uploading) {
      Alert.alert('Hold on', 'Photos are still uploading.');
      return;
    }
    if (!validate()) return;
    setSaving(published ? 'submit' : 'draft');
    try {
      const res = await api.post<{ id: string; published: boolean; publishBlockedReason?: string }>(
        '/api/seller/products',
        {
          title: title.trim(),
          titleAr: titleAr.trim() || undefined,
          description: description.trim() || undefined,
          basePrice: customerPrice(parseFloat(price), rate, feeMode),
          categoryId: category!.id,
          weightKg: parseFloat(weight),
          images: photos.filter(p => p.url).map(p => p.url!),
          variants: variants.map(v => ({
            color: v.color,
            size: v.size || undefined,
            stock: v.stock,
          })),
          published,
        }
      );
      qc.invalidateQueries({ queryKey: ['seller-products'] });
      qc.invalidateQueries({ queryKey: ['seller-stats'] });
      if (published && res.publishBlockedReason) {
        Alert.alert('Saved as draft', res.publishBlockedReason);
      }
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save', (e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <X size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>New product</Text>
        <Pressable onPress={() => save(false)} disabled={!!saving}>
          {saving === 'draft' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.draftBtn}>Save draft</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photos}
        >
          {photos.map((p, i) => (
            <Pressable
              key={p.key}
              onPress={() => makeCover(p.key)}
              onLongPress={() => makeCover(p.key)}
            >
              <Image source={{ uri: p.uri }} style={styles.photo} contentFit="cover" />
              {!p.url && (
                <View style={styles.photoOverlay}>
                  {p.failed ? (
                    <Text style={styles.failed}>Failed</Text>
                  ) : (
                    <ActivityIndicator color="#fff" />
                  )}
                </View>
              )}
              {i === 0 && (
                <View style={styles.coverTag}>
                  <Text style={styles.coverText}>Cover</Text>
                </View>
              )}
              <Pressable
                style={styles.removePhoto}
                hitSlop={8}
                onPress={() => setPhotos(ps => ps.filter(x => x.key !== p.key))}
              >
                <X size={12} color="#fff" strokeWidth={3} />
              </Pressable>
            </Pressable>
          ))}
          <Pressable style={[styles.photo, styles.addPhoto]} onPress={pickPhoto}>
            <Plus size={20} color={colors.muted} />
            <Text style={styles.addPhotoText}>Add photo</Text>
          </Pressable>
        </ScrollView>

        <Field label="Title (English)" error={errors.title}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Linen summer dress"
            placeholderTextColor={colors.placeholder}
          />
        </Field>
        <Field label="Title (Arabic)">
          <TextInput
            style={[styles.input, { textAlign: 'right', writingDirection: 'rtl' }]}
            value={titleAr}
            onChangeText={setTitleAr}
            placeholder="اسم المنتج"
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Price" error={errors.price}>
              <View style={styles.suffixWrap}>
                <TextInput
                  style={[styles.input, { paddingRight: 48 }]}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                />
                <Text style={styles.suffix}>EGP</Text>
              </View>
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Category" error={errors.category}>
              <Pressable style={[styles.input, styles.picker]} onPress={() => setCatOpen(true)}>
                <Text
                  style={[styles.pickerText, !category && { color: colors.placeholder }]}
                  numberOfLines={1}
                >
                  {category?.name ?? 'Select'}
                </Text>
                <ChevronDown size={16} color={colors.muted} />
              </Pressable>
            </Field>
          </View>
        </View>

        {Number(price) > 0 && (
          <FeeBreakdown price={Number(price)} rate={rate} mode={feeMode} onMode={setFeeMode} />
        )}

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Weight" error={errors.weight}>
              <View style={styles.suffixWrap}>
                <TextInput
                  style={[styles.input, { paddingRight: 40 }]}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="0.5"
                  placeholderTextColor={colors.placeholder}
                />
                <Text style={styles.suffix}>kg</Text>
              </View>
            </Field>
          </View>
          <View style={{ flex: 1 }} />
        </View>

        <Field label="Description (optional)" error={errors.description}>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Fabric, fit, care…"
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Variants & stock</Text>
            <Pressable onPress={() => setAdding(a => !a)} hitSlop={8}>
              <Text style={styles.addLink}>{adding ? 'Cancel' : '+ Add'}</Text>
            </Pressable>
          </View>
          {adding && (
            <View style={[styles.row, { marginBottom: 10 }]}>
              <TextInput
                style={[styles.input, { flex: 1.3 }]}
                value={newColor}
                onChangeText={setNewColor}
                placeholder="Color"
                placeholderTextColor={colors.placeholder}
                autoFocus
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newSize}
                onChangeText={setNewSize}
                placeholder="Size"
                placeholderTextColor={colors.placeholder}
                onSubmitEditing={addVariant}
              />
              <Pressable style={styles.addVarBtn} onPress={addVariant}>
                <Plus size={18} color="#fff" />
              </Pressable>
            </View>
          )}
          {variants.map(v => (
            <View key={v.key} style={styles.varRow}>
              <View style={[styles.dot, { backgroundColor: colorHex(v.color) }]} />
              <Text style={styles.varName} numberOfLines={1}>
                {v.color}
                {v.size ? ` · ${v.size}` : ''}
              </Text>
              <Pressable style={styles.stepBtn} onPress={() => step(v.key, -1)}>
                <Minus size={14} color={colors.ink} />
              </Pressable>
              <Text
                style={[
                  styles.count,
                  v.stock === 0
                    ? { color: colors.danger }
                    : v.stock <= 2
                      ? { color: colors.accentText }
                      : null,
                ]}
              >
                {v.stock}
              </Text>
              <Pressable style={styles.stepBtn} onPress={() => step(v.key, 1)}>
                <Plus size={14} color={colors.ink} />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => setVariants(vs => vs.filter(x => x.key !== v.key))}
              >
                <X size={16} color={colors.placeholder} />
              </Pressable>
            </View>
          ))}
          {!variants.length && !adding && (
            <Text style={styles.meta}>Add each color / size you sell with its stock.</Text>
          )}
          {!!errors.variants && <Text style={styles.error}>{errors.variants}</Text>}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerNote}>
          Listings go live once your store is approved and has a photo.
        </Text>
        <Pressable
          style={[styles.submit, (!!saving || uploading) && { opacity: 0.6 }]}
          onPress={() => save(true)}
          disabled={!!saving}
        >
          {saving === 'submit' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </Pressable>
      </View>

      <Modal
        visible={catOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCatOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setCatOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Category</Text>
          {catsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
          ) : (
            <FlatList
              data={cats?.categories ?? []}
              keyExtractor={c => c.id}
              ListEmptyComponent={<Text style={styles.meta}>No categories available.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.catRow}
                  onPress={() => {
                    setCategory({ id: item.id, name: item.name });
                    setCatOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.catText,
                      category?.id === item.id && {
                        color: colors.primary,
                        fontFamily: 'Inter-Bold',
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: colors.ink },
  draftBtn: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.primary },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 40 },
  photos: { gap: 10, paddingVertical: 6, marginBottom: 14 },
  photo: { width: 92, height: 92, borderRadius: 14, backgroundColor: '#e7e9ef' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failed: { fontFamily: 'Inter-Bold', fontSize: 11, color: '#fff' },
  coverTag: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(14,22,51,.85)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverText: { fontFamily: 'Inter-SemiBold', fontSize: 10.5, color: '#fff' },
  removePhoto: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#c5c9d3',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addPhotoText: { fontFamily: 'Inter-Medium', fontSize: 11.5, color: colors.muted },
  row: { flexDirection: 'row', gap: 10 },
  field: { marginBottom: 14 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 12.5, color: colors.muted, marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  textarea: { height: 96, paddingTop: 12, textAlignVertical: 'top' },
  suffixWrap: { justifyContent: 'center' },
  suffix: {
    position: 'absolute',
    right: 14,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.muted,
  },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: colors.ink },
  error: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.danger, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 14 },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontFamily: 'Outfit-Bold', fontSize: 15, color: colors.ink },
  addLink: { fontFamily: 'Inter-SemiBold', fontSize: 13.5, color: colors.primary },
  addVarBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.input,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  varRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f1f4',
  },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(0,0,0,.08)' },
  varName: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f1f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: colors.ink,
  },
  meta: { fontFamily: 'Inter-Regular', fontSize: 12.5, color: colors.muted },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.page,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerNote: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    color: colors.muted,
    lineHeight: 16,
  },
  submit: {
    height: 48,
    paddingHorizontal: 28,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.35)' },
  sheet: {
    maxHeight: '60%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: 20,
  },
  sheetTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: colors.ink, marginBottom: 8 },
  catRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f1f4' },
  catText: { fontFamily: 'Inter-Medium', fontSize: 15, color: colors.ink },
});
