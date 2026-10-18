// Admin disputes: review buyer complaints and record the outcome.
import { useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useT, statusKey } from '@/lib/i18n';
import {
  Header,
  Chips,
  StatusPill,
  Card,
  Btn,
  ListState,
  useOptionSheet,
  s,
} from '@/components/admin/ui';

interface Dispute {
  id: string;
  caseReference: string;
  orderId: string;
  reason: string;
  description: string | null;
  status: string;
  resolution: string | null;
  createdAt: string;
}
const NEXT = ['UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED'];

export default function AdminDisputes() {
  const { t } = useT();
  const qc = useQueryClient();
  const sheet = useOptionSheet();
  const [status, setStatus] = useState('OPEN');
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-disputes', status],
    queryFn: () => api.get<{ items: Dispute[] }>(`/api/admin/disputes?status=${status}`),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/admin/disputes/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-disputes'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  return (
    <View style={s.root}>
      <Header title={t('Disputes')} back />
      <Chips
        options={[
          { id: 'OPEN', label: 'Open' },
          { id: 'UNDER_REVIEW', label: 'Under review' },
          { id: 'RESOLVED_BUYER', label: 'Resolved buyer' },
          { id: 'RESOLVED_SELLER', label: 'Resolved seller' },
          { id: 'CLOSED', label: 'Closed' },
        ]}
        value={status}
        onChange={setStatus}
      />
      <FlatList
        data={data?.items ?? []}
        keyExtractor={d => d.id}
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
        renderItem={({ item: d }) => (
          <Card>
            <View style={s.between}>
              <Text style={s.strong}>{d.caseReference}</Text>
              <StatusPill status={d.status} label={t(statusKey(d.status))} />
            </View>
            <Text style={s.body}>{d.reason}</Text>
            {!!d.description && <Text style={s.muted}>{d.description}</Text>}
            <Text style={s.muted}>
              {t('Order #{id}', { id: d.orderId.slice(0, 8).toUpperCase() })} ·{' '}
              {new Date(d.createdAt).toLocaleDateString()}
            </Text>
            <View style={s.btns}>
              <Btn
                label={t('Update status')}
                busy={update.isPending && update.variables?.id === d.id}
                onPress={() =>
                  sheet.open({
                    title: t('Update status'),
                    options: NEXT.filter(x => x !== d.status).map(x => ({
                      label: t(statusKey(x)),
                      onPress: () => update.mutate({ id: d.id, status: x }),
                    })),
                  })
                }
              />
            </View>
          </Card>
        )}
      />
      {sheet.element}
    </View>
  );
}
