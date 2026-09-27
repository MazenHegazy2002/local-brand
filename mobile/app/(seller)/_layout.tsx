import { Tabs } from 'expo-router';
import { BarChart2, ShoppingBag, Package, Wallet } from 'lucide-react-native';
import { colors, tabBar } from '@/lib/tokens';

export default function SellerLayout() {
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <BarChart2 size={tabBar.iconSize} color={color} strokeWidth={1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => (
            <ShoppingBag size={tabBar.iconSize} color={color} strokeWidth={1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color }) => (
            <Package size={tabBar.iconSize} color={color} strokeWidth={1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="payouts"
        options={{
          title: 'Payouts',
          tabBarIcon: ({ color }) => (
            <Wallet size={tabBar.iconSize} color={color} strokeWidth={1.9} />
          ),
        }}
      />
    </Tabs>
  );
}
