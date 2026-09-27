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

interface Approval {
  id: string;
  type: string;
  name: string;
  createdAt: string;
}

export default function Approvals() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-approvals'],
    queryFn: () => api.get<{ items: Approval[] }>('/api/admin/pending'),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/approve/${id}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-approvals'] }),
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
          data={data?.items ?? []}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.type}>{item.type}</Text>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Pressable style={styles.approveBtn} onPress={() => approve.mutate(item.id)}>
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
  header: { paddingTop: 56, paddingHorizontal: spacing.page, paddingBottom: 16 },
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
