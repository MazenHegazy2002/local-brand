// Admin support tickets: read, reply note, move through statuses.
import { useState } from 'react';
import { View, Text, FlatList, RefreshControl, TextInput, Linking, Pressable } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useT, statusKey } from '@/lib/i18n';
import { Header, Chips, StatusPill, Card, Btn, ListState, s } from '@/components/admin/ui';

interface Ticket {
  id: string;
  ticketId: string;
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  priority: string;
  adminReply: string | null;
  createdAt: string;
}

export default function AdminTickets() {
  const { t } = useT();
  const [status, setStatus] = useState('OPEN');
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-tickets', status],
    queryFn: () => api.get<{ items: Ticket[] }>(`/api/admin/tickets?status=${status}`),
  });
  return (
    <View style={s.root}>
      <Header title={t('Support tickets')} back />
      <Chips
        options={[
          { id: 'OPEN', label: 'Open' },
          { id: 'IN_PROGRESS', label: 'In progress' },
          { id: 'RESOLVED', label: 'Resolved' },
          { id: 'CLOSED', label: 'Closed' },
        ]}
        value={status}
        onChange={setStatus}
      />
      <FlatList
        data={data?.items ?? []}
        keyExtractor={x => x.id}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
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
        renderItem={({ item }) => <TicketCard ticket={item} />}
      />
    </View>
  );
}

function TicketCard({ ticket: k }: { ticket: Ticket }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [reply, setReply] = useState(k.adminReply ?? '');
  const update = useMutation({
    mutationFn: (body: { status?: string; adminReply?: string }) =>
      api.patch('/api/admin/tickets', { id: k.id, ...body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
  return (
    <Card>
      <View style={s.between}>
        <Text style={s.strong} numberOfLines={1}>
          {k.subject}
        </Text>
        <StatusPill status={k.status} label={t(statusKey(k.status))} />
      </View>
      <Text style={s.body}>{k.message}</Text>
      <Pressable
        onPress={() =>
          Linking.openURL(
            `mailto:${k.email}?subject=${encodeURIComponent(`Re: ${k.subject} [${k.ticketId}]`)}`
          )
        }
      >
        <Text style={s.link}>
          {k.name} · {k.email}
        </Text>
      </Pressable>
      <Text style={s.muted}>
        {k.ticketId} · {k.category} · {new Date(k.createdAt).toLocaleDateString()}
      </Text>
      <TextInput
        style={[s.input, { height: 70, paddingTop: 10, textAlignVertical: 'top' }]}
        value={reply}
        onChangeText={setReply}
        placeholder={t('Internal note / reply')}
        placeholderTextColor="rgba(255,255,255,.35)"
        multiline
      />
      <View style={s.btns}>
        <Btn
          label={t('Save note')}
          busy={update.isPending}
          onPress={() => update.mutate({ adminReply: reply })}
        />
        {k.status === 'OPEN' && (
          <Btn
            label={t('Start')}
            busy={update.isPending}
            onPress={() => update.mutate({ status: 'IN_PROGRESS' })}
          />
        )}
        {k.status !== 'RESOLVED' && k.status !== 'CLOSED' && (
          <Btn
            kind="primary"
            label={t('Resolve')}
            busy={update.isPending}
            onPress={() => update.mutate({ status: 'RESOLVED', adminReply: reply })}
          />
        )}
      </View>
    </Card>
  );
}
