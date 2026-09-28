import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { signIn as apiSignIn, signOut as apiSignOut } from '@/lib/api';

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
  lang: 'en' | 'ar';
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setLang: (lang: 'en' | 'ar') => void;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthStore>(set => ({
  user: null,
  lang: 'en',
  loading: true,

  hydrate: async () => {
    try {
      const raw = await storage.get('user');
      const lang = (await storage.get('lang')) as 'en' | 'ar' | null;
      set({ user: raw ? JSON.parse(raw) : null, lang: lang ?? 'en', loading: false });
    } catch {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    const user = await apiSignIn(email, password);
    await storage.set('user', JSON.stringify(user));
    set({ user: user as User });
  },

  signOut: async () => {
    await apiSignOut();
    await storage.del('user');
    set({ user: null });
  },

  setLang: async lang => {
    await storage.set('lang', lang);
    set({ lang });
  },
}));
