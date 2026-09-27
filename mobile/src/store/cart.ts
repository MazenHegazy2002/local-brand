import { create } from 'zustand';

interface CartItem {
  productId: string;
  title: string;
  image: string;
  priceEGP: number;
  qty: number;
  size?: string;
  color?: string;
}

interface CartStore {
  items: CartItem[];
  add: (item: Omit<CartItem, 'qty'>) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],

  add: item =>
    set(s => {
      const existing = s.items.find(i => i.productId === item.productId);
      if (existing)
        return {
          items: s.items.map(i => (i.productId === item.productId ? { ...i, qty: i.qty + 1 } : i)),
        };
      return { items: [...s.items, { ...item, qty: 1 }] };
    }),

  remove: productId => set(s => ({ items: s.items.filter(i => i.productId !== productId) })),

  setQty: (productId, qty) =>
    set(s => ({
      items:
        qty <= 0
          ? s.items.filter(i => i.productId !== productId)
          : s.items.map(i => (i.productId === productId ? { ...i, qty } : i)),
    })),

  clear: () => set({ items: [] }),
  total: () => get().items.reduce((s, i) => s + i.priceEGP * i.qty, 0),
  count: () => get().items.reduce((s, i) => s + i.qty, 0),
}));
