// Screen 4c — Seller Add Product
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';
import { useQueryClient } from '@tanstack/react-query';

export default function AddProduct() {
  const router = useRouter();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priceEGP: '',
    stock: '',
    sizes: '',
    colors: '',
  });

  function set(key: keyof typeof form, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    if (!form.title || !form.priceEGP) {
      Alert.alert('Missing fields', 'Title and price are required.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/seller/products', {
        title: form.title,
        description: form.description,
        priceEGP: parseFloat(form.priceEGP),
        stock: parseInt(form.stock || '0', 10),
        sizes: form.sizes
          ? form.sizes
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          : [],
        colors: form.colors
          ? form.colors
              .split(',')
              .map(c => c.trim())
              .filter(Boolean)
          : [],
      });
      qc.invalidateQueries({ queryKey: ['seller-products'] });
      Alert.alert('Saved', 'Product saved as draft. Add an image to publish it.');
      router.back();
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Add product</Text>
      </View>

      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Field label="Title *" placeholder="e.g. Linen Summer Dress">
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={v => set('title', v)}
            placeholder="Product name"
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <Field label="Description">
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.description}
            onChangeText={v => set('description', v)}
            placeholder="Describe your product…"
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
          />
        </Field>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Price (EGP) *">
              <TextInput
                style={styles.input}
                value={form.priceEGP}
                onChangeText={v => set('priceEGP', v)}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Stock">
              <TextInput
                style={styles.input}
                value={form.stock}
                onChangeText={v => set('stock', v)}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
              />
            </Field>
          </View>
        </View>

        <Field label="Sizes (comma-separated)" placeholder="">
          <TextInput
            style={styles.input}
            value={form.sizes}
            onChangeText={v => set('sizes', v)}
            placeholder="S, M, L, XL"
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <Field label="Colors (comma-separated)" placeholder="">
          <TextInput
            style={styles.input}
            value={form.colors}
            onChangeText={v => set('colors', v)}
            placeholder="Red, Blue, Black"
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <View style={styles.draftNote}>
          <Text style={styles.draftNoteText}>
            Product will be saved as a draft. You can add images and publish from the Products tab.
          </Text>
        </View>

        <Pressable
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Save draft</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: colors.bgSeller,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 60 },
  row: { flexDirection: 'row', gap: 12 },
  field: { marginBottom: 16 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.ink, marginBottom: 6 },
  input: {
    height: 50,
    borderRadius: radii.input,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  textarea: { height: 100, paddingTop: 12, textAlignVertical: 'top' },
  draftNote: {
    backgroundColor: colors.accentBg,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 20,
  },
  draftNoteText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#92400e' },
  submitBtn: {
    height: 54,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
});
