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

// One bag line per product + size + color, so two colors of the same item stay separate.
export const lineKey = (i: Pick<CartItem, 'productId' | 'size' | 'color'>) =>
  `${i.productId}|${i.size ?? ''}|${i.color ?? ''}`;

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
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
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
      const k = lineKey(item);
      if (s.items.some(i => lineKey(i) === k))
        return { items: s.items.map(i => (lineKey(i) === k ? { ...i, qty: i.qty + 1 } : i)) };
      return { items: [...s.items, { ...item, qty: 1 }] };
    }),

  remove: key => set(s => ({ items: s.items.filter(i => lineKey(i) !== key) })),

  setQty: (key, qty) =>
    set(s => ({
      items:
        qty <= 0
          ? s.items.filter(i => lineKey(i) !== key)
          : s.items.map(i => (lineKey(i) === key ? { ...i, qty } : i)),
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
