// Seller Products list
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface Product {
  id: string;
  title: string;
  basePrice: number;
  images: string[];
  published: boolean;
  stock: number;
}

export default function SellerProducts() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => api.get<{ products: Product[] }>('/api/seller/products'),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push('/(seller)/add-product')}>
          <Plus size={20} color="#fff" strokeWidth={2} />
          <Text style={styles.addBtnText}>Add product</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data?.products ?? []}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Image
                source={{ uri: item.images?.[0] ?? '' }}
                style={styles.thumb}
                contentFit="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.price}>{fmtEGP(item.basePrice)}</Text>
                <Text style={styles.stock}>Stock: {item.stock}</Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: item.published ? '#dcfce7' : colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: item.published ? colors.success : colors.muted },
                  ]}
                >
                  {item.published ? 'Live' : 'Draft'}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSeller },
  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: 'Outfit-Bold', fontSize: 26, color: colors.ink },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.button,
  },
  addBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
  list: { paddingHorizontal: spacing.page, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  thumb: { width: 64, height: 64, borderRadius: radii.sm },
  name: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.ink, lineHeight: 18 },
  price: { fontFamily: 'Outfit-Bold', fontSize: 15, color: colors.primary, marginTop: 2 },
  stock: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  statusText: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
});
