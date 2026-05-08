import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;           // variantId or productId
  name: string;
  price: number;
  qty: number;
  image: string;
  emoji?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const addQty = item.qty ?? 1;
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, qty: i.qty + addQty } : i
              ),
            };
          }
          const { qty, ...rest } = item;
          void qty; // ensure we strip the qty field before spreading
          return { items: [...state.items, { ...rest, qty: addQty }] };
        }),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQty: (id, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, qty } : i)),
        })),

      clearCart: () => set({ items: [] }),

      total: () =>
        get().items.reduce((acc, i) => acc + i.price * i.qty, 0),

      count: () =>
        get().items.reduce((acc, i) => acc + i.qty, 0),
    }),
    { name: 'local-brand-cart' }
  )
);
