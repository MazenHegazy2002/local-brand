'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/lib/cartStore';
import Link from 'next/link';
import { ShoppingCart, Trash2, Tag, X } from 'lucide-react';
import { Drawer, Button, QuantitySelector } from '@/components/ui';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQty, total, clearCart, rewriteId } = useCartStore();
  const [isAnimating, setIsAnimating] = useState(false);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);

  const applyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setApplyingPromo(true);
    setPromoError('');
    try {
      const subtotal = total();
      // Try store coupon first
      const res = await fetch('/api/coupons/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cartTotal: subtotal }),
      });
      const couponData: { discountAmount?: number; message?: string } = await res.json();
      if (res.ok && couponData.discountAmount) {
        setPromoApplied({ code, discount: couponData.discountAmount });
        setPromoCode('');
        return;
      }
      // Try affiliate promo code
      const affRes = await fetch('/api/checkout/apply-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orderTotalEgp: subtotal }),
      });
      const affData: { valid: boolean; reason?: string; discountAmountEgp?: number } =
        await affRes.json();
      if (affData.valid && affData.discountAmountEgp) {
        setPromoApplied({ code, discount: affData.discountAmountEgp });
        setPromoCode('');
        return;
      }
      setPromoError(affData.reason || couponData.message || 'Invalid promo code');
    } catch {
      setPromoError('Failed to apply promo code');
    } finally {
      setApplyingPromo(false);
    }
  };

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
          body: JSON.stringify({ variantIds: items.map(i => i.variantId || i.id) }),
        });
        if (!res.ok) return;
        const data: { invalid?: string[]; rewrites?: Record<string, string> } = await res.json();
        if (cancelled) return;
        if (data.rewrites) {
          for (const [oldId, newId] of Object.entries(data.rewrites)) {
            // Reconcile legacy ID to the new variant ID
            const sourceItem = items.find(i => i.id === oldId || i.variantId === oldId);
            if (sourceItem) {
              rewriteId(sourceItem.id, newId);
            }
          }
        }
        if (data.invalid?.length) {
          for (const invalidVariantId of data.invalid) {
            // Find all composite items sharing this variant ID
            const matchedItems = items.filter(i => (i.variantId || i.id) === invalidVariantId);
            for (const mi of matchedItems) {
              removeItem(mi.id);
            }
          }
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
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    (item.emoji ?? '📦')
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-1 truncate">{item.name}</h4>
                  {(item.selectedColor || item.selectedSize) && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5 text-xs text-gray-500 font-medium">
                      {item.selectedColor && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                          Color: {item.selectedColor}
                        </span>
                      )}
                      {item.selectedSize && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                          Size: {item.selectedSize}
                        </span>
                      )}
                    </div>
                  )}
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

          <div className="border-t border-gray-100 p-6 bg-white space-y-4">
            {/* Promo code */}
            {promoApplied ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2 text-green-800">
                  <Tag size={14} />
                  <span className="text-sm font-bold">{promoApplied.code}</span>
                  <span className="text-sm text-green-600">
                    −{promoApplied.discount.toLocaleString()} EGP
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPromoApplied(null);
                    setPromoError('');
                  }}
                  className="text-green-700 hover:text-green-900"
                  aria-label="Remove promo code"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={e => {
                      setPromoCode(e.target.value.toUpperCase());
                      setPromoError('');
                    }}
                    onKeyDown={e => e.key === 'Enter' && applyPromo()}
                    placeholder="Promo / affiliate code"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  />
                  <button
                    onClick={applyPromo}
                    disabled={applyingPromo || !promoCode.trim()}
                    className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg text-sm font-bold disabled:opacity-50 shrink-0"
                  >
                    {applyingPromo ? '...' : 'Apply'}
                  </button>
                </div>
                {promoError && <p className="text-red-500 text-xs mt-1">{promoError}</p>}
              </div>
            )}

            {/* Subtotal */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Subtotal</span>
              <span
                className={`text-xl font-bold ${promoApplied ? 'text-gray-400 line-through text-base' : 'text-gray-900'}`}
              >
                {total().toLocaleString()} EGP
              </span>
            </div>
            {promoApplied && (
              <div className="flex justify-between items-center -mt-3">
                <span className="text-green-600 text-sm font-medium">After discount</span>
                <span className="text-xl font-bold text-gray-900">
                  {Math.max(0, total() - promoApplied.discount).toLocaleString()} EGP
                </span>
              </div>
            )}
            <p className="text-xs text-gray-400">Shipping & taxes calculated at checkout</p>

            <Link
              href={promoApplied ? `/checkout?promo=${promoApplied.code}` : '/checkout'}
              onClick={onClose}
              className="block text-center w-full bg-[hsl(var(--primary))] text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition-all"
            >
              Checkout — {Math.max(0, total() - (promoApplied?.discount ?? 0)).toLocaleString()} EGP
            </Link>

            <button
              onClick={clearCart}
              className="w-full py-2.5 text-gray-500 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Clear cart
            </button>
          </div>
        </>
      )}
    </Drawer>
  );
}
