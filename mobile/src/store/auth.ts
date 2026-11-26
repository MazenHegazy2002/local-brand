import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  api,
  setFmtLang,
  setOnSessionExpired,
  signIn as apiSignIn,
  signInWithGoogleToken,
  signInWithAppleToken,
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
  signInWithGoogle: (idToken: string) => Promise<void>;
  signInWithApple: (identityToken: string, name: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  setLang: (lang: Lang) => void;
  updateUser: (patch: Partial<User>) => Promise<void>;
  hydrate: () => Promise<void>;
}

const ROLES: Role[] = ['BUYER', 'SELLER', 'AFFILIATE', 'ADMIN'];

/** The server also has admin-type roles the app has no section for (CO_ADMIN, SUPER_ADMIN…). Every role must map
 *  to a section, or the root Stack has no screen to show and the app is just a black screen. */
function appRole(role: unknown): Role | null {
  const r = String(role || '').toUpperCase();
  if (ROLES.includes(r as Role)) return r as Role;
  if (r.includes('ADMIN')) return 'ADMIN';
  return null;
}

/** Normalise a signed-in user's role; refuse roles the app cannot show. */
async function toAppUser(raw: any): Promise<User> {
  const role = appRole(raw?.role);
  if (!role) {
    await apiSignOut().catch(() => {});
    throw new Error('This account type cannot use the app yet. Please sign in on brandyy.shop.');
  }
  return { ...raw, role } as User;
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
      const saved = raw ? JSON.parse(raw) : null;
      const role = saved ? appRole(saved.role) : null;
      set({ user: saved && role ? { ...saved, role } : null, guest, lang: lang ?? 'en', loading: false });
    } catch {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    const user = await toAppUser(await apiSignIn(email, password));
    await storage.set('user', JSON.stringify(user));
    set({ user });
  },

  signInWithGoogle: async idToken => {
    const user = await toAppUser(await signInWithGoogleToken(idToken));
    await storage.set('user', JSON.stringify(user));
    set({ user });
  },

  signInWithApple: async (identityToken, name) => {
    const user = await toAppUser(await signInWithAppleToken(identityToken, name));
    await storage.set('user', JSON.stringify(user));
    set({ user });
  },

  browseAsGuest: async () => {
    // Enter guest mode first: if the device's secure storage refuses the write,
    // browsing still works (the flag just won't survive a restart).
    set({ guest: true });
    await storage.set('guest', '1').catch(() => {});
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
