import { create } from 'zustand';

interface CartItem {
  productId: string;
  title: string;
  image: string;
  basePrice: number;
  qty: number;
  size?: string;
  color?: string;
}

export interface AppliedCode {
  code: string;
  kind: 'promo' | 'coupon';
  amount: number;
  forSubtotal: number;
}

interface CartStore {
  items: CartItem[];
  applied: AppliedCode | null;
  setApplied: (a: AppliedCode | null) => void;
  add: (item: Omit<CartItem, 'qty'>) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  applied: null,
  setApplied: applied => set({ applied }),

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

  clear: () => set({ items: [], applied: null }),
  total: () => get().items.reduce((s, i) => s + i.basePrice * i.qty, 0),
  count: () => get().items.reduce((s, i) => s + i.qty, 0),
}));

// Fields for POST /api/checkout; the server re-validates and computes the discount.
export function codeFields(a: AppliedCode | null, subtotal: number) {
  if (!a || a.forSubtotal !== subtotal) return {};
  return a.kind === 'coupon' ? { couponCode: a.code } : { promoCode: a.code };
}
