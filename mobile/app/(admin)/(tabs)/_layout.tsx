import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, ClipboardList, Store, Users, MoreHorizontal } from 'lucide-react-native';
import type { ColorValue } from 'react-native';
import { useT } from '@/lib/i18n';
import { tabBar } from '@/lib/tokens';

export default function AdminTabs() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const icon = (Icon: typeof LayoutDashboard) =>
    function TabIcon({ color }: { color: ColorValue }) {
      return <Icon size={22} color={color} strokeWidth={1.9} />;
    };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a2340',
          borderTopColor: '#2a3560',
          height: tabBar.height + insets.bottom * 0.5,
          paddingBottom: insets.bottom * 0.5,
        },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#6b7080',
        tabBarLabelStyle: { fontFamily: 'Inter-SemiBold', fontSize: 10.5, marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('Overview'), tabBarIcon: icon(LayoutDashboard) }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: t('Orders'), tabBarIcon: icon(ClipboardList) }}
      />
      <Tabs.Screen name="sellers" options={{ title: t('Sellers'), tabBarIcon: icon(Store) }} />
      <Tabs.Screen name="users" options={{ title: t('Users'), tabBarIcon: icon(Users) }} />
      <Tabs.Screen name="more" options={{ title: t('More'), tabBarIcon: icon(MoreHorizontal) }} />
    </Tabs>
  );
}
