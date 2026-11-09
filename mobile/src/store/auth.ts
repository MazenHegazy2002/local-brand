import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  api,
  setFmtLang,
  setOnSessionExpired,
  signIn as apiSignIn,
  signOut as apiSignOut,
} from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { Lang } from '@/lib/i18n';

// SecureStore is native-only; fall back to localStorage on web
const storage = {
  get: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(localStorage.getItem(key))
      : SecureStore.getItemAsync(key),
  set: (key: string, value: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(localStorage.setItem(key, value))
      : SecureStore.setItemAsync(key, value),
  del: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(localStorage.removeItem(key))
      : SecureStore.deleteItemAsync(key),
};

type Role = 'BUYER' | 'SELLER' | 'AFFILIATE' | 'ADMIN';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  image: string | null;
}

interface AuthStore {
  user: User | null;
  /** Browsing the store without an account (sign-in is asked at checkout). */
  guest: boolean;
  browseAsGuest: () => Promise<void>;
  lang: Lang;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setLang: (lang: Lang) => void;
  updateUser: (patch: Partial<User>) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  guest: false,
  lang: 'en',
  loading: true,

  hydrate: async () => {
    try {
      const raw = await storage.get('user');
      const lang = (await storage.get('lang')) as Lang | null;
      const guest = (await storage.get('guest')) === '1';
      set({ user: raw ? JSON.parse(raw) : null, guest, lang: lang ?? 'en', loading: false });
    } catch {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    const user = await apiSignIn(email, password);
    await storage.set('user', JSON.stringify(user));
    set({ user: user as User });
  },

  browseAsGuest: async () => {
    await storage.set('guest', '1');
    set({ guest: true });
  },

  signOut: async () => {
    // Stop pushes to this device for the old account; ignore failures (may already be expired).
    await api.delete('/api/notifications/push-token').catch(() => {});
    await apiSignOut();
    queryClient.clear();
    await storage.del('user');
    set({ user: null });
  },

  setLang: async lang => {
    await storage.set('lang', lang);
    set({ lang });
  },

  updateUser: async patch => {
    const cur = get().user;
    if (!cur) return;
    const user = { ...cur, ...patch };
    await storage.set('user', JSON.stringify(user));
    set({ user });
  },
}));

setOnSessionExpired(async () => {
  await apiSignOut();
  await storage.del('user');
  queryClient.clear();
  useAuth.setState({ user: null });
});

useAuth.subscribe(s => setFmtLang(s.lang));
