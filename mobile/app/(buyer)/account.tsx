// Screen 3e — Account + loyalty
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Package,
  MapPin,
  CreditCard,
  Percent,
  Store,
  Globe,
  HelpCircle,
  ChevronRight,
  Settings,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { api } from '@/lib/api';
import type { OrderRow } from './orders';
import type { AddressRow } from './addresses';
import { colors, radii, spacing } from '@/lib/tokens';

export default function Account() {
  const { user, signOut, lang, setLang } = useAuth();
  const router = useRouter();

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  // Same query keys as the list screens, so counts and lists share one cache.
  const orders = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<{ orders: OrderRow[] }>('/api/orders'),
  });
  const wishlist = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get<{ items: unknown[] }>('/api/wishlist'),
  });
  const addresses = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<{ addresses: AddressRow[] }>('/api/addresses'),
  });
  const count = (n?: number) => (n == null ? '–' : String(n));
  const addressCount = count(addresses.data?.addresses.length);

  const stats = [
    { label: 'Orders', value: count(orders.data?.orders.length), href: './orders' },
    { label: 'Wishlist', value: count(wishlist.data?.items.length), href: './wishlist' },
    { label: 'Addresses', value: addressCount, href: './addresses' },
  ] as const;

  const menu = [
    {
      label: 'My orders',
      Icon: Package,
      badge: null,
      hint: null,
      onPress: () => router.push('./orders'),
    },
    {
      label: 'Addresses',
      Icon: MapPin,
      badge: null,
      hint: addressCount,
      onPress: () => router.push('./addresses'),
    },
    { label: 'Payment methods', Icon: CreditCard, badge: null, hint: null, onPress: () => {} },
    {
      label: 'Earn with Brandyy (affiliate)',
      Icon: Percent,
      badge: null,
      hint: '5%',
      onPress: () => router.push('/(buyer)/affiliate'),
    },
    { label: 'Sell on Brandyy', Icon: Store, badge: null, hint: null, onPress: () => {} },
    {
      label: 'Language',
      Icon: Globe,
      badge: null,
      hint: lang === 'en' ? 'English' : 'عربي',
      onPress: () => setLang(lang === 'en' ? 'ar' : 'en'),
    },
    { label: 'Help & support', Icon: HelpCircle, badge: null, hint: null, onPress: () => {} },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.inner}>
      {/* Profile header */}
      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.name ?? 'Guest'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <Pressable style={styles.settingsBtn}>
          <Settings size={20} color={colors.muted} strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* Loyalty card */}
      <View style={styles.loyaltyCard}>
        <View style={styles.loyaltyTop}>
          <View>
            <Text style={styles.loyaltyLabel}>Brandyy points</Text>
            <Text style={styles.loyaltyPoints}>140 pts</Text>
            <Text style={styles.loyaltySub}>
              10 points per order, 5 per verified review. 1 point = 1 EGP at checkout.
            </Text>
          </View>
          <View style={styles.loyaltyEgp}>
            <Text style={styles.loyaltyEgpText}>= 140 EGP</Text>
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {stats.map(({ label, value, href }) => (
          <Pressable key={label} style={styles.statItem} onPress={() => router.push(href)}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Menu */}
      <View style={styles.menuCard}>
        {menu.map(({ label, Icon, hint, onPress }, i) => (
          <Pressable
            key={label}
            style={[styles.menuItem, i < menu.length - 1 && styles.menuItemBorder]}
            onPress={onPress}
          >
            <Text style={styles.menuLabel}>{label}</Text>
            <View style={styles.menuRight}>
              {hint && <Text style={styles.menuHint}>{hint}</Text>}
              <ChevronRight size={16} color={colors.placeholder} strokeWidth={2} />
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.signOutBtn} onPress={confirmSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { paddingTop: 56, paddingBottom: 48 },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.page,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Outfit-Bold', fontSize: 20, color: '#fff' },
  profileInfo: { flex: 1 },
  name: { fontFamily: 'Outfit-Bold', fontSize: 18, color: colors.ink },
  email: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted, marginTop: 2 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyCard: {
    marginHorizontal: spacing.page,
    marginBottom: 4,
    backgroundColor: colors.primaryDark,
    borderRadius: radii.cardLg,
    padding: 20,
  },
  loyaltyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  loyaltyLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,.65)',
    marginBottom: 4,
  },
  loyaltyPoints: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 38,
    color: colors.accent,
    marginBottom: 6,
  },
  loyaltySub: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,.5)',
    lineHeight: 15,
    maxWidth: 200,
  },
  loyaltyEgp: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  loyaltyEgpText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: 'rgba(255,255,255,.8)' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: spacing.page,
    marginTop: 12,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  menuCard: {
    marginHorizontal: spacing.page,
    backgroundColor: colors.surface,
    borderRadius: radii.cardLg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuLabel: { fontFamily: 'Inter-Medium', fontSize: 15, color: colors.ink, flex: 1 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuHint: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted },
  signOutBtn: {
    marginHorizontal: spacing.page,
    height: 48,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.muted },
});
