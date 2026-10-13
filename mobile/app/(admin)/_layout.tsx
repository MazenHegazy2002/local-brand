import { Tabs } from 'expo-router';
import { LayoutDashboard, ClipboardList } from 'lucide-react-native';
import { useT } from '@/lib/i18n';

export default function AdminLayout() {
  const { t } = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1a2340', borderTopColor: '#2a3560' },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#6b7080',
        tabBarLabelStyle: { fontFamily: 'Inter-SemiBold', fontSize: 10.5 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('Overview'),
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} strokeWidth={1.9} />,
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: t('Approvals'),
          tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} strokeWidth={1.9} />,
        }}
      />
    </Tabs>
  );
}
