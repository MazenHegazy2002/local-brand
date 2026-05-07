import { create } from 'zustand';

interface NotificationStore {
  unreadCount: number;
  increment: () => void;
  decrement: (n?: number) => void;
  set: (n: number) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationStore>()((set) => ({
  unreadCount: 0,

  increment: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

  decrement: (n = 1) =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - n) })),

  set: (n: number) => set({ unreadCount: Math.max(0, n) }),

  reset: () => set({ unreadCount: 0 }),
}));