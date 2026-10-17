// Admin coupons: create, pause/resume and delete discount codes.
import { useState } from 'react';
import { View, Text, FlatList, RefreshControl, TextInput, Pressable } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { Header, StatusPill, Card, Btn, ListState, confirm, s } from '@/components/admin/ui';

interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue: number | null;
  usageLimit: number | null;
  usedCount: number;
  expiryDate: string;
  isActive: boolean;
}

export default function AdminCoupons() {
  const { t } = useT();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => api.get<{ coupons: Coupon[] }>('/api/admin/coupons'),
  });
  const done = () => qc.invalidateQueries({ queryKey: ['admin-coupons'] });
  const toggle = useMutation({
    mutationFn: (c: Coupon) => api.patch(`/api/admin/coupons/${c.id}`, { isActive: !c.isActive }),
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/coupons/${id}`),
    onSuccess: done,
  });

  return (
    <View style={s.root}>
      <Header
        title={t('Coupons')}
        back
        right={
          <Pressable onPress={() => setAdding(a => !a)} hitSlop={8}>
            <Text style={s.link}>{adding ? t('Cancel') : t('+ New')}</Text>
          </Pressable>
        }
      />
      <FlatList
        data={data?.coupons ?? []}
        keyExtractor={c => c.id}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />
        }
        ListHeaderComponent={
          adding ? <NewCoupon onDone={() => (setAdding(false), done())} /> : null
        }
        ListEmptyComponent={
          <ListState
            loading={isLoading}
            error={error}
            onRetry={refetch}
            empty={t('No coupons yet.')}
          />
        }
        renderItem={({ item: c }) => {
          const expired = new Date(c.expiryDate) < new Date();
          return (
            <Card>
              <View style={s.between}>
                <Text style={[s.strong, { letterSpacing: 1 }]}>{c.code}</Text>
                <StatusPill
                  status={expired ? 'CLOSED' : c.isActive ? 'ACTIVE' : 'SUSPENDED'}
                  label={expired ? t('Expired') : c.isActive ? t('Active') : t('Paused')}
                />
              </View>
              <Text style={s.body}>
                {c.discountType === 'PERCENTAGE'
                  ? t('{n}% off', { n: c.discountValue })
                  : t('{amount} off', { amount: fmtEGP(c.discountValue) })}
                {c.minOrderValue
                  ? ` · ${t('min {amount}', { amount: fmtEGP(c.minOrderValue) })}`
                  : ''}
              </Text>
              <Text style={s.muted}>
                {t('Used {used}{limit}', {
                  used: c.usedCount,
                  limit: c.usageLimit ? `/${c.usageLimit}` : '',
                })}{' '}
                · {t('Expires {date}', { date: new Date(c.expiryDate).toLocaleDateString() })}
              </Text>
              <View style={s.btns}>
                <Btn
                  label={c.isActive ? t('Pause') : t('Resume')}
                  busy={toggle.isPending && toggle.variables?.id === c.id}
                  onPress={() => toggle.mutate(c)}
                />
                <Btn
                  kind="danger"
                  label={t('Delete')}
                  busy={remove.isPending && remove.variables === c.id}
                  onPress={() =>
                    confirm(
                      t('Delete {code}?', { code: c.code }),
                      t('This cannot be undone.'),
                      t('Delete'),
                      t('Cancel'),
                      () => remove.mutate(c.id)
                    )
                  }
                />
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

function NewCoupon({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [min, setMin] = useState('');
  const [limit, setLimit] = useState('');
  const [days, setDays] = useState('30');
  const create = useMutation({
    mutationFn: () =>
      api.post('/api/admin/coupons', {
        code: code.trim().toUpperCase(),
        discountType: type,
        discountValue: Number(value),
        minOrderValue: min ? Number(min) : undefined,
        usageLimit: limit ? Number(limit) : undefined,
        expiryDate: new Date(Date.now() + Number(days || 30) * 86_400_000).toISOString(),
        isActive: true,
      }),
    onSuccess: onDone,
  });
  const valid =
    code.trim().length > 0 &&
    Number(value) > 0 &&
    (type === 'FIXED' || Number(value) <= 100) &&
    Number(days) > 0;
  const field = (v: string, set: (x: string) => void, ph: string, numeric = true) => (
    <TextInput
      style={[s.input, { flex: 1 }]}
      value={v}
      onChangeText={set}
      placeholder={ph}
      placeholderTextColor="rgba(255,255,255,.35)"
      keyboardType={numeric ? 'numeric' : 'default'}
      autoCapitalize="characters"
    />
  );
  return (
    <Card>
      <Text style={s.strong}>{t('New coupon')}</Text>
      {field(code, setCode, t('Code, e.g. EID20'), false)}
      <View style={s.btns}>
        {(['PERCENTAGE', 'FIXED'] as const).map(x => (
          <Btn
            key={x}
            kind={type === x ? 'primary' : 'ghost'}
            label={x === 'PERCENTAGE' ? t('Percentage') : t('Fixed amount')}
            onPress={() => setType(x)}
          />
        ))}
      </View>
      <View style={s.row}>
        {field(value, setValue, type === 'PERCENTAGE' ? t('Discount %') : t('Discount EGP'))}
        {field(min, setMin, t('Min order (optional)'))}
      </View>
      <View style={s.row}>
        {field(limit, setLimit, t('Usage limit (optional)'))}
        {field(days, setDays, t('Valid for days'))}
      </View>
      {create.isError && <Text style={s.errorText}>{(create.error as Error).message}</Text>}
      <View style={s.btns}>
        <Btn
          kind="primary"
          label={t('Create coupon')}
          busy={create.isPending}
          onPress={() => valid && create.mutate()}
        />
      </View>
    </Card>
  );
}
