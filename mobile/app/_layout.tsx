import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router, useRouter, useSegments, type Href } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useAuth } from '@/store/auth';
import * as Notifications from 'expo-notifications';
import { api } from '@/lib/api';
import VersionGate from '@/components/VersionGate';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)');
      return;
    }
    if (!user) return;
    const dest =
      user.role === 'SELLER'
        ? '/(seller)'
        : user.role === 'ADMIN'
          ? '/(admin)'
          : user.role === 'AFFILIATE'
            ? '/(affiliate)'
            : '/(buyer)';
    const destGroup = dest.slice(1); // strip leading /
    if (segments[0] !== destGroup) router.replace(dest as Href);
  }, [user, loading, segments]);

  return null;
}

// Rendered next to the Stack (after fonts load) so router.push has a mounted navigator.
function PushNotifications() {
  const userId = useAuth(s => s.user?.id);

  // Register the Expo push token once per signed-in user (the endpoint needs auth).
  useEffect(() => {
    if (!userId || Platform.OS === 'web') return;
    (async () => {
      // Android 13+ only shows the permission prompt once a channel exists.
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
      if (status !== 'granted') return;
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      const { data } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      await api.post('/api/notifications/push-token', { token: data });
    })().catch(() => {});
  }, [userId]);

  // Tapping a notification opens data.url (an in-app route), including from a cold start.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
    };
    Notifications.getLastNotificationResponseAsync().then(r => mounted && open(r));
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  const hydrate = useAuth(s => s.hydrate);

  const [fontsLoaded] = useFonts({
    'Outfit-Regular': require('../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-SemiBold': require('../assets/fonts/Outfit-SemiBold.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
    'Outfit-ExtraBold': require('../assets/fonts/Outfit-ExtraBold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'InstrumentSerif-Regular': require('../assets/fonts/InstrumentSerif-Regular.ttf'),
    'Cairo-Regular': require('../assets/fonts/Cairo-Regular.ttf'),
    'Cairo-SemiBold': require('../assets/fonts/Cairo-SemiBold.ttf'),
  });

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthGate />
        <PushNotifications />
        <VersionGate>
          <Stack screenOptions={{ headerShown: false }} />
        </VersionGate>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
