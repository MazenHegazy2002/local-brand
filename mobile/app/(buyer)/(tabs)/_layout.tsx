import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import { Home, Search, MapPin, ShoppingBag, User } from 'lucide-react-native';
import { colors, tabBar } from '@/lib/tokens';
import { useCart } from '@/store/cart';
import { useT } from '@/lib/i18n';

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export default function BuyerLayout() {
  const insets = useSafeAreaInsets();
  const count = useCart(s => s.count());
  const { t } = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabBar.bg,
          borderTopColor: tabBar.borderColor,
          borderTopWidth: 1,
          height: tabBar.height + insets.bottom * 0.5,
          paddingBottom: insets.bottom * 0.5,
        },
        tabBarActiveTintColor: tabBar.activeColor,
        tabBarInactiveTintColor: tabBar.inactiveColor,
        tabBarLabelStyle: {
          fontFamily: 'Inter-SemiBold',
          fontSize: tabBar.labelSize,
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('Home'),
          tabBarIcon: ({ color }) => (
            <Home size={tabBar.iconSize} color={color} strokeWidth={1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: t('Shop'),
          tabBarIcon: ({ color }) => (
            <Search size={tabBar.iconSize} color={color} strokeWidth={1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="local"
        options={{
          title: t('Local'),
          tabBarIcon: ({ color }) => (
            <MapPin size={tabBar.iconSize} color={color} strokeWidth={1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="bag"
        options={{
          title: t('Bag'),
          tabBarIcon: ({ color }) => (
            <View>
              <ShoppingBag size={tabBar.iconSize} color={color} strokeWidth={1.9} />
              <Badge count={count} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('Account'),
          tabBarIcon: ({ color }) => (
            <User size={tabBar.iconSize} color={color} strokeWidth={1.9} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: 9, color: '#fff' },
});
