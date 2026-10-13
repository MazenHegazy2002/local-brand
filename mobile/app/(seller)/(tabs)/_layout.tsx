import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutGrid,
  ClipboardList,
  Package,
  CreditCard,
  MoreHorizontal,
} from 'lucide-react-native';
import { colors, tabBar } from '@/lib/tokens';
import { useSellerStats } from '@/lib/seller';
import { useT } from '@/lib/i18n';

export default function SellerLayout() {
  const insets = useSafeAreaInsets();
  const { data } = useSellerStats('7d');
  const pending = (data?.newOrders ?? 0) + (data?.toShip ?? 0);
  const { t } = useT();
  const icon = (Icon: typeof LayoutGrid) =>
    function TabIcon({ color }: { color: ColorValue }) {
      return <Icon size={tabBar.iconSize} color={color} strokeWidth={1.9} />;
    };

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
      <Tabs.Screen name="index" options={{ title: t('Dashboard'), tabBarIcon: icon(LayoutGrid) }} />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('Orders'),
          tabBarIcon: icon(ClipboardList),
          tabBarBadge: pending > 0 ? pending : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.accent,
            color: '#fff',
            fontFamily: 'Inter-Bold',
            fontSize: 10,
          },
        }}
      />
      <Tabs.Screen name="products" options={{ title: t('Products'), tabBarIcon: icon(Package) }} />
      <Tabs.Screen name="payouts" options={{ title: t('Payouts'), tabBarIcon: icon(CreditCard) }} />
      <Tabs.Screen name="more" options={{ title: t('More'), tabBarIcon: icon(MoreHorizontal) }} />
    </Tabs>
  );
}
