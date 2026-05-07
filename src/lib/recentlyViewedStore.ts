import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentlyViewedStore {
  productIds: string[];
  maxItems: 20;
  addProduct: (id: string) => void;
  getProducts: () => string[];
  clearAll: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      productIds: [],
      maxItems: 20,

      addProduct: (id) =>
        set((state) => {
          const filtered = state.productIds.filter((pid) => pid !== id);
          const newIds = [id, ...filtered].slice(0, state.maxItems);
          return { productIds: newIds };
        }),

      getProducts: () => get().productIds,

      clearAll: () => set({ productIds: [] }),
    }),
    { name: 'local-brand-recently-viewed' }
  )
);