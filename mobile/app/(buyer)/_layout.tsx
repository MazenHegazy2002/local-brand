import { Stack } from 'expo-router';

// Tabs live in (tabs); detail screens stack on top so back goes page by page.
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
