// Admin users: search, filter by role, suspend / reactivate / change role.
import { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import {
  Header,
  Chips,
  SearchBox,
  StatusPill,
  Card,
  Btn,
  ListState,
  useOptionSheet,
  confirm,
  s,
} from '@/components/admin/ui';
import { useAuth } from '@/store/auth';

type Role = '' | 'BUYER' | 'SELLER' | 'AFFILIATE' | 'ADMIN';
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  loyaltyPoints: number;
  createdAt: string;
  emailVerified: string | null;
  _count: { orders: number };
}
const ROLE_LABEL: Record<string, string> = {
  BUYER: 'Buyer',
  SELLER: 'Seller',
  ADMIN: 'Admin',
  AFFILIATE: 'Affiliate',
};

export default function AdminUsers() {
  const { t } = useT();
  const me = useAuth(st => st.user?.id);
  const qc = useQueryClient();
  const sheet = useOptionSheet();
  const [role, setRole] = useState<Role>('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-users', role, q],
    queryFn: () =>
      api.get<{ users: AdminUser[]; total: number }>(
        `/api/admin/users?role=${role}&search=${encodeURIComponent(q)}`
      ),
  });
  const act = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, string> }) =>
      api.patch(`/api/admin/users/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <View style={s.root}>
      <Header
        title={t('Users')}
        right={data ? <Text style={s.muted}>{t('{n} total', { n: data.total })}</Text> : undefined}
      />
      <SearchBox value={text} onChange={setText} placeholder={t('Search name or email')} />
      <Chips
        options={[
          { id: '', label: 'All' },
          { id: 'BUYER', label: 'Buyers' },
          { id: 'SELLER', label: 'Sellers' },
          { id: 'AFFILIATE', label: 'Affiliates' },
          { id: 'ADMIN', label: 'Admins' },
        ]}
        value={role}
        onChange={setRole}
      />
      <FlatList
        data={data?.users ?? []}
        keyExtractor={u => u.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />
        }
        ListEmptyComponent={
          <ListState
            loading={isLoading}
            error={error}
            onRetry={refetch}
            empty={t('No users found.')}
          />
        }
        renderItem={({ item: u }) => (
          <Card>
            <View style={s.between}>
              <Text style={s.strong} numberOfLines={1}>
                {u.name}
              </Text>
              <StatusPill status="CONFIRMED" label={t(ROLE_LABEL[u.role] ?? u.role)} />
            </View>
            <Text style={s.body}>{u.email}</Text>
            <Text style={s.muted}>
              {t(u._count.orders === 1 ? '{n} order' : '{n} orders', { n: u._count.orders })} ·{' '}
              {t('{n} pts', { n: u.loyaltyPoints })} ·{' '}
              {u.emailVerified ? t('Verified') : t('Unverified')}
            </Text>
            {u.id !== me && (
              <View style={s.btns}>
                <Btn
                  label={t('Change role')}
                  busy={act.isPending && act.variables?.id === u.id}
                  onPress={() =>
                    sheet.open({
                      title: t('Change role'),
                      options: (['BUYER', 'SELLER', 'ADMIN'] as const)
                        .filter(r => r !== u.role)
                        .map(r => ({
                          label: t(ROLE_LABEL[r]),
                          onPress: () =>
                            act.mutate({ id: u.id, body: { action: 'changeRole', role: r } }),
                        })),
                    })
                  }
                />
                <Btn
                  kind="danger"
                  label={t('Suspend')}
                  busy={act.isPending && act.variables?.id === u.id}
                  onPress={() =>
                    confirm(
                      t('Suspend {name}?', { name: u.name }),
                      t('They will not be able to sign in until reactivated.'),
                      t('Suspend'),
                      t('Cancel'),
                      () => act.mutate({ id: u.id, body: { action: 'suspend' } })
                    )
                  }
                />
              </View>
            )}
          </Card>
        )}
      />
      {act.isError && <Text style={s.errorText}>{(act.error as Error).message}</Text>}
      {sheet.element}
    </View>
  );
}
