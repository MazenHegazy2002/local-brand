// Saved delivery addresses (new ones are added at checkout)
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

export interface AddressRow {
  id: string;
  street: string;
  city: string;
  governorate: string;
  isDefault?: boolean;
}

export default function Addresses() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<{ addresses: AddressRow[] }>('/api/addresses'),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Addresses</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={data?.addresses ?? []}
          keyExtractor={a => a.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No saved addresses. You can add one at checkout.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <MapPin size={18} color={colors.primary} strokeWidth={1.9} />
              <View style={{ flex: 1 }}>
                <Text style={styles.street}>{item.street}</Text>
                <Text style={styles.meta}>
                  {item.city}, {item.governorate}
                </Text>
              </View>
              {item.isDefault && <Text style={styles.badge}>Default</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.ink },
  list: { padding: spacing.page, gap: 10 },
  empty: { fontFamily: 'Inter-Regular', color: colors.muted, textAlign: 'center', marginTop: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  street: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.ink },
  meta: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  badge: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: colors.primary },
});
