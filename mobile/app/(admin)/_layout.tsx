import { StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/lib/tokens';

export default function AdminStack() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgAdmin } }}
      />
    </>
  );
}
