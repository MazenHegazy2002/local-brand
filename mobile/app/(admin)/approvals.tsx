// Admin Approvals queue
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

interface PendingSeller {
  id: string;
  storeName: string;
  createdAt: string;
  user?: { email: string };
}

export default function Approvals() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-pending-sellers'],
    queryFn: () =>
      api.get<{ sellers: PendingSeller[] }>('/api/admin/sellers?status=PENDING_APPROVAL&limit=50'),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/sellers/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending-sellers'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: e => Alert.alert('Couldn’t approve', (e as Error).message),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Approvals</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data?.sellers ?? []}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.type}>Seller</Text>
                <Text style={styles.name}>{item.storeName}</Text>
                {item.user?.email ? <Text style={styles.date}>{item.user.email}</Text> : null}
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Pressable
                style={styles.approveBtn}
                onPress={() => approve.mutate(item.id)}
                disabled={approve.isPending}
              >
                <Text style={styles.approveBtnText}>Approve</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No pending approvals</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgAdmin },
  header: { paddingTop: spacing.top, paddingHorizontal: spacing.page, paddingBottom: 16 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 26, color: '#fff' },
  list: { paddingHorizontal: spacing.page, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,.07)',
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 10,
  },
  type: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff', marginTop: 2 },
  date: { fontFamily: 'Inter-Regular', fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 2 },
  approveBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.button,
  },
  approveBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.ink },
  empty: {
    textAlign: 'center',
    color: 'rgba(255,255,255,.4)',
    marginTop: 40,
    fontFamily: 'Inter-Regular',
  },
});
