'use client';

import { useCartStore } from '@/lib/cartStore';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import Image from 'next/image';

// Dedicated /cart page — renders the full cart with all items.
// The slide-out CartDrawer still works via the navbar icon;
// this page ensures /cart bookmarks and direct links don't 404.
export default function CartPage() {
  const items = useCartStore(s => s.items);
  const removeItem = useCartStore(s => s.removeItem);
  const updateQty = useCartStore(s => s.updateQty);
  const total = useCartStore(s => s.total());
  const count = useCartStore(s => s.count());

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />

      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Your Cart</h1>
        <p className="text-gray-500 mb-8">
          {count === 0
            ? 'Your cart is empty.'
            : `${count} item${count !== 1 ? 's' : ''} in your cart`}
        </p>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="text-5xl mb-4">🛒</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Nothing here yet</h2>
            <p className="text-gray-500 mb-6">Add some products to get started.</p>
            <Link
              href="/shop"
              className="inline-block bg-[#1e3b8a] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#152c6e] transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items list */}
            <div className="lg:col-span-2 space-y-3">
              {items.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4"
                >
                  {/* Image */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-50">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {item.emoji ?? '🛍️'}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm line-clamp-2">{item.name}</p>
                    {(item.selectedSize || item.selectedColor) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[item.selectedSize, item.selectedColor].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-[#1e3b8a] font-black text-base mt-1">
                      EGP {(item.price * item.qty).toLocaleString()}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateQty(item.id, Math.max(1, item.qty - 1))}
                      className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-sm"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-sm"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="shrink-0 text-gray-400 hover:text-red-500 transition-colors ml-2"
                    aria-label={`Remove ${item.name}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-24">
                <h2 className="font-black text-gray-900 text-lg mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>
                      Subtotal ({count} item{count !== 1 ? 's' : ''})
                    </span>
                    <span className="font-semibold">EGP {total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-600 font-semibold">Calculated at checkout</span>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between text-base font-black text-gray-900">
                    <span>Total</span>
                    <span className="text-[#1e3b8a]">EGP {total.toLocaleString()}</span>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="mt-6 block w-full text-center bg-[#1e3b8a] text-white font-black py-3.5 rounded-xl hover:bg-[#152c6e] transition-colors shadow-sm"
                >
                  Proceed to Checkout →
                </Link>
                <Link
                  href="/shop"
                  className="mt-3 block w-full text-center text-sm text-[#1e3b8a] font-semibold hover:underline"
                >
                  ← Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
