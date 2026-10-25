// Delivered-order item actions: write a review (POST /api/reviews) or request a return (POST /api/rma).
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Star } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';
import { useT, statusKey } from '@/lib/i18n';

export interface DeliveredItem {
  id: string;
  productId: string | null;
  title: string;
  review: { rating: number } | null;
  returnRequest: { status: string } | null;
}

// Same window the server enforces in /api/rma.
const RETURN_DAYS = 14;

export function OrderItemActions({
  orderId,
  items,
  deliveredAt,
}: {
  orderId: string;
  items: DeliveredItem[];
  deliveredAt: string | null;
}) {
  const { t } = useT();
  const qc = useQueryClient();
  const [sheet, setSheet] = useState<{ kind: 'review' | 'return'; item: DeliveredItem } | null>(
    null
  );
  const canReturn =
    !!deliveredAt && Date.now() - new Date(deliveredAt).getTime() < RETURN_DAYS * 86_400_000;

  const done = () => {
    setSheet(null);
    qc.invalidateQueries({ queryKey: ['order', orderId] });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t('Your items')}</Text>
      {items.map(item => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.buttons}>
            {item.review ? (
              <Text style={styles.note}>
                {t('Reviewed')} · {'★'.repeat(item.review.rating)}
              </Text>
            ) : (
              !!item.productId && (
                <Pressable style={styles.btn} onPress={() => setSheet({ kind: 'review', item })}>
                  <Text style={styles.btnText}>{t('Write a review')}</Text>
                </Pressable>
              )
            )}
            {item.returnRequest ? (
              <Text style={styles.note}>
                {t('Return')} · {t(statusKey(item.returnRequest.status))}
              </Text>
            ) : (
              canReturn && (
                <Pressable
                  style={[styles.btn, styles.btnGhost]}
                  onPress={() => setSheet({ kind: 'return', item })}
                >
                  <Text style={[styles.btnText, styles.btnGhostText]}>{t('Request a return')}</Text>
                </Pressable>
              )
            )}
          </View>
        </View>
      ))}
      {sheet?.kind === 'review' && (
        <ReviewSheet item={sheet.item} onClose={() => setSheet(null)} onDone={done} />
      )}
      {sheet?.kind === 'return' && (
        <ReturnSheet item={sheet.item} onClose={() => setSheet(null)} onDone={done} />
      )}
    </View>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function useSubmit(onDone: () => void) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (call: () => Promise<unknown>, thanks: string) => {
    setBusy(true);
    setError('');
    try {
      await call();
      onDone();
      Alert.alert(t('Thank you'), thanks);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

function ReviewSheet({
  item,
  onClose,
  onDone,
}: {
  item: DeliveredItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const { busy, error, submit } = useSubmit(onDone);

  return (
    <Sheet title={t('Write a review')} onClose={onClose}>
      <Text style={styles.sheetSub}>{item.title}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map(n => (
          <Pressable
            key={n}
            onPress={() => setRating(n)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('{n} stars', { n })}
          >
            <Star
              size={32}
              color={colors.accent}
              fill={n <= rating ? colors.accent : 'transparent'}
              strokeWidth={1.8}
            />
          </Pressable>
        ))}
      </View>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={t('What did you like or dislike? (optional)')}
        placeholderTextColor={colors.placeholder}
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={2000}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable
        style={[styles.cta, (busy || !rating) && { opacity: 0.6 }]}
        disabled={busy || !rating}
        onPress={() =>
          submit(
            () =>
              api.post('/api/reviews', {
                productId: item.productId,
                orderItemId: item.id,
                rating,
                ...(comment.trim() ? { comment: comment.trim() } : {}),
              }),
            t('Your review is posted. You earned 5 points.')
          )
        }
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>{t('Post review')}</Text>
        )}
      </Pressable>
    </Sheet>
  );
}

function ReturnSheet({
  item,
  onClose,
  onDone,
}: {
  item: DeliveredItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const [reason, setReason] = useState('');
  const { busy, error, submit } = useSubmit(onDone);
  const ok = reason.trim().length >= 10;

  return (
    <Sheet title={t('Request a return')} onClose={onClose}>
      <Text style={styles.sheetSub}>{item.title}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={t('Why are you returning it? (at least 10 characters)')}
        placeholderTextColor={colors.placeholder}
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={1000}
      />
      <Text style={styles.hint}>{t('Returns are accepted within 14 days of delivery.')}</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable
        style={[styles.cta, (busy || !ok) && { opacity: 0.6 }]}
        disabled={busy || !ok}
        onPress={() =>
          submit(
            () => api.post('/api/rma', { orderItemId: item.id, reason: reason.trim() }),
            t('We got your return request and will contact you soon.')
          )
        }
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>{t('Send request')}</Text>
        )}
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  heading: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  row: { gap: 8 },
  title: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.ink },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.button,
    backgroundColor: colors.navy,
  },
  btnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.ink },
  note: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted },
  backdrop: { flex: 1, backgroundColor: 'rgba(14,22,51,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: spacing.page,
    paddingBottom: 32,
    gap: 12,
  },
  sheetTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink },
  sheetSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted, marginTop: -6 },
  stars: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.ink,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  hint: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted },
  error: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.danger },
  cta: {
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#fff' },
});
