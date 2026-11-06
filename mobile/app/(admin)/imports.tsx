// Admin website imports: copy a shop's products into a seller's store as drafts.
// Admins import right away and approve / reject requests from sellers and
// co-admins; co-admins send a request that an admin has to approve.
import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, RefreshControl } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { spacing } from '@/lib/tokens';
import {
  Header,
  Card,
  Btn,
  StatusPill,
  ListState,
  SearchBox,
  useOptionSheet,
  dim,
  s,
} from '@/components/admin/ui';

interface Seller {
  id: string;
  storeName: string;
  status: string;
  user?: { email: string } | null;
}
interface ImportRequest {
  id: string;
  storeName: string;
  url: string;
  requestedRole: string;
  status: 'PENDING' | 'RUNNING' | 'REJECTED' | 'DONE' | 'FAILED';
  result: string | null;
  createdAt: string;
}
interface Result {
  created: number;
  updated?: number;
  skipped: number;
  noImage: number;
  noPrice: number;
  failed: number;
  error?: string;
}

const STATUS_LABEL: Record<ImportRequest['status'], string> = {
  PENDING: 'Waiting for approval',
  RUNNING: 'Importing…',
  DONE: 'Imported',
  REJECTED: 'Not approved',
  FAILED: 'Failed',
};

export default function AdminImports() {
  const { t } = useT();
  const qc = useQueryClient();
  const sheet = useOptionSheet();
  const [url, setUrl] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [find, setFind] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-imports'],
    queryFn: () =>
      api.get<{ sellers: Seller[]; requests: ImportRequest[]; canApprove: boolean }>(
        '/api/admin/products/import-from-url'
      ),
  });
  const canApprove = !!data?.canApprove;
  const sellers = data?.sellers ?? [];
  const seller = sellers.find(x => x.id === sellerId);
  const matches = useMemo(() => {
    const q = find.trim().toLowerCase();
    return (
      q
        ? sellers.filter(x => `${x.storeName} ${x.user?.email ?? ''}`.toLowerCase().includes(q))
        : sellers
    ).slice(0, 12);
  }, [sellers, find]);

  const summary = (r: Result) =>
    t('{a} added, {u} updated', { a: r.created, u: r.updated ?? 0 }) +
    (r.noImage ? ` · ${t('{n} need a photo', { n: r.noImage })}` : '') +
    (r.noPrice ? ` · ${t('{n} need a price', { n: r.noPrice })}` : '') +
    (r.failed ? ` · ${t('{n} failed', { n: r.failed })}` : '');

  const start = useMutation({
    mutationFn: () =>
      api.post<Result & { pending?: boolean; alreadyPending?: boolean }>(
        '/api/admin/products/import-from-url',
        { url: url.trim(), sellerId }
      ),
    onSuccess: r => {
      setNote({
        ok: true,
        text: r.pending
          ? r.alreadyPending
            ? t('This link is already waiting for approval.')
            : t('Request sent. An admin has to approve it first.')
          : `${seller?.storeName}: ${summary(r)}`,
      });
      setUrl('');
      qc.invalidateQueries({ queryKey: ['admin-imports'] });
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: e => setNote({ ok: false, text: (e as Error).message }),
  });

  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      api.post<{ status: string; result?: Result }>(`/api/admin/products/import-requests/${id}`, {
        approve,
      }),
    onSuccess: (r, v) => {
      setNote({
        ok: true,
        text: v.approve && r.result ? summary(r.result) : t('Request rejected.'),
      });
      qc.invalidateQueries({ queryKey: ['admin-imports'] });
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: e => {
      setNote({ ok: false, text: (e as Error).message });
      qc.invalidateQueries({ queryKey: ['admin-imports'] });
    },
  });

  const requests = data?.requests ?? [];
  const waiting = requests.filter(r => r.status === 'PENDING' || r.status === 'RUNNING');
  const past = requests.filter(r => r.status !== 'PENDING' && r.status !== 'RUNNING').slice(0, 10);

  return (
    <View style={s.root}>
      <Header title={t('Website imports')} back />
      <ScrollView
        contentContainerStyle={[s.list, { gap: 12 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />
        }
      >
        <Card>
          <Text style={s.strong}>{t('Import products from a website')}</Text>
          <Text style={s.muted}>
            {canApprove
              ? t('Every product found is added to the seller’s store as a draft.')
              : t('As a co-admin, your request goes to an admin for approval first.')}
          </Text>
          <TextInput
            style={s.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://their-shop.com"
            placeholderTextColor="rgba(255,255,255,.35)"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Pressable
            style={[s.input, s.between]}
            onPress={() =>
              sheet.open({
                title: t('Choose seller'),
                options: matches.map(x => ({
                  label: `${x.storeName}${x.status !== 'ACTIVE' ? ` (${x.status.toLowerCase()})` : ''}`,
                  onPress: () => setSellerId(x.id),
                })),
              })
            }
          >
            <Text style={seller ? s.strong : s.muted}>
              {seller?.storeName ?? t('Choose seller')}
            </Text>
            <ChevronDown size={18} color={dim} />
          </Pressable>
          <SearchBox value={find} onChange={setFind} placeholder={t('Find seller…')} />
          <View style={s.btns}>
            <Btn
              kind="primary"
              busy={start.isPending}
              label={canApprove ? t('Import to seller') : t('Send for approval')}
              onPress={() => {
                setNote(null);
                if (!url.trim() || !sellerId)
                  setNote({ ok: false, text: t('Enter a link and choose a seller.') });
                else start.mutate();
              }}
            />
          </View>
          {start.isPending && canApprove && (
            <Text style={s.muted}>{t('Importing… this can take a few minutes')}</Text>
          )}
        </Card>

        {!!note && (
          <Text style={[s.body, { color: note.ok ? '#4ade80' : '#fca5a5' }]}>{note.text}</Text>
        )}

        <Text style={[s.muted, { marginTop: 4 }]}>{t('Waiting for approval')}</Text>
        {isLoading || error || !waiting.length ? (
          <ListState
            loading={isLoading}
            error={error}
            onRetry={refetch}
            empty={t('No requests waiting.')}
          />
        ) : (
          waiting.map(r => {
            const busy = decide.isPending && decide.variables?.id === r.id;
            return (
              <Card key={r.id}>
                <View style={s.between}>
                  <Text style={s.strong}>{r.storeName}</Text>
                  <StatusPill status={r.status} label={t(STATUS_LABEL[r.status])} />
                </View>
                <Text style={s.body} numberOfLines={1}>
                  {r.url}
                </Text>
                <Text style={s.muted}>
                  {r.requestedRole === 'CO_ADMIN' ? t('From a co-admin') : t('From the seller')} ·{' '}
                  {new Date(r.createdAt).toLocaleString()}
                </Text>
                {r.status === 'PENDING' && canApprove && (
                  <View style={s.btns}>
                    <Btn
                      kind="primary"
                      busy={busy && decide.variables?.approve}
                      label={t('Approve & import')}
                      onPress={() => decide.mutate({ id: r.id, approve: true })}
                    />
                    <Btn
                      kind="danger"
                      busy={busy && !decide.variables?.approve}
                      label={t('Reject')}
                      onPress={() => decide.mutate({ id: r.id, approve: false })}
                    />
                  </View>
                )}
                {busy && decide.variables?.approve && (
                  <Text style={s.muted}>{t('Importing… this can take a few minutes')}</Text>
                )}
              </Card>
            );
          })
        )}

        {past.length > 0 && <Text style={[s.muted, { marginTop: 4 }]}>{t('Recent imports')}</Text>}
        {past.map(r => {
          let text = '';
          try {
            const res: Result | null = r.result ? JSON.parse(r.result) : null;
            text = res?.error ?? (res ? summary(res) : '');
          } catch {
            /* ignore */
          }
          return (
            <Card key={r.id}>
              <View style={s.between}>
                <Text style={s.strong}>{r.storeName}</Text>
                <StatusPill status={r.status} label={t(STATUS_LABEL[r.status])} />
              </View>
              <Text style={s.muted} numberOfLines={1}>
                {r.url}
              </Text>
              {!!text && <Text style={s.muted}>{text}</Text>}
            </Card>
          );
        })}
        <View style={{ height: spacing.page }} />
      </ScrollView>
      {sheet.element}
    </View>
  );
}
