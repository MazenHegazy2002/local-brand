// Shared Seller Hub types + hooks (stats query is shared by dashboard, tab badge and More).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://brandyy.shop';

// Disk-stored images come back as "/api/files/..."; React Native needs a full URL.
export const absUrl = (u: string) => (u.startsWith('/') ? `${API_BASE}${u}` : u);

export type Range = 'today' | '7d' | '30d';

export interface SellerStats {
  store: { name: string; logoUrl: string | null; status: string };
  unreadNotifications: number;
  netSales: number;
  changePct: number | null;
  series: { label: string; value: number }[];
  orders: number;
  storeVisits: number;
  newOrders: number;
  toShip: number;
  rating: number | null;
  reviewCount: number;
  lowStockVariants: number;
}

export const statsKey = (range: Range) => ['seller-stats', range] as const;

export function useSellerStats(range: Range = '7d') {
  return useQuery({
    queryKey: statsKey(range),
    queryFn: () => api.get<SellerStats>(`/api/seller/stats?range=${range}`),
  });
}

export function compact(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`;
  return String(n);
}

const COLOR_HEX: Record<string, string> = {
  black: '#111',
  white: '#f5f5f5',
  red: '#dc2626',
  blue: '#2563eb',
  navy: '#1e3b8a',
  green: '#16a34a',
  olive: '#6b7c3a',
  yellow: '#facc15',
  orange: '#f97316',
  pink: '#ec4899',
  purple: '#9333ea',
  brown: '#7c4a2d',
  beige: '#e8dcc4',
  cream: '#f3ead3',
  grey: '#9ca3af',
  gray: '#9ca3af',
  khaki: '#c3b091',
  burgundy: '#800020',
  maroon: '#7f1d1d',
  camel: '#c19a6b',
  gold: '#d4af37',
  silver: '#c0c0c0',
};
export const colorHex = (name: string) => COLOR_HEX[name.trim().toLowerCase()] ?? '#b8bcc6';

// Multipart upload — the shared api client forces JSON, so this sets its own headers.
export async function uploadImage(uri: string, mime = 'image/jpeg'): Promise<string> {
  const token =
    Platform.OS === 'web'
      ? localStorage.getItem('access_token')
      : await SecureStore.getItemAsync('access_token');
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, `photo.${blob.type.split('/')[1] ?? 'jpg'}`);
  } else {
    form.append('file', { uri, name: `photo.${mime.split('/')[1] ?? 'jpg'}`, type: mime } as never);
  }
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(body.error ?? body.message ?? 'Upload failed');
  return body.url;
}
