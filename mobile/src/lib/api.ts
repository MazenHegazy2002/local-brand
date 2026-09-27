import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://brandyy.shop';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('access_token');
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync('refresh_token');
  if (!refreshToken) return null;
  const res = await fetch(`${BASE_URL}/api/auth/mobile/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  const { accessToken } = await res.json();
  await SecureStore.setItemAsync('access_token', accessToken);
  return accessToken;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = await getToken();
  const makeReq = (t: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });

  let res = await makeReq(token);

  if (res.status === 401 && token) {
    token = await refreshAccessToken();
    if (token) res = await makeReq(token);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body?.error ?? body?.message ?? res.statusText), {
      status: res.status,
    });
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Auth helpers
export async function signIn(email: string, password: string) {
  const data = await request<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; name: string; email: string; role: string; image: string | null };
  }>('/api/auth/mobile/token', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await SecureStore.setItemAsync('access_token', data.accessToken);
  await SecureStore.setItemAsync('refresh_token', data.refreshToken);
  return data.user;
}

export async function signOut() {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
}

// Currency formatter
export function fmtEGP(amount: number, lang: 'en' | 'ar' = 'en') {
  return lang === 'ar'
    ? `${amount.toLocaleString('ar-EG')} ج.م`
    : `${amount.toLocaleString('en-EG')} EGP`;
}
