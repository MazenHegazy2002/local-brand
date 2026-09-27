// Screen 6a — Admin overview + approvals
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

interface Stats {
  revenue: number;
  orders: number;
  users: number;
  sellers: number;
}
interface Approval {
  id: string;
  type: 'brand' | 'product';
  name: string;
  sub: string;
  initials: string;
  color: string;
}

export default function AdminOverview() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<Stats>('/api/admin/stats'),
  });

  const { data: pendingSellers } = useQuery({
    queryKey: ['admin-pending-sellers'],
    queryFn: () =>
      api.get<{ sellers: { id: string; storeName: string; user: { email: string } }[] }>(
        '/api/admin/sellers?status=PENDING_APPROVAL&limit=5'
      ),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      api.post(`/api/admin/sellers/${id}/${action}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending-sellers'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const kpis = [
    { label: 'GMV today', value: fmtEGP(data?.revenue ?? 0), trend: '+14%', up: true },
    { label: 'Orders', value: String(data?.orders ?? 0), trend: '+9%', up: true },
    { label: 'New users', value: String(data?.users ?? 0), trend: '+22%', up: true },
    { label: 'Cancel rate', value: '3.1%', trend: '+0.4%', up: false },
  ];

  const pendingApprovals: Approval[] = (pendingSellers?.sellers ?? []).map(s => ({
    id: s.id,
    type: 'brand',
    name: s.storeName,
    sub: 'Brand verification request',
    initials: s.storeName.charAt(0).toUpperCase(),
    color: colors.primary,
  }));

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.adminLabel}>ADMIN OS</Text>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Overview</Text>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.inner}>
        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          {kpis.map(({ label, value, trend, up }) => (
            <View key={label} style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{value}</Text>
              <Text style={[styles.kpiTrend, { color: up ? '#4ade80' : '#f87171' }]}>{trend}</Text>
              <Text style={styles.kpiLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Pending approvals */}
        {pendingApprovals.length > 0 && (
          <View style={styles.approvalsSection}>
            <View style={styles.approvalsHeader}>
              <Text style={styles.approvalsTitle}>Pending approvals</Text>
              <View style={styles.approvalsBadge}>
                <Text style={styles.approvalsBadgeText}>{pendingApprovals.length} left</Text>
              </View>
            </View>

            {pendingApprovals.map(item => (
              <View key={item.id} style={styles.approvalCard}>
                <View style={[styles.approvalAvatar, { backgroundColor: item.color }]}>
                  <Text style={styles.approvalAvatarText}>{item.initials}</Text>
                </View>
                <View style={styles.approvalInfo}>
                  <Text style={styles.approvalName}>{item.name}</Text>
                  <Text style={styles.approvalSub}>{item.sub}</Text>
                </View>
                <View style={styles.approvalTypeBadge}>
                  <Text style={styles.approvalTypeText}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </Text>
                </View>
                <View style={styles.approvalBtns}>
                  <Pressable
                    style={styles.rejectBtn}
                    onPress={() => approveMutation.mutate({ id: item.id, action: 'reject' })}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </Pressable>
                  <Pressable
                    style={styles.approveBtn}
                    onPress={() => approveMutation.mutate({ id: item.id, action: 'approve' })}
                  >
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgAdmin },
  header: { paddingTop: 56, paddingHorizontal: spacing.page, paddingBottom: 16 },
  adminLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: 'Outfit-Bold', fontSize: 32, color: '#fff' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74,222,128,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  liveText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#4ade80' },
  inner: { paddingHorizontal: spacing.page, paddingBottom: 40 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  kpiCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,.07)',
    borderRadius: radii.card,
    padding: 18,
  },
  kpiValue: { fontFamily: 'Outfit-Bold', fontSize: 24, color: '#fff', marginBottom: 2 },
  kpiTrend: { fontFamily: 'Inter-SemiBold', fontSize: 12, marginBottom: 6 },
  kpiLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: 'rgba(255,255,255,.45)' },
  approvalsSection: {},
  approvalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  approvalsTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  approvalsBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  approvalsBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: 'rgba(255,255,255,.7)' },
  approvalCard: {
    backgroundColor: 'rgba(255,255,255,.06)',
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 12,
  },
  approvalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  approvalAvatarText: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  approvalInfo: { marginBottom: 4 },
  approvalName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
  approvalSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,.5)',
    marginTop: 2,
  },
  approvalTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 14,
  },
  approvalTypeText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: colors.accent },
  approvalBtns: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
  approveBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
});
