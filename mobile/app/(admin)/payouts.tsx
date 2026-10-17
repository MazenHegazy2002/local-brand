// Admin affiliate payouts: process, pay or reject payout requests.
import { useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { useT, statusKey } from '@/lib/i18n';
import { Header, Chips, StatusPill, Card, Btn, ListState, confirm, s } from '@/components/admin/ui';

interface Payout {
  id: string;
  affiliateName: string | null;
  affiliateEmail: string | null;
  promoCode: string;
  amountEgp: number;
  method: string;
  payoutDetails: string | null;
  status: string;
  createdAt: string;
  commissionCount: number;
}

export default function AdminPayouts() {
  const { t } = useT();
  const qc = useQueryClient();
  const [status, setStatus] = useState('REQUESTED');
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-payouts', status],
    queryFn: () => api.get<{ payouts: Payout[] }>(`/api/admin/affiliate/payouts?status=${status}`),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/admin/affiliate/payouts/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payouts'] }),
  });

  return (
    <View style={s.root}>
      <Header title={t('Affiliate payouts')} back />
      <Chips
        options={[
          { id: 'REQUESTED', label: 'Requested' },
          { id: 'PROCESSING', label: 'Processing' },
          { id: 'PAID', label: 'Paid' },
          { id: 'REJECTED', label: 'Rejected' },
        ]}
        value={status}
        onChange={setStatus}
      />
      <FlatList
        data={data?.payouts ?? []}
        keyExtractor={p => p.id}
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
        renderItem={({ item: p }) => {
          const busy = update.isPending && update.variables?.id === p.id;
          const open = p.status === 'REQUESTED' || p.status === 'PROCESSING';
          return (
            <Card>
              <View style={s.between}>
                <Text style={s.amount}>{fmtEGP(Math.round(p.amountEgp))}</Text>
                <StatusPill status={p.status} label={t(statusKey(p.status))} />
              </View>
              <Text style={s.body}>
                {p.affiliateName ?? p.affiliateEmail} · {p.promoCode}
              </Text>
              <Text style={s.muted}>
                {t(statusKey(p.method))}
                {p.payoutDetails ? ` · ${p.payoutDetails}` : ''}
              </Text>
              <Text style={s.muted}>
                {t('{n} commissions', { n: p.commissionCount })} ·{' '}
                {new Date(p.createdAt).toLocaleDateString()}
              </Text>
              {open && (
                <View style={s.btns}>
                  <Btn
                    kind="danger"
                    busy={busy}
                    label={t('Reject')}
                    onPress={() => update.mutate({ id: p.id, status: 'REJECTED' })}
                  />
                  {p.status === 'REQUESTED' && (
                    <Btn
                      busy={busy}
                      label={t('Processing')}
                      onPress={() => update.mutate({ id: p.id, status: 'PROCESSING' })}
                    />
                  )}
                  <Btn
                    kind="primary"
                    busy={busy}
                    label={t('Mark as paid')}
                    onPress={() =>
                      confirm(
                        t('Mark as paid?'),
                        t('Only do this after the money has been sent.'),
                        t('Mark as paid'),
                        t('Cancel'),
                        () => update.mutate({ id: p.id, status: 'PAID' })
                      )
                    }
                  />
                </View>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}
