// Manual transfer — InstaPay / Vodafone Cash. Details come from /api/payment-methods.
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Copy, Check, Upload, ExternalLink, Phone } from 'lucide-react-native';
import { codeFields, useCart } from '@/store/cart';
import { api, fmtEGP } from '@/lib/api';
import { absUrl, uploadImage } from '@/lib/seller';
import { colors, radii, spacing } from '@/lib/tokens';

interface Details {
  INSTAPAY: {
    ipa: string;
    number: string;
    accountName: string;
    payLink: string;
    qrImageUrl: string;
  };
  VODAFONE_CASH: { number: string; accountName: string; dialShortcut: string };
}

const BRAND = {
  instapay: { title: 'InstaPay', color: '#5b2a86' },
  vodafone_cash: { title: 'Vodafone Cash', color: '#e60000' },
} as const;

export default function ManualPay() {
  const router = useRouter();
  const p = useLocalSearchParams<{
    method: 'instapay' | 'vodafone_cash';
    total: string;
    shippingMethod: string;
    addressId?: string;
    usePoints?: string;
  }>();
  const method = p.method === 'vodafone_cash' ? 'vodafone_cash' : 'instapay';
  const brand = BRAND[method];
  const { items, clear, applied, total } = useCart();
  const [sender, setSender] = useState('');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<{ uri: string; url?: string } | null>(null);
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api.get<{ details?: Details }>('/api/payment-methods'),
  });
  const ip = data?.details?.INSTAPAY;
  const vf = data?.details?.VODAFONE_CASH;

  const rows: { label: string; value?: string }[] =
    method === 'instapay'
      ? [
          { label: 'InstaPay address (IPA)', value: ip?.ipa },
          { label: 'Mobile number', value: ip?.number },
          { label: 'Account name', value: ip?.accountName },
        ]
      : [
          { label: 'Wallet number', value: vf?.number },
          { label: 'Account name', value: vf?.accountName },
        ];

  async function copy(v: string) {
    await Clipboard.setStringAsync(v);
    setCopied(v);
    setTimeout(() => setCopied(''), 2000);
  }

  async function pickReceipt() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled) return;
    const asset = res.assets[0];
    setReceipt({ uri: asset.uri });
    try {
      const url = await uploadImage(asset.uri, asset.mimeType ?? 'image/jpeg');
      setReceipt({ uri: asset.uri, url });
    } catch (e) {
      setReceipt(null);
      Alert.alert('Upload failed', (e as Error).message);
    }
  }

  async function submit() {
    if (!sender.trim() || !receipt?.url) {
      Alert.alert('Almost there', 'Enter the number you paid from and upload the receipt.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ orderId: string }>('/api/checkout', {
        paymentMethod: method,
        shippingMethod: p.shippingMethod,
        addressId: p.addressId || undefined,
        usePoints: p.usePoints === '1',
        paymentSenderDetail: sender.trim(),
        paymentReference: reference.trim() || undefined,
        paymentReceiptUrl: receipt.url,
        ...codeFields(applied, total()),
        items: items.map(i => ({
          productId: i.productId,
          qty: i.qty,
          size: i.size,
          color: i.color,
        })),
      });
      clear();
      Alert.alert(
        'Order placed!',
        `Order #${res.orderId} — we'll confirm once we verify your transfer.`
      );
      router.dismissTo('/(buyer)/(tabs)');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Pay with {brand.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: brand.color }]}>
          <Text style={styles.heroLabel}>Amount to send</Text>
          <Text style={styles.heroAmount}>{fmtEGP(Number(p.total) || 0)}</Text>
          <Text style={styles.heroSub}>Send the exact amount, then upload the receipt below.</Text>
        </View>

        <Text style={styles.sectionLabel}>1 · SEND TO</Text>
        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator color={brand.color} />
          ) : !data?.details ? (
            <Text style={styles.muted}>
              Payment details are unavailable right now. Please try again shortly.
            </Text>
          ) : (
            rows.map((r, i) => (
              <View key={r.label} style={[styles.detailRow, i > 0 && styles.divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.muted}>{r.label}</Text>
                  <Text style={styles.detailVal} selectable>
                    {r.value}
                  </Text>
                </View>
                {!!r.value && (
                  <Pressable hitSlop={8} onPress={() => copy(r.value!)} style={styles.copyBtn}>
                    {copied === r.value ? (
                      <Check size={16} color={colors.success} />
                    ) : (
                      <Copy size={16} color={colors.muted} />
                    )}
                  </Pressable>
                )}
              </View>
            ))
          )}
        </View>

        {method === 'instapay' && !!ip && (
          <View style={[styles.card, { alignItems: 'center', marginTop: 12, gap: 12 }]}>
            {!!ip.qrImageUrl && (
              <Image
                source={{ uri: absUrl(ip.qrImageUrl) }}
                style={styles.qr}
                resizeMode="contain"
              />
            )}
            <Text style={styles.muted}>Scan with the InstaPay app, or</Text>
            {!!ip.payLink && (
              <Pressable
                style={[styles.outlineBtn, { borderColor: brand.color }]}
                onPress={() => Linking.openURL(ip.payLink)}
              >
                <ExternalLink size={16} color={brand.color} />
                <Text style={[styles.outlineText, { color: brand.color }]}>Open in InstaPay</Text>
              </Pressable>
            )}
          </View>
        )}

        {method === 'vodafone_cash' && !!vf && (
          <Pressable
            style={[
              styles.outlineBtn,
              { borderColor: brand.color, marginTop: 12, alignSelf: 'stretch' },
            ]}
            onPress={() => Linking.openURL(`tel:${encodeURIComponent(vf.dialShortcut)}`)}
          >
            <Phone size={16} color={brand.color} />
            <Text style={[styles.outlineText, { color: brand.color }]}>
              Dial {vf.dialShortcut} to transfer
            </Text>
          </Pressable>
        )}

        <Text style={styles.sectionLabel}>2 · CONFIRM YOUR TRANSFER</Text>
        <View style={[styles.card, { gap: 10 }]}>
          <TextInput
            style={styles.input}
            placeholder={
              method === 'instapay'
                ? 'Your phone or InstaPay IPA *'
                : 'Wallet number you paid from *'
            }
            placeholderTextColor={colors.placeholder}
            value={sender}
            onChangeText={setSender}
          />
          <TextInput
            style={styles.input}
            placeholder="Transaction reference (optional)"
            placeholderTextColor={colors.placeholder}
            value={reference}
            onChangeText={setReference}
          />
          <Pressable style={styles.upload} onPress={pickReceipt}>
            {receipt ? (
              <>
                <Image source={{ uri: receipt.uri }} style={styles.receipt} />
                <Text style={styles.semi}>
                  {receipt.url ? 'Receipt uploaded · tap to change' : 'Uploading…'}
                </Text>
              </>
            ) : (
              <>
                <Upload size={22} color={colors.muted} />
                <Text style={styles.semi}>Upload transfer screenshot *</Text>
                <Text style={styles.muted}>JPG or PNG from your gallery</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.ctaBtn, (loading || !!(receipt && !receipt.url)) && { opacity: 0.6 }]}
          onPress={submit}
          disabled={loading || !!(receipt && !receipt.url) || items.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>I've paid · Place order</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
  },
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 140 },
  hero: { borderRadius: radii.card, padding: 20 },
  heroLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  heroAmount: { fontFamily: 'Outfit-Bold', fontSize: 34, color: '#fff', marginVertical: 4 },
  heroSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 1,
    color: colors.muted,
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  detailVal: { fontFamily: 'Inter-Bold', fontSize: 16, color: colors.ink, marginTop: 2 },
  copyBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f1efeb' },
  muted: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted, lineHeight: 19 },
  semi: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.ink },
  qr: { width: 200, height: 200 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: radii.button,
    borderWidth: 1.5,
  },
  outlineText: { fontFamily: 'Inter-Bold', fontSize: 15 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.ink,
  },
  upload: {
    alignItems: 'center',
    gap: 6,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.inputBorder,
  },
  receipt: { width: 120, height: 160, borderRadius: 8 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.page,
    paddingTop: 14,
    paddingBottom: 28,
  },
  ctaBtn: {
    height: 54,
    borderRadius: radii.button,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#fff' },
});
