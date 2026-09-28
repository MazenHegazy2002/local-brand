import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '@/lib/tokens';

export function StoreLogo({
  name,
  uri,
  size = 44,
}: {
  name?: string;
  uri?: string | null;
  size?: number;
}) {
  const box = { width: size, height: size, borderRadius: size * 0.28 };
  if (uri) return <Image source={{ uri }} style={box} contentFit="cover" />;
  return (
    <View
      style={[
        box,
        { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      <Text style={{ fontFamily: 'Outfit-Bold', fontSize: size * 0.42, color: '#fff' }}>
        {(name?.trim()[0] ?? '·').toUpperCase()}
      </Text>
    </View>
  );
}
