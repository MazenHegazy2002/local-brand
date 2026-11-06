// Admin products: filter active / drafts, select several, then publish, set to draft or delete.
import { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, StyleSheet } from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { api, absUrl, fmtEGP } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { colors, radii, spacing } from '@/lib/tokens';
import {
  Header,
  Chips,
  SearchBox,
  StatusPill,
  Btn,
  ListState,
  confirm,
  glass,
  s,
} from '@/components/admin/ui';

type Status = 'all' | 'active' | 'draft';
interface Row {
  id: string;
  title: string;
  basePrice: number;
  published: boolean;
  storeName: string | null;
  image: string | null;
  stock: number;
}
type Action = 'publish' | 'unpublish' | 'delete';

export default function AdminProducts() {
  const { t } = useT();
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>('all');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);

  // Search after typing stops.
  useEffect(() => {
    const id = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);

  const { data, isLoading, error, refetch, isRefetching, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['admin-products', status, query],
      initialPageParam: 1,
      queryFn: ({ pageParam }) =>
        api.get<{
          items: Row[];
          counts: Record<Status, number>;
          total: number;
          pageSize: number;
        }>(`/api/admin/products?status=${status}&page=${pageParam}&q=${encodeURIComponent(query)}`),
      getNextPageParam: (last, pages) =>
        pages.length * last.pageSize < last.total ? pages.length + 1 : undefined,
    });
  const rows = data?.pages.flatMap(p => p.items) ?? [];

  const bulk = useMutation({
    mutationFn: (action: Action) =>
      api.post<{ changed: number; skipped: number }>('/api/admin/products/bulk', {
        ids: [...selected],
        action,
      }),
    onSuccess: (res, action) => {
      const verb =
        action === 'delete'
          ? t('deleted')
          : action === 'publish'
            ? t('published')
            : t('set to draft');
      setNote(
        `${res.changed} ${verb}` +
          (res.skipped ? ` — ${t('{n} need a photo and a price first', { n: res.skipped })}` : '')
      );
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: e => setNote((e as Error).message),
  });

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allShown = rows.length > 0 && rows.every(r => selected.has(r.id));
  const run = (action: Action) => {
    setNote(null);
    if (action === 'delete')
      confirm(
        t('Delete {n} products?', { n: selected.size }),
        t('They will be removed from the shop. Past orders are kept.'),
        t('Delete'),
        t('Cancel'),
        () => bulk.mutate(action)
      );
    else bulk.mutate(action);
  };

  return (
    <View style={s.root}>
      <Header title={t('Products')} back />
      <SearchBox value={q} onChange={setQ} placeholder={t('Search products or stores')} />
      <Chips
        options={[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'draft', label: 'Drafts' },
        ]}
        value={status}
        onChange={v => {
          setStatus(v);
          setSelected(new Set());
        }}
        counts={data?.pages[0]?.counts}
      />

      <View style={st.bar}>
        <Pressable
          style={st.selectAll}
          onPress={() => setSelected(allShown ? new Set() : new Set(rows.map(r => r.id)))}
        >
          <Box on={allShown} />
          <Text style={s.muted}>
            {selected.size ? t('{n} selected', { n: selected.size }) : t('Select all shown')}
          </Text>
        </Pressable>
      </View>
      {selected.size > 0 && (
        <View style={[s.btns, st.actions]}>
          <Btn
            kind="primary"
            label={t('Publish')}
            busy={bulk.isPending && bulk.variables === 'publish'}
            onPress={() => run('publish')}
          />
          <Btn
            label={t('Set to draft')}
            busy={bulk.isPending && bulk.variables === 'unpublish'}
            onPress={() => run('unpublish')}
          />
          <Btn
            kind="danger"
            label={t('Delete')}
            busy={bulk.isPending && bulk.variables === 'delete'}
            onPress={() => run('delete')}
          />
        </View>
      )}
      {!!note && <Text style={[s.muted, st.note]}>{note}</Text>}

      <FlatList
        data={rows}
        keyExtractor={r => r.id}
        onEndReached={() => hasNextPage && fetchNextPage()}
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
          const on = selected.has(p.id);
          return (
            <Pressable style={[st.row, on && st.rowOn]} onPress={() => toggle(p.id)}>
              <Box on={on} />
              {p.image ? (
                <Image source={{ uri: absUrl(p.image) }} style={st.thumb} contentFit="cover" />
              ) : (
                <View style={st.thumb} />
              )}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.strong} numberOfLines={1}>
                  {p.title}
                </Text>
                <Text style={s.muted} numberOfLines={1}>
                  {p.storeName ?? '—'} · {fmtEGP(p.basePrice)} · {t('Stock')} {p.stock}
                </Text>
                <StatusPill
                  status={p.published ? 'ACTIVE' : 'DRAFT'}
                  label={p.published ? t('Active') : t('Draft')}
                />
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function Box({ on }: { on: boolean }) {
  return (
    <View style={[st.box, on && st.boxOn]}>
      {on && <Check size={14} color={colors.ink} strokeWidth={3} />}
    </View>
  );
}

const st = StyleSheet.create({
  bar: { paddingHorizontal: spacing.page, paddingBottom: 8 },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { paddingHorizontal: spacing.page, marginTop: 0, marginBottom: 8 },
  note: { paddingHorizontal: spacing.page, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: glass,
    borderRadius: radii.card,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowOn: { borderColor: colors.accent },
  thumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.08)' },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
