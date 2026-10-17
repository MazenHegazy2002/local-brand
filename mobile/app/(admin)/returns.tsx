// Admin returns: approve, reject or complete return requests.
import { useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useT, statusKey } from '@/lib/i18n';
import { Header, Chips, StatusPill, Card, Btn, ListState, s } from '@/components/admin/ui';

interface Rma {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
}

export default function AdminReturns() {
  const { t } = useT();
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-returns', status],
    queryFn: () => api.get<{ items: Rma[] }>(`/api/admin/returns?status=${status}`),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/admin/returns/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-returns'] }),
  });

  return (
    <View style={s.root}>
      <Header title={t('Returns')} back />
      <Chips
        options={[
          { id: 'PENDING', label: 'Pending' },
          { id: 'APPROVED', label: 'Approved' },
          { id: 'COMPLETED', label: 'Completed' },
          { id: 'REJECTED', label: 'Rejected' },
        ]}
        value={status}
        onChange={setStatus}
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
                <Text style={s.strong}>{r.reason}</Text>
                <StatusPill status={r.status} label={t(statusKey(r.status))} />
              </View>
              {!!r.details && <Text style={s.body}>{r.details}</Text>}
              <Text style={s.muted}>{new Date(r.createdAt).toLocaleDateString()}</Text>
              <View style={s.btns}>
                {r.status === 'PENDING' && (
                  <>
                    <Btn
                      kind="danger"
                      busy={busy}
                      label={t('Reject')}
                      onPress={() => update.mutate({ id: r.id, status: 'REJECTED' })}
                    />
                    <Btn
                      kind="primary"
                      busy={busy}
                      label={t('Approve')}
                      onPress={() => update.mutate({ id: r.id, status: 'APPROVED' })}
                    />
                  </>
                )}
                {r.status === 'APPROVED' && (
                  <Btn
                    kind="primary"
                    busy={busy}
                    label={t('Mark completed')}
                    onPress={() => update.mutate({ id: r.id, status: 'COMPLETED' })}
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
