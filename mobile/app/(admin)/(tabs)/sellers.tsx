// Admin sellers: approve new stores, suspend or reactivate existing ones.
import { useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useT, statusKey } from '@/lib/i18n';
import { Header, Chips, StatusPill, Card, Btn, ListState, confirm, s } from '@/components/admin/ui';

type Filter = 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | '';
interface Seller {
  id: string;
  storeName: string;
  status: string;
  createdAt: string;
  user: { email: string } | null;
}

export default function AdminSellers() {
  const { t } = useT();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('PENDING_APPROVAL');
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-sellers', filter],
    queryFn: () =>
      api.get<{ sellers: Seller[] }>(
        `/api/admin/sellers?limit=50${filter ? `&status=${filter}` : ''}`
      ),
  });
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      api.post(`/api/admin/sellers/${id}/${action}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sellers'] });
      qc.invalidateQueries({ queryKey: ['admin-pending-sellers'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  return (
    <View style={s.root}>
      <Header title={t('Sellers')} />
      <Chips
        options={[
          { id: 'PENDING_APPROVAL', label: 'Pending approval' },
          { id: 'ACTIVE', label: 'Active' },
          { id: 'SUSPENDED', label: 'Suspended' },
          { id: '', label: 'All' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <FlatList
        data={data?.sellers ?? []}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />
        }
        ListEmptyComponent={
          <ListState
            loading={isLoading}
            error={error}
            onRetry={refetch}
            empty={t('No sellers here.')}
          />
        }
        renderItem={({ item }) => {
          const busy = act.isPending && act.variables?.id === item.id;
          return (
            <Card>
              <View style={s.between}>
                <Text style={s.strong}>{item.storeName}</Text>
                <StatusPill status={item.status} label={t(statusKey(item.status))} />
              </View>
              {!!item.user?.email && <Text style={s.body}>{item.user.email}</Text>}
              <Text style={s.muted}>
                {t('Joined {date}', { date: new Date(item.createdAt).toLocaleDateString() })}
              </Text>
              <View style={s.btns}>
                {item.status !== 'ACTIVE' && (
                  <Btn
                    kind="primary"
                    busy={busy}
                    label={item.status === 'PENDING_APPROVAL' ? t('Approve') : t('Reactivate')}
                    onPress={() => act.mutate({ id: item.id, action: 'approve' })}
                  />
                )}
                {item.status !== 'SUSPENDED' && item.status !== 'BANNED' && (
                  <Btn
                    kind="danger"
                    busy={busy}
                    label={item.status === 'PENDING_APPROVAL' ? t('Reject') : t('Suspend')}
                    onPress={() =>
                      confirm(
                        t('Suspend {name}?', { name: item.storeName }),
                        t('Their products stop selling until you reactivate the store.'),
                        t('Suspend'),
                        t('Cancel'),
                        () => act.mutate({ id: item.id, action: 'reject' })
                      )
                    }
                  />
                )}
              </View>
            </Card>
          );
        }}
      />
      {act.isError && <Text style={s.errorText}>{(act.error as Error).message}</Text>}
    </View>
  );
}
