import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompareStore {
  productIds: string[];
  addProduct: (id: string) => void;
  removeProduct: (id: string) => void;
  clearAll: () => void;
  isComparing: (id: string) => boolean;
  maxProducts: 4;
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      productIds: [],
      maxProducts: 4,

      addProduct: (id) =>
        set((state) => {
          if (state.productIds.includes(id)) return state;
          if (state.productIds.length >= state.maxProducts) return state;
          return { productIds: [...state.productIds, id] };
        }),

      removeProduct: (id) =>
        set((state) => ({ productIds: state.productIds.filter((pid) => pid !== id) })),

      clearAll: () => set({ productIds: [] }),

      isComparing: (id) => get().productIds.includes(id),
    }),
    { name: 'local-brand-compare' }
  )
);