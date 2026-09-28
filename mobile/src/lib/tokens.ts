import { Platform } from 'react-native';

export const colors = {
  primary: '#1e3b8a',
  primaryDark: '#152c6e',
  navy: '#0e1633',
  accent: '#f59e0b',
  accentLight: '#fcd34d',
  accentBg: '#fef3c7',
  accentText: '#b45309',
  ink: '#1f2333',
  muted: '#5b6070',
  subtle: '#6b7080',
  placeholder: '#8a8f9c',
  border: '#ece8e1',
  inputBorder: '#e3dfd7',
  surface: '#fff',
  bg: '#faf8f5',
  bgSeller: '#f4f5f8',
  bgAdmin: '#0f1424',
  success: '#15803d',
  danger: '#dc2626',
  favorite: '#e11d48',
} as const;

export const radii = {
  badge: 6,
  sm: 12,
  input: 14,
  button: 16,
  card: 16,
  cardLg: 22,
  sheet: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  page: 20,
  lg: 24,
  // Header top gap: clears the phone status bar; web has none, so stay tight.
  top: Platform.OS === 'web' ? 16 : 56,
} as const;

// Bottom tab bar
export const tabBar = {
  height: 56,
  iconSize: 22,
  labelSize: 10.5,
  activeColor: colors.primary,
  inactiveColor: '#8a8f9c',
  bg: colors.surface,
  borderColor: colors.border,
} as const;

// Font families (load via expo-font in _layout.tsx)
export const fonts = {
  outfit: 'Outfit',
  inter: 'Inter',
  instrumentSerif: 'InstrumentSerif',
  cairo: 'Cairo',
  amiri: 'Amiri',
} as const;
