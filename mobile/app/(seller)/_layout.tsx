import { Tabs } from 'expo-router';
import {
  LayoutGrid,
  ClipboardList,
  Package,
  CreditCard,
  MoreHorizontal,
} from 'lucide-react-native';
import { colors, tabBar } from '@/lib/tokens';
import { useSellerStats } from '@/lib/seller';

export default function SellerLayout() {
  const { data } = useSellerStats('7d');
  const pending = (data?.newOrders ?? 0) + (data?.toShip ?? 0);
  const icon = (Icon: typeof LayoutGrid) =>
    function TabIcon({ color }: { color: string }) {
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
          height: tabBar.height,
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
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: icon(LayoutGrid) }} />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
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
      <Tabs.Screen name="products" options={{ title: 'Products', tabBarIcon: icon(Package) }} />
      <Tabs.Screen name="payouts" options={{ title: 'Payouts', tabBarIcon: icon(CreditCard) }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon(MoreHorizontal) }} />
      <Tabs.Screen name="add-product" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
