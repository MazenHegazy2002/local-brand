// Seller More
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Globe, LogOut, ChevronRight } from 'lucide-react-native';
import { colors, radii, spacing } from '@/lib/tokens';
import { useAuth } from '@/store/auth';
import { API_BASE, useSellerStats } from '@/lib/seller';
import { StoreLogo } from '@/components/seller/StoreLogo';

const STATUS: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING_APPROVAL: 'Pending approval',
  SUSPENDED: 'Suspended',
  BANNED: 'Banned',
};

export default function More() {
  const router = useRouter();
  const signOut = useAuth(s => s.signOut);
  const { data } = useSellerStats('7d');
  const unread = data?.unreadNotifications ?? 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>More</Text>
      <View style={styles.storeCard}>
        <StoreLogo name={data?.store.name} uri={data?.store.logoUrl} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.storeName}>{data?.store.name ?? ' '}</Text>
          {!!data && (
            <Text
              style={[
                styles.status,
                { color: data.store.status === 'ACTIVE' ? colors.success : colors.accentText },
              ]}
            >
              {STATUS[data.store.status] ?? data.store.status}
            </Text>
          )}
        </View>
      </View>

      <Row
        icon={<Bell size={18} color={colors.ink} />}
        label="Notifications"
        onPress={() => router.push('/(seller)/notifications')}
      >
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread}</Text>
          </View>
        )}
      </Row>
      <Row
        icon={<Globe size={18} color={colors.ink} />}
        label="Open Seller Hub on the web"
        onPress={() => Linking.openURL(`${API_BASE}/seller-hub`)}
      />
      <Row
        icon={<LogOut size={18} color={colors.danger} />}
        label="Sign out"
        danger
        onPress={() => signOut()}
      />
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  onPress,
  danger,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      {icon}
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      {children}
      {!danger && <ChevronRight size={18} color={colors.placeholder} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  inner: { paddingTop: spacing.top, paddingHorizontal: spacing.page, paddingBottom: 40 },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 36,
    color: colors.ink,
    marginBottom: 14,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 16,
  },
  storeName: { fontFamily: 'Outfit-Bold', fontSize: 18, color: colors.ink },
  status: { fontFamily: 'Inter-SemiBold', fontSize: 12.5, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 8,
  },
  rowLabel: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 14.5, color: colors.ink },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: 11, color: '#fff' },
});
