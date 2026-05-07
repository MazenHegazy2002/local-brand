import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesStore {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ar';
  currency: 'EGP' | 'USD';
  notifications: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'en' | 'ar') => void;
  setCurrency: (currency: 'EGP' | 'USD') => void;
  setNotifications: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'en',
      currency: 'EGP',
      notifications: true,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setCurrency: (currency) => set({ currency }),
      setNotifications: (enabled) => set({ notifications: enabled }),
    }),
    { name: 'local-brand-preferences' }
  )
);