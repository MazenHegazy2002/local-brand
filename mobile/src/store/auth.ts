import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { signIn as apiSignIn, signOut as apiSignOut } from '@/lib/api';

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
      const raw = await SecureStore.getItemAsync('user');
      const lang = (await SecureStore.getItemAsync('lang')) as 'en' | 'ar' | null;
      set({ user: raw ? JSON.parse(raw) : null, lang: lang ?? 'en', loading: false });
    } catch {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    const user = await apiSignIn(email, password);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user: user as User });
  },

  signOut: async () => {
    await apiSignOut();
    await SecureStore.deleteItemAsync('user');
    set({ user: null });
  },

  setLang: async lang => {
    await SecureStore.setItemAsync('lang', lang);
    set({ lang });
  },
}));
