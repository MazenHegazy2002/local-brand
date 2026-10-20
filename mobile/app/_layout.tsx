import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack, router, type Href } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import Constants from 'expo-constants';
import { useAuth } from '@/store/auth';
import * as Notifications from 'expo-notifications';
import { api } from '@/lib/api';
import VersionGate from '@/components/VersionGate';
import { useT } from '@/lib/i18n';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
  const { rtl } = useT();
  // Side insets: devices with a side status bar / camera (and landscape notches).
  const insets = useSafeAreaInsets();
  const role = useAuth(s => s.user?.role);

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
        <PushNotifications />
        {/* `direction` mirrors row layouts live for Arabic, no restart needed. */}
        <View
          style={{
            flex: 1,
            direction: rtl ? 'rtl' : 'ltr',
            paddingLeft: insets.left,
            paddingRight: insets.right,
            // The padded strip sits beside the side status bar; keep it dark like the bezel.
            backgroundColor: '#000',
          }}
        >
          <VersionGate>
            {/* Each section only exists for its role: signing in or out moves the user
                to the first section available to them, and a section never mounts (or
                fires its API calls) for the wrong user, even at launch. */}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={!role}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
              <Stack.Protected guard={role === 'BUYER'}>
                <Stack.Screen name="(buyer)" />
              </Stack.Protected>
              <Stack.Protected guard={role === 'SELLER'}>
                <Stack.Screen name="(seller)" />
              </Stack.Protected>
              <Stack.Protected guard={role === 'ADMIN'}>
                <Stack.Screen name="(admin)" />
              </Stack.Protected>
              <Stack.Protected guard={role === 'AFFILIATE'}>
                <Stack.Screen name="(affiliate)" />
              </Stack.Protected>
            </Stack>
          </VersionGate>
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
