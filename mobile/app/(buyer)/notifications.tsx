// Screen 3f — Notifications
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { colors, spacing } from '@/lib/tokens';

interface Notif {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// The Notification model has no type column, so pick the icon from the title.
function iconFor(title: string): [string, string] {
  const t = title.toLowerCase();
  if (/deliver|ship|order/.test(t)) return ['🚚', '#f1f5f9'];
  if (/sale|deal|%/.test(t)) return ['%', colors.accentBg];
  if (/price/.test(t)) return ['↓', '#f0fdf4'];
  if (/point/.test(t)) return ['★', '#fef3c7'];
  if (/question|answer/.test(t)) return ['?', '#f4f4f4'];
  return ['B', '#e8edf9'];
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString();
}

export default function Notifications() {
  const router = useRouter();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ notifications: Notif[] }>('/api/notifications'),
  });

  async function markAllRead() {
    await api.patch('/api/notifications', { markAllRead: true });
    refetch();
  }

  async function markRead(id: string) {
    await api.patch('/api/notifications', { notificationId: id });
    refetch();
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={markAllRead}>
          <Text style={styles.markAll}>Mark all read</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={data?.notifications ?? []}
          keyExtractor={n => n.id}
          contentContainerStyle={styles.inner}
          ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
          renderItem={({ item: n }) => {
            const [icon, iconBg] = iconFor(n.title);
            return (
              <Pressable
                style={[styles.item, !n.isRead && styles.itemUnread]}
                onPress={() => !n.isRead && markRead(n.id)}
              >
                <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                  <Text style={styles.icon}>{icon}</Text>
                </View>
                <View style={styles.content}>
                  <View style={styles.topRow}>
                    <Text
                      style={[styles.notifTitle, !n.isRead && styles.notifTitleBold]}
                      numberOfLines={1}
                    >
                      {n.title}
                    </Text>
                    <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
                  </View>
                  <Text style={styles.body} numberOfLines={2}>
                    {n.message}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink, flex: 1, marginLeft: 8 },
  markAll: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.primary },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 32 },
  empty: { fontFamily: 'Inter-Regular', color: colors.muted, textAlign: 'center', marginTop: 40 },
  item: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemUnread: { backgroundColor: 'rgba(30,59,138,0.05)' },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
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
