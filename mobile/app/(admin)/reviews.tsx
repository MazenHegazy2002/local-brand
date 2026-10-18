// Admin reviews: publish, hide or reject product reviews.
import { useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useT, statusKey } from '@/lib/i18n';
import { Header, Chips, StatusPill, Card, Btn, ListState, s } from '@/components/admin/ui';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  verifiedPurchase: boolean;
  createdAt: string;
  user: { name: string; email: string } | null;
  product: { title: string } | null;
}

export default function AdminReviews() {
  const { t } = useT();
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-reviews', status],
    queryFn: () =>
      api.get<{ items: Review[]; counts: Record<string, number> }>(
        `/api/admin/reviews?status=${status}`
      ),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch('/api/admin/reviews', { id, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  return (
    <View style={s.root}>
      <Header title={t('Reviews')} back />
      <Chips
        options={[
          { id: 'PENDING', label: 'Pending' },
          { id: 'PUBLISHED', label: 'Published' },
          { id: 'HIDDEN', label: 'Hidden' },
          { id: 'REJECTED', label: 'Rejected' },
        ]}
        value={status}
        onChange={setStatus}
        counts={data?.counts}
      />
      <FlatList
        data={data?.items ?? []}
        keyExtractor={r => r.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />
        }
        ListEmptyComponent={
          <ListState
            loading={isLoading}
            error={error}
            onRetry={refetch}
            empty={t('Nothing here.')}
          />
        }
        renderItem={({ item: r }) => {
          const busy = update.isPending && update.variables?.id === r.id;
          return (
            <Card>
              <View style={s.between}>
                <Text style={[s.strong, { color: '#f59e0b' }]}>
                  {'★'.repeat(r.rating)}
                  <Text style={{ color: 'rgba(255,255,255,.2)' }}>{'★'.repeat(5 - r.rating)}</Text>
                </Text>
                <StatusPill status={r.status} label={t(statusKey(r.status))} />
              </View>
              {!!r.comment && <Text style={s.body}>{r.comment}</Text>}
              <Text style={s.muted}>
                {r.user?.name ?? t('Guest')} · {r.product?.title}
                {r.verifiedPurchase ? ` · ${t('Verified')}` : ''}
              </Text>
              <View style={s.btns}>
                {r.status !== 'PUBLISHED' && (
                  <Btn
                    kind="primary"
                    busy={busy}
                    label={t('Publish')}
                    onPress={() => update.mutate({ id: r.id, status: 'PUBLISHED' })}
                  />
                )}
                {r.status !== 'HIDDEN' && (
                  <Btn
                    busy={busy}
                    label={t('Hide')}
                    onPress={() => update.mutate({ id: r.id, status: 'HIDDEN' })}
                  />
                )}
                {r.status !== 'REJECTED' && (
                  <Btn
                    kind="danger"
                    busy={busy}
                    label={t('Reject')}
                    onPress={() => update.mutate({ id: r.id, status: 'REJECTED' })}
                  />
                )}
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}
