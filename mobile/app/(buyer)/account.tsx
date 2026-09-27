// Screen 3e — Account
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Package,
  MapPin,
  CreditCard,
  Star,
  Bell,
  Globe,
  HelpCircle,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';
import { useAuth } from '@/store/auth';
import { colors, radii, spacing } from '@/lib/tokens';

export default function Account() {
  const { user, signOut, lang, setLang } = useAuth();
  const router = useRouter();

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const menu = [
    { Icon: Package, label: 'Orders', onPress: () => {} },
    { Icon: MapPin, label: 'Addresses', onPress: () => {} },
    { Icon: CreditCard, label: 'Payment methods', onPress: () => {} },
    { Icon: Star, label: 'Earn with Brandyy', onPress: () => {} },
    { Icon: Bell, label: 'Notifications', onPress: () => {} },
    {
      Icon: Globe,
      label: `Language: ${lang.toUpperCase()}`,
      onPress: () => setLang(lang === 'en' ? 'ar' : 'en'),
    },
    { Icon: HelpCircle, label: 'Help', onPress: () => {} },
  ];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.profile}>
          <Image
            source={{
              uri:
                user?.image ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'U')}&background=1e3b8a&color=fff`,
            }}
            style={styles.avatar}
            contentFit="cover"
          />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.loyaltyCard}>
          <Text style={styles.loyaltyLabel}>Loyalty Points</Text>
          <Text style={styles.loyaltyPoints}>0</Text>
          <Text style={styles.loyaltySub}>1 pt = 1 EGP at checkout</Text>
        </View>

        <View style={styles.menu}>
          {menu.map(({ Icon, label, onPress }) => (
            <Pressable key={label} style={styles.menuItem} onPress={onPress}>
              <Icon size={20} color={colors.muted} strokeWidth={1.8} />
              <Text style={styles.menuLabel}>{label}</Text>
              <View style={{ flex: 1 }} />
              <ChevronRight size={16} color={colors.placeholder} strokeWidth={2} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={18} color={colors.danger} strokeWidth={2} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { paddingTop: 56, paddingBottom: 40 },
  profile: { alignItems: 'center', paddingHorizontal: spacing.page, paddingBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  name: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink },
  email: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted, marginTop: 2 },
  loyaltyCard: {
    marginHorizontal: spacing.page,
    marginBottom: 24,
    backgroundColor: colors.primaryDark,
    borderRadius: radii.cardLg,
    padding: 20,
  },
  loyaltyLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: 'rgba(255,255,255,.7)' },
  loyaltyPoints: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 36,
    color: colors.accent,
    marginVertical: 4,
  },
  loyaltySub: { fontFamily: 'Inter-Regular', fontSize: 12, color: 'rgba(255,255,255,.6)' },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radii.cardLg,
    marginHorizontal: spacing.page,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: { fontFamily: 'Inter-Medium', fontSize: 15, color: colors.ink },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginHorizontal: spacing.page,
    height: 52,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  signOutText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.danger },
});
