// Screen 3f — Notifications
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { colors, radii, spacing } from '@/lib/tokens';

interface Notif {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const MOCK: Notif[] = [
  {
    id: '1',
    icon: '🚚',
    iconBg: '#f1f5f9',
    title: 'Your order is out for delivery',
    body: 'Order #BR-20417 arrives today by 6 pm.',
    time: '9 am',
    read: false,
  },
  {
    id: '2',
    icon: '%',
    iconBg: colors.accentBg,
    title: 'Flash sale is live',
    body: 'New deals from Brandy Store.',
    time: '8 am',
    read: false,
  },
  {
    id: '3',
    icon: '↓',
    iconBg: '#f0fdf4',
    title: 'Price drop on your wishlist',
    body: 'Natural Eucalyptus Vapor Chest Rub – 50g is now 109 EGP.',
    time: 'Yesterday',
    read: true,
  },
  {
    id: '4',
    icon: '★',
    iconBg: '#fef3c7',
    title: 'You earned 10 points',
    body: 'For order #BR-20388. Balance: 140 pts.',
    time: 'Yesterday',
    read: true,
  },
  {
    id: '5',
    icon: 'B',
    iconBg: '#e8edf9',
    title: 'Brandy Store dropped new pieces',
    body: '6 new jackets from a brand you follow.',
    time: 'Fri',
    read: true,
  },
  {
    id: '6',
    icon: '?',
    iconBg: '#f4f4f4',
    title: 'Your question was answered',
    body: 'The brand replied to your sizing question.',
    time: 'Thu',
    read: true,
  },
];

export default function Notifications() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable>
          <Text style={styles.markAll}>Mark all read</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.inner}>
        {MOCK.map(notif => (
          <Pressable key={notif.id} style={[styles.item, !notif.read && styles.itemUnread]}>
            <View style={[styles.iconWrap, { backgroundColor: notif.iconBg }]}>
              <Text style={styles.icon}>{notif.icon}</Text>
            </View>
            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text
                  style={[styles.notifTitle, !notif.read && styles.notifTitleBold]}
                  numberOfLines={1}
                >
                  {notif.title}
                </Text>
                <Text style={styles.time}>{notif.time}</Text>
              </View>
              <Text style={styles.body} numberOfLines={2}>
                {notif.body}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink, flex: 1, marginLeft: 8 },
  markAll: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.primary },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 32 },
  item: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemUnread: { backgroundColor: 'rgba(30,59,138,0.03)' },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: { fontSize: 18 },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 3 },
  notifTitle: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.ink, flex: 1 },
  notifTitleBold: { fontFamily: 'Inter-SemiBold' },
  time: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted, flexShrink: 0 },
  body: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted, lineHeight: 18 },
});
