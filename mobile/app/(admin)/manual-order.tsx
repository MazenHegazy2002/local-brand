// Admin / co-admin: add an order taken outside the app (WhatsApp, Instagram,
// phone…). It goes through the normal order flow on the server.
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ChevronDown, Trash2 } from 'lucide-react-native';
import { api, absUrl, fmtEGP } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { colors, radii, spacing } from '@/lib/tokens';
import { Header, Card, Btn, SearchBox, useOptionSheet, glass, dim, s } from '@/components/admin/ui';

interface Variant {
  id: string;
  title: string;
  price: number;
  stockCount: number;
  attributes: string | null;
}
interface Product {
  id: string;
  title: string;
  basePrice: number;
  flashSalePrice: number | null;
  seller: { storeName: string } | null;
  images: { url: string }[];
  variants: Variant[];
}
interface Line {
  key: string;
  product: Product;
  variantId: string;
  quantity: number;
  size: string;
  color: string;
}

const SOURCES = [
  ['WHATSAPP', 'WhatsApp'],
  ['INSTAGRAM', 'Instagram'],
  ['FACEBOOK', 'Facebook'],
  ['PHONE', 'Phone call'],
  ['IN_PERSON', 'In person'],
  ['OTHER', 'Other'],
] as const;
const PAYMENTS = [
  ['CASH_ON_DELIVERY', 'Cash on delivery'],
  ['INSTAPAY', 'InstaPay'],
  ['VODAFONE_CASH', 'Vodafone Cash'],
] as const;

function opts(v?: Variant) {
  try {
    const a = v?.attributes ? JSON.parse(v.attributes) : {};
    return {
      sizes: Array.isArray(a.sizes) ? (a.sizes as string[]) : [],
      colors: Array.isArray(a.colors) ? (a.colors as string[]) : [],
    };
  } catch {
    return { sizes: [] as string[], colors: [] as string[] };
  }
}

export default function ManualOrder() {
  const { t } = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const sheet = useOptionSheet();
  const [source, setSource] = useState<string>('WHATSAPP');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [payment, setPayment] = useState<string>('CASH_ON_DELIVERY');
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [known, setKnown] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);

  const { data } = useQuery({
    queryKey: ['manual-order-products', query],
    queryFn: () =>
      api.get<{ products: Product[] }>(`/api/admin/orders/manual?q=${encodeURIComponent(query)}`),
  });

  const lookup = async () => {
    const p = phone.replace(/[^\d]/g, '');
    if (p.length < 8) return;
    try {
      const r = await api.get<{ customer: { name: string; email: string } | null }>(
        `/api/admin/orders/manual?phone=${p}`
      );
      if (r.customer) {
        if (!name) setName(r.customer.name);
        if (!email && r.customer.email) setEmail(r.customer.email);
        setKnown(t('Returning customer: {name}', { name: r.customer.name }));
      } else setKnown(null);
    } catch {
      /* optional */
    }
  };

  const add = (p: Product) => {
    const v = p.variants[0];
    if (!v) return;
    const o = opts(v);
    setLines(ls => [
      ...ls,
      {
        key: `${p.id}-${Date.now()}`,
        product: p,
        variantId: v.id,
        quantity: 1,
        size: o.sizes[0] ?? '',
        color: o.colors[0] ?? '',
      },
    ]);
  };
  const update = (key: string, patch: Partial<Line>) =>
    setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)));
  const priceOf = (l: Line) =>
    l.product.flashSalePrice ??
    l.product.variants.find(v => v.id === l.variantId)?.price ??
    l.product.basePrice;
  const subtotal = lines.reduce((sum, l) => sum + priceOf(l) * l.quantity, 0);

  const create = useMutation({
    mutationFn: () =>
      api.post<{ orderId: string }>('/api/admin/orders/manual', {
        source,
        customer: { name: name.trim(), phone: phone.trim(), email: email.trim() },
        address: { street: street.trim(), city: city.trim(), governorate: governorate.trim() },
        items: lines.map(l => ({
          variantId: l.variantId,
          quantity: l.quantity,
          ...(l.size ? { selectedSize: l.size } : {}),
          ...(l.color ? { selectedColor: l.color } : {}),
        })),
        paymentMethod: payment,
        paid: payment !== 'CASH_ON_DELIVERY' && paid,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      router.back();
    },
    onError: e => setError((e as Error).message),
  });

  const submit = () => {
    setError(null);
    if (!phone.trim() || !name.trim() || !governorate.trim() || !city.trim() || !street.trim())
      return setError(t('Fill in the customer and address.'));
    if (!lines.length) return setError(t('Add at least one product.'));
    create.mutate();
  };

  const pick = (
    title: string,
    list: readonly (readonly [string, string])[],
    set: (v: string) => void
  ) =>
    sheet.open({ title, options: list.map(([v, l]) => ({ label: t(l), onPress: () => set(v) })) });
  const label = (list: readonly (readonly [string, string])[], v: string) =>
    t(list.find(x => x[0] === v)?.[1] ?? v);

  const field = (value: string, set: (v: string) => void, placeholder: string, extra = {}) => (
    <TextInput
      style={s.input}
      value={value}
      onChangeText={set}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,.35)"
      {...extra}
    />
  );

  return (
    <View style={s.root}>
      <Header title={t('New manual order')} back />
      <ScrollView contentContainerStyle={[s.list, { gap: 12 }]} keyboardShouldPersistTaps="handled">
        <Text style={s.muted}>
          {t('For orders taken on WhatsApp, Instagram, the phone or in person.')}
        </Text>

        <Card>
          <Text style={s.strong}>{t('Customer')}</Text>
          <Pressable
            style={[s.input, s.between]}
            onPress={() => pick(t('Order came from'), SOURCES, setSource)}
          >
            <Text style={s.body}>
              {t('Order came from')}: {label(SOURCES, source)}
            </Text>
            <ChevronDown size={18} color={dim} />
          </Pressable>
          {field(phone, setPhone, t('Customer phone') + ' *', {
            keyboardType: 'phone-pad',
            onBlur: lookup,
          })}
          {!!known && <Text style={[s.muted, { color: '#4ade80' }]}>{known}</Text>}
          {field(name, setName, t('Customer name') + ' *')}
          {field(email, setEmail, t('Email (optional)'), {
            keyboardType: 'email-address',
            autoCapitalize: 'none',
          })}
          {field(governorate, setGovernorate, t('Governorate') + ' *')}
          {field(city, setCity, t('City / area') + ' *')}
          {field(street, setStreet, t('Street, building, floor, apartment') + ' *')}
        </Card>

        <Card>
          <Text style={s.strong}>{t('Products')}</Text>
          {lines.map(l => {
            const v = l.product.variants.find(x => x.id === l.variantId);
            const o = opts(v);
            return (
              <View key={l.key} style={st.line}>
                <View style={s.between}>
                  <Text style={[s.body, { flex: 1 }]} numberOfLines={2}>
                    {l.product.title}
                  </Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() => setLines(ls => ls.filter(x => x.key !== l.key))}
                  >
                    <Trash2 size={18} color="#fca5a5" />
                  </Pressable>
                </View>
                <Text style={s.muted}>
                  {l.product.seller?.storeName} · {fmtEGP(priceOf(l))} · {t('Stock')}{' '}
                  {v?.stockCount ?? 0}
                </Text>
                <View style={st.chips}>
                  {l.product.variants.length > 1 && (
                    <Chip
                      text={v?.title ?? ''}
                      onPress={() =>
                        sheet.open({
                          title: t('Option'),
                          options: l.product.variants.map(x => ({
                            label: x.title,
                            onPress: () => update(l.key, { variantId: x.id }),
                          })),
                        })
                      }
                    />
                  )}
                  {o.sizes.length > 0 && (
                    <Chip
                      text={`${t('Size')}: ${l.size}`}
                      onPress={() =>
                        sheet.open({
                          title: t('Size'),
                          options: o.sizes.map(x => ({
                            label: x,
                            onPress: () => update(l.key, { size: x }),
                          })),
                        })
                      }
                    />
                  )}
                  {o.colors.length > 0 && (
                    <Chip
                      text={`${t('Colour')}: ${l.color}`}
                      onPress={() =>
                        sheet.open({
                          title: t('Colour'),
                          options: o.colors.map(x => ({
                            label: x,
                            onPress: () => update(l.key, { color: x }),
                          })),
                        })
                      }
                    />
                  )}
                  <Chip
                    text="−"
                    onPress={() => update(l.key, { quantity: Math.max(1, l.quantity - 1) })}
                  />
                  <Text style={s.strong}>{l.quantity}</Text>
                  <Chip
                    text="+"
                    onPress={() => update(l.key, { quantity: Math.min(100, l.quantity + 1) })}
                  />
                </View>
              </View>
            );
          })}
          <SearchBox value={q} onChange={setQ} placeholder={t('Search products or stores')} />
          {(data?.products ?? []).slice(0, 8).map(p => (
            <Pressable key={p.id} style={st.result} onPress={() => add(p)}>
              {p.images[0] ? (
                <Image
                  source={{ uri: absUrl(p.images[0].url) }}
                  style={st.thumb}
                  contentFit="cover"
                />
              ) : (
                <View style={st.thumb} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.body} numberOfLines={1}>
                  {p.title}
                </Text>
                <Text style={s.muted} numberOfLines={1}>
                  {p.seller?.storeName} · {fmtEGP(p.flashSalePrice ?? p.basePrice)}
                </Text>
              </View>
              <Text style={[s.strong, { color: colors.accent }]}>+ {t('Add')}</Text>
            </Pressable>
          ))}
        </Card>

        <Card>
          <Text style={s.strong}>{t('Payment')}</Text>
          <Pressable
            style={[s.input, s.between]}
            onPress={() => pick(t('Payment'), PAYMENTS, setPayment)}
          >
            <Text style={s.body}>{label(PAYMENTS, payment)}</Text>
            <ChevronDown size={18} color={dim} />
          </Pressable>
          {payment !== 'CASH_ON_DELIVERY' && (
            <Pressable style={st.check} onPress={() => setPaid(v => !v)}>
              <View style={[st.box, paid && st.boxOn]} />
              <Text style={s.body}>{t('Customer already paid')}</Text>
            </Pressable>
          )}
          {field(notes, setNotes, t('Notes (optional)'), { multiline: true, maxLength: 500 })}
        </Card>

        <Text style={s.body}>
          {t('Products')}: {fmtEGP(subtotal)}
        </Text>
        <Text style={s.muted}>{t('Shipping and VAT are added like an app order.')}</Text>
        {!!error && <Text style={[s.body, { color: '#fca5a5' }]}>{error}</Text>}
        <View style={s.btns}>
          <Btn kind="primary" label={t('Create order')} busy={create.isPending} onPress={submit} />
        </View>
        <View style={{ height: spacing.page }} />
      </ScrollView>
      {sheet.element}
    </View>
  );
}

function Chip({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable style={st.chip} onPress={onPress}>
      <Text style={s.body}>{text}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  line: { gap: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: glass },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.badge,
    backgroundColor: 'rgba(255,255,255,.1)',
  },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  thumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,.08)' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,.4)',
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
