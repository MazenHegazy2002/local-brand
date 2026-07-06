import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // composite key: `${variantId}-${selectedSize || ''}-${selectedColor || ''}`
  variantId?: string; // actual variant ID in database
  name: string;
  price: number;
  qty: number;
  image: string;
  emoji?: string;
  selectedSize?: string;
  selectedColor?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  /**
   * Replace a cart item's variant ID (e.g. when /api/cart/validate tells us an
   * item was saved with the Product id but should actually point at the
   * default ProductVariant id). If an item with the new id already
   * exists, their quantities are merged.
   */
  rewriteId: (oldId: string, newId: string) => void;
  clearCart: () => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: item =>
        set(state => {
          const addQty = item.qty ?? 1;
          const existing = state.items.find(i => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map(i => (i.id === item.id ? { ...i, qty: i.qty + addQty } : i)),
            };
          }
          const { qty, ...rest } = item;
          void qty; // ensure we strip the qty field before spreading
          return { items: [...state.items, { ...rest, qty: addQty }] };
        }),

      removeItem: id => set(state => ({ items: state.items.filter(i => i.id !== id) })),

      updateQty: (id, qty) =>
        set(state => ({
          items:
            qty <= 0
              ? state.items.filter(i => i.id !== id)
              : state.items.map(i => (i.id === id ? { ...i, qty } : i)),
        })),

      rewriteId: (oldId, newId) =>
        set(state => {
          if (oldId === newId) return state;
          const source = state.items.find(i => i.id === oldId);
          if (!source) return state;

          const sizePart = source.selectedSize || '';
          const colorPart = source.selectedColor || '';
          const newCompositeId = `${newId}-${sizePart}-${colorPart}`;

          const destination = state.items.find(i => i.id === newCompositeId);
          const withoutOld = state.items.filter(i => i.id !== oldId);
          if (destination) {
            // Merge quantities if an item with the target id already exists.
            return {
              items: withoutOld.map(i =>
                i.id === newCompositeId ? { ...i, qty: i.qty + source.qty } : i
              ),
            };
          }
          return {
            items: [...withoutOld, { ...source, id: newCompositeId, variantId: newId }],
          };
        }),

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((acc, i) => acc + i.price * i.qty, 0),

      count: () => get().items.reduce((acc, i) => acc + i.qty, 0),
    }),
    { name: 'local-brand-cart' }
  )
);
