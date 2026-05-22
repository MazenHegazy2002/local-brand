import React, { useMemo } from 'react';
import { Product } from './storeData';

interface StoreCartProps {
  cart: Product[];
  onRemove: (index: number) => void;
  onCheckout: () => void;
  onContinueShopping: () => void;
}

const StoreCart: React.FC<StoreCartProps> = ({
  cart,
  onRemove,
  onCheckout,
  onContinueShopping,
}) => {
  const total = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = parseFloat(item.price.replace('$', ''));
      return acc + price;
    }, 0);
  }, [cart]);

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 animate-in fade-in">
        <div className="w-20 h-20 bg-brand-dark rounded-full flex items-center justify-center text-4xl border border-brand-cream/10">
          🛒
        </div>
        <h2 className="text-2xl font-bold text-brand-cream">Your bag is empty</h2>
        <p className="text-brand-cream/60">Looks like you haven't found anything yet.</p>
        <button
          onClick={onContinueShopping}
          className="px-8 py-4 bg-brand-accent text-brand-bg text-xs font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition-transform hover:bg-brand-cream"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in slide-in-from-bottom-4">
      <h1 className="text-4xl font-black tracking-tight text-brand-cream mb-12">
        Shopping Bag ({cart.length})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {cart.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="flex gap-6 p-6 border border-brand-cream/10 rounded-2xl bg-brand-dark/30"
            >
              <div className="w-24 h-32 flex-shrink-0 bg-brand-dark rounded-lg overflow-hidden border border-brand-cream/5">
                <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-brand-cream">{item.name}</h3>
                      <p className="text-xs text-brand-cream/60 mt-1">{item.category}</p>
                    </div>
                    <p className="font-medium text-brand-cream">{item.price}</p>
                  </div>
                </div>
                <button
                  onClick={() => onRemove(index)}
                  className="text-xs font-bold text-brand-primary uppercase tracking-wider self-start hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-brand-dark/30 p-8 rounded-2xl border border-brand-cream/10 sticky top-24">
            <h3 className="text-lg font-bold mb-6 text-brand-cream">Order Summary</h3>

            <div className="space-y-4 text-sm mb-8 border-b border-brand-cream/10 pb-8">
              <div className="flex justify-between">
                <span className="text-brand-cream/60">Subtotal</span>
                <span className="font-medium text-brand-cream">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-cream/60">Shipping</span>
                <span className="font-medium text-brand-accent">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-cream/60">Taxes</span>
                <span className="font-medium text-brand-cream">Calculated at checkout</span>
              </div>
            </div>

            <div className="flex justify-between text-lg font-bold mb-8 text-brand-cream">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <button
              onClick={onCheckout}
              className="w-full py-4 bg-brand-cream text-brand-bg text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-white transition-colors"
            >
              Proceed to Checkout
            </button>
            <div className="mt-4 text-center">
              <button
                onClick={onContinueShopping}
                className="text-xs font-bold text-brand-cream/60 hover:text-brand-cream uppercase tracking-wider"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreCart;
