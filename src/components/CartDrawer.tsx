'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/lib/cartStore';
import Link from 'next/link';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { Drawer, Button, QuantitySelector } from '@/components/ui';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQty, total, clearCart, rewriteId } = useCartStore();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Whenever the drawer opens, reconcile the cart against the server:
  //   - legacy entries saved with a Product id get rewritten to the
  //     proper ProductVariant id (so they check out cleanly),
  //   - entries whose variant was deleted are silently dropped.
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantIds: items.map(i => i.id) }),
        });
        if (!res.ok) return;
        const data: { invalid?: string[]; rewrites?: Record<string, string> } = await res.json();
        if (cancelled) return;
        if (data.rewrites) {
          for (const [oldId, newId] of Object.entries(data.rewrites)) {
            rewriteId(oldId, newId);
          }
        }
        if (data.invalid?.length) {
          for (const id of data.invalid) removeItem(id);
        }
      } catch {
        /* network error — leave cart alone */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  return (
    <Drawer open={isOpen} onClose={onClose} title="Your Cart" position="right" width="420px">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
          <ShoppingCart size={64} className="opacity-20" />
          <p className="text-gray-500 text-center">Your cart is empty</p>
          <Button onClick={onClose} variant="outline">
            Continue Shopping
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex gap-4 py-4 border-b border-gray-100 animate-slide-in-right"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                  {item.image && item.image.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    (item.emoji ?? '📦')
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-1 truncate">{item.name}</h4>
                  <p className="text-[hsl(var(--primary))] font-bold mb-2">
                    {(item.price * item.qty).toLocaleString()} EGP
                  </p>

                  <div className="flex items-center gap-3">
                    <QuantitySelector
                      value={item.qty}
                      min={1}
                      onChange={qty => updateQty(item.id, qty)}
                    />
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 p-6 bg-white">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-xl font-bold text-gray-900">
                {total().toLocaleString()} EGP
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Shipping & taxes calculated at checkout</p>

            <Link
              href="/checkout"
              onClick={onClose}
              className="block text-center w-full bg-[hsl(var(--primary))] text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition-all"
            >
              Checkout — {total().toLocaleString()} EGP
            </Link>

            <button
              onClick={clearCart}
              className="w-full mt-3 py-2.5 text-gray-500 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Clear cart
            </button>
          </div>
        </>
      )}
    </Drawer>
  );
}
