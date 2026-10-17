import { Stack } from 'expo-router';
import { colors } from '@/lib/tokens';

export default function AdminStack() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgAdmin } }}
    />
  );
}
