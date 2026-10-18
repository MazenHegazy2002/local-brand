import { StatusBar } from 'react-native';
import { Stack } from 'expo-router';

// Tabs live in (tabs); detail screens stack on top so back goes page by page.
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function Layout() {
  // Onboarding and admin switch the status bar to light; light screens need it dark again.
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
