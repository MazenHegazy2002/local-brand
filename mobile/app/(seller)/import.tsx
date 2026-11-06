// Seller: ask to import the products from your old website. Once an admin
// approves, they appear in Products as drafts to review and publish.
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';
import { useT } from '@/lib/i18n';

interface ImportRequest {
  id: string;
  url: string;
  status: 'PENDING' | 'RUNNING' | 'REJECTED' | 'DONE' | 'FAILED';
  result: string | null;
  createdAt: string;
}

const STATUS: Record<ImportRequest['status'], { label: string; bg: string; fg: string }> = {
  PENDING: { label: 'Waiting for approval', bg: colors.accentBg, fg: colors.accentText },
  RUNNING: { label: 'Importing…', bg: '#e0f2fe', fg: '#0369a1' },
  DONE: { label: 'Imported', bg: '#dcfce7', fg: colors.success },
  REJECTED: { label: 'Not approved', bg: '#eef0f3', fg: colors.muted },
  FAILED: { label: 'Failed', bg: '#fee2e2', fg: colors.danger },
};

export default function SellerImport() {
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useT();
  const [url, setUrl] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['seller-imports'],
    queryFn: () => api.get<{ requests: ImportRequest[] }>('/api/products/import-from-url'),
  });

  const send = useMutation({
    mutationFn: () =>
      api.post<{ pending: boolean; alreadyPending: boolean }>('/api/products/import-from-url', {
        url: url.trim(),
      }),
    onSuccess: r => {
      setNote({
        ok: true,
        text: r.alreadyPending
          ? t('You already asked for this link — it is waiting for approval.')
          : t(
              "Request sent. An admin will review it and you'll get a notification when your products are added."
            ),
      });
      setUrl('');
      qc.invalidateQueries({ queryKey: ['seller-imports'] });
    },
    onError: e => setNote({ ok: false, text: (e as Error).message }),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Back')}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ChevronLeft size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>{t('Import from your website')}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={styles.card}>
          <Text style={styles.help}>
            {t(
              'Paste the link to your current online shop. After an admin approves it, we copy your products, photos, prices and descriptions here as drafts. Review each one, then publish it.'
            )}
          </Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://your-shop.com"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Pressable
            style={[styles.btn, (!url.trim() || send.isPending) && { opacity: 0.5 }]}
            disabled={!url.trim() || send.isPending}
            onPress={() => {
              setNote(null);
              send.mutate();
            }}
          >
            {send.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{t('Request import')}</Text>
            )}
          </Pressable>
          {!!note && (
            <Text style={[styles.note, { color: note.ok ? colors.success : colors.danger }]}>
              {note.text}
            </Text>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          (data?.requests ?? []).map(r => {
            const st = STATUS[r.status];
            let summary = '';
            try {
              const res = r.result ? JSON.parse(r.result) : null;
              summary =
                res?.error ??
                (res ? t('{a} added, {u} updated', { a: res.created, u: res.updated ?? 0 }) : '');
            } catch {
              /* ignore */
            }
            return (
              <View key={r.id} style={styles.row}>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.fg }]}>{t(st.label)}</Text>
                </View>
                <Text style={styles.url} numberOfLines={1}>
                  {r.url}
                </Text>
                {!!summary && <Text style={styles.meta}>{summary}</Text>}
                {r.status === 'DONE' && (
                  <Pressable
                    onPress={() => router.push('/(seller)/(tabs)/products?filter=draft' as Href)}
                  >
                    <Text style={styles.link}>{t('See drafts')}</Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 10,
  },
  title: { flex: 1, fontFamily: 'Inter-Bold', fontSize: 20, color: colors.ink },
  body: { paddingHorizontal: spacing.page, paddingBottom: 40, gap: 10 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 16, gap: 12 },
  help: { fontFamily: 'Inter-Regular', fontSize: 13.5, color: colors.muted, lineHeight: 20 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.ink,
    textAlign: 'left',
  },
  btn: {
    height: 48,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
  note: { fontFamily: 'Inter-Medium', fontSize: 13, lineHeight: 19 },
  row: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 14, gap: 6 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.badge,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontFamily: 'Inter-SemiBold', fontSize: 11.5 },
  url: { fontFamily: 'Inter-Medium', fontSize: 13.5, color: colors.ink },
  meta: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted },
  link: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.primary },
});
