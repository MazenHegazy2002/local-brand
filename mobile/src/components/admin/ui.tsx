// Shared pieces for the dark Admin OS screens.
import { useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search } from 'lucide-react-native';
import { colors, radii, spacing } from '@/lib/tokens';
import { useT } from '@/lib/i18n';

export const glass = 'rgba(255,255,255,.06)';
export const dim = 'rgba(255,255,255,.5)';

export const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: '#a78bfa',
  CONFIRMED: '#60a5fa',
  PROCESSING: colors.accent,
  SHIPPED: '#38bdf8',
  DELIVERED: '#4ade80',
  CANCELLED: '#f87171',
  RETURNED: '#fb923c',
  // sellers / users / moderation / support
  PENDING_APPROVAL: colors.accent,
  ACTIVE: '#4ade80',
  SUSPENDED: '#fb923c',
  BANNED: '#f87171',
  PENDING: colors.accent,
  APPROVED: '#4ade80',
  REJECTED: '#f87171',
  COMPLETED: '#60a5fa',
  PUBLISHED: '#4ade80',
  HIDDEN: '#94a3b8',
  OPEN: colors.accent,
  UNDER_REVIEW: '#60a5fa',
  IN_PROGRESS: '#60a5fa',
  RESOLVED: '#4ade80',
  RESOLVED_BUYER: '#4ade80',
  RESOLVED_SELLER: '#4ade80',
  CLOSED: '#94a3b8',
  REQUESTED: colors.accent,
  PAID: '#4ade80',
  UNPAID: '#a78bfa',
};

/** Screen title; `back` adds a back arrow for stack screens. */
export function Header({
  title,
  back,
  right,
}: {
  title: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  const { t } = useT();
  return (
    <View style={s.header}>
      {back && (
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={t('Back')}>
          <ChevronLeft size={26} color="#fff" />
        </Pressable>
      )}
      <Text style={s.title} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}

/** Horizontal filter chips; `counts` adds a number after each label. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  counts,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  counts?: Record<string, number>;
}) {
  const { t } = useT();
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {options.map(o => {
          const on = o.id === value;
          const n = counts?.[o.id];
          return (
            <Pressable key={o.id} style={[s.chip, on && s.chipOn]} onPress={() => onChange(o.id)}>
              <Text style={[s.chipText, on && s.chipTextOn]}>
                {t(o.label)}
                {n != null ? ` ${n}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={s.search}>
      <Search size={16} color={dim} />
      <TextInput
        style={s.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,.35)"
        autoCapitalize="none"
        returnKeyType="search"
      />
    </View>
  );
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  const c = STATUS_COLORS[status] ?? '#94a3b8';
  return (
    <View style={[s.pill, { backgroundColor: c + '22' }]}>
      <Text style={[s.pillText, { color: c }]}>{label}</Text>
    </View>
  );
}

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  return onPress ? (
    <Pressable style={s.card} onPress={onPress}>
      {children}
    </Pressable>
  ) : (
    <View style={s.card}>{children}</View>
  );
}

export function Btn({
  label,
  onPress,
  kind = 'ghost',
  busy,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  busy?: boolean;
}) {
  return (
    <Pressable
      style={[s.btn, kind === 'primary' && s.btnPrimary, kind === 'danger' && s.btnDanger]}
      onPress={onPress}
      disabled={busy}
    >
      {busy ? (
        <ActivityIndicator color={kind === 'primary' ? colors.ink : '#fff'} />
      ) : (
        <Text
          style={[
            s.btnText,
            kind === 'primary' && { color: colors.ink },
            kind === 'danger' && { color: '#f87171' },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Loading / error / empty states shared by every list. */
export function ListState({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: unknown;
  empty?: string | false;
  onRetry?: () => void;
}) {
  const { t } = useT();
  if (loading) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;
  if (error)
    return (
      <View style={s.state}>
        <Text style={s.errorText}>{(error as Error).message}</Text>
        {onRetry && (
          <Pressable onPress={onRetry}>
            <Text style={s.link}>{t('Try again')}</Text>
          </Pressable>
        )}
      </View>
    );
  if (empty) return <Text style={[s.muted, s.state]}>{empty}</Text>;
  return null;
}

/** Bottom sheet of choices (Android alerts cap at three buttons). */
export function useOptionSheet() {
  const [sheet, setSheet] = useState<{
    title: string;
    options: { label: string; onPress: () => void; danger?: boolean }[];
  } | null>(null);
  const { t } = useT();
  const element = (
    <Modal
      visible={!!sheet}
      transparent
      animationType="slide"
      onRequestClose={() => setSheet(null)}
    >
      <Pressable style={s.backdrop} onPress={() => setSheet(null)} />
      <View style={s.sheet}>
        <Text style={s.sheetTitle}>{sheet?.title}</Text>
        {sheet?.options.map(o => (
          <Pressable
            key={o.label}
            style={s.sheetRow}
            onPress={() => {
              setSheet(null);
              o.onPress();
            }}
          >
            <Text style={[s.sheetText, o.danger && { color: '#f87171' }]}>{o.label}</Text>
          </Pressable>
        ))}
        <Pressable style={[s.sheetRow, { borderTopWidth: 0 }]} onPress={() => setSheet(null)}>
          <Text style={[s.sheetText, { color: dim }]}>{t('Cancel')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
  return { open: setSheet, element };
}

/** Yes/no confirm that also works on web (where Alert ignores buttons). */
export function confirm(
  title: string,
  message: string,
  ok: string,
  cancel: string,
  run: () => void
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) run();
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: ok, style: 'destructive', onPress: run },
  ]);
}

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgAdmin },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
  },
  title: { flex: 1, fontFamily: 'Outfit-Bold', fontSize: 26, color: '#fff' },
  list: { paddingHorizontal: spacing.page, paddingBottom: 40, gap: 10 },
  chips: { paddingHorizontal: spacing.page, gap: 8, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: glass,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontFamily: 'Inter-Medium', fontSize: 13, color: 'rgba(255,255,255,.7)' },
  chipTextOn: { fontFamily: 'Inter-SemiBold', color: colors.ink },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.page,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: radii.sm,
    backgroundColor: glass,
  },
  searchInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: '#fff' },
  card: { backgroundColor: glass, borderRadius: radii.card, padding: 14, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  strong: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,.8)',
    lineHeight: 18,
  },
  muted: { fontFamily: 'Inter-Regular', fontSize: 12, color: dim },
  amount: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  pillText: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
  btns: { flexDirection: 'row', gap: 8, marginTop: 6 },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  btnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  btnDanger: { borderColor: 'rgba(248,113,113,.45)' },
  btnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff' },
  state: { alignItems: 'center', marginTop: 40, gap: 8, textAlign: 'center' },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#fca5a5', textAlign: 'center' },
  link: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.accent },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)' },
  sheet: {
    backgroundColor: '#1a2340',
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.page,
    paddingTop: 18,
    paddingBottom: 32,
  },
  sheetTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff', marginBottom: 8 },
  sheetRow: {
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.08)',
  },
  sheetText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
  input: {
    height: 46,
    borderRadius: radii.sm,
    backgroundColor: glass,
    paddingHorizontal: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#fff',
  },
});
