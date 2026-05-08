import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types';

interface CompareStore {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  clearCompare: () => void;
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (product) => set((state) => {
        if (state.items.find(i => i.id === product.id)) return state;
        // Limit to 4 items for comparison
        if (state.items.length >= 4) {
          const newItems = [...state.items];
          newItems.shift();
          return { items: [...newItems, product] };
        }
        return { items: [...state.items, product] };
      }),
      removeItem: (productId) => set((state) => ({
        items: state.items.filter(i => i.id !== productId)
      })),
      clearCompare: () => set({ items: [] }),
    }),
    {
      name: 'compare-storage',
    }
  )
);