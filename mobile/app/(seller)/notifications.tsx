// Seller Notifications (hidden route)
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function SellerNotifications() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      api.get<{ notifications: Notification[]; unreadCount: number }>('/api/notifications'),
  });
  const mark = useMutation({
    mutationFn: (body: { notificationId?: string; markAllRead?: boolean }) =>
      api.patch('/api/notifications', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['seller-stats'] });
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        {!!data?.unreadCount && (
          <Pressable onPress={() => mark.mutate({ markAllRead: true })}>
            <Text style={styles.link}>Mark all read</Text>
          </Pressable>
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : isError ? (
        <Text style={styles.error}>{(error as Error).message}</Text>
      ) : (
        <FlatList
          data={data?.notifications ?? []}
          keyExtractor={n => n.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => !item.isRead && mark.mutate({ notificationId: item.id })}
            >
              {!item.isRead && <View style={styles.dot} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.nTitle}>{item.title}</Text>
                <Text style={styles.nMsg}>{item.message}</Text>
                <Text style={styles.nDate}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 56,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
  },
  title: { flex: 1, fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink },
  link: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.primary },
  list: { paddingHorizontal: spacing.page, paddingBottom: 40, gap: 8 },
  card: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 },
  nTitle: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.ink },
  nMsg: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted, marginTop: 2 },
  nDate: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.placeholder, marginTop: 6 },
  empty: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 40,
  },
  error: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 40,
  },
});
