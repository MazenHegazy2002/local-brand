import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@/types';

export interface WishlistItem {
  id: string;
  name?: string;
  price?: number;
  image?: string;
}

interface WishlistStore {
  items: WishlistItem[];
  toggleItem: (item: WishlistItem, session?: Session | null) => Promise<void>;
  hasItem: (id: string) => boolean;
  fetchItems: () => Promise<void>;
  syncLocalItems: () => Promise<void>;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      syncLocalItems: async () => {
        try {
          const res = await fetch('/api/wishlist');
          if (!res.ok) return;
          const data = await res.json();
          const serverProductIds = new Set(data.wishlist.map((w: any) => w.product.id));

          const localItems = get().items;
          const itemsToPost = localItems.filter(item => !serverProductIds.has(item.id));

          for (const item of itemsToPost) {
            await fetch('/api/wishlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: item.id }),
            });
          }
          await get().fetchItems();
        } catch (err) {
          console.error('Failed to sync wishlist items:', err);
        }
      },

      fetchItems: async () => {
        try {
          const res = await fetch('/api/wishlist');
          if (res.ok) {
            const data = await res.json();
            const synced = data.wishlist.map(
              (w: {
                product: {
                  id: string;
                  title: string;
                  basePrice: number;
                  images: Array<{ isPrimary: boolean; url: string }>;
                };
              }) => ({
                id: w.product.id,
                name: w.product.title,
                price: w.product.basePrice,
                image: w.product.images.find(i => i.isPrimary)?.url || w.product.images[0]?.url,
              })
            );
            set({ items: synced });
          }
        } catch {
          // Silent fail - wishlist sync failure shouldn't break UI
        }
      },

      toggleItem: async (item, session) => {
        const items = get().items;
        const exists = items.some(i => i.id === item.id);

        // Optimistic UI update
        const newItems = exists ? items.filter(i => i.id !== item.id) : [...items, item];

        set({ items: newItems });

        // Server sync if logged in
        if (session) {
          try {
            await fetch('/api/wishlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: item.id }),
            });
          } catch {
            // Silent fail - optimistic UI already updated
          }
        }
      },

      hasItem: id => get().items.some(i => i.id === id),
    }),
    { name: 'local-brand-wishlist' }
  )
);
