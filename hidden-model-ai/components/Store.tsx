import React, { useState } from 'react';
import { DonnerLogo } from './ui/DonnerLogo';
import { ShoppingBagIcon, SparklesIcon, XIcon, PlusIcon, MinusIcon, TrashIcon } from 'lucide-react';
import { Product } from './store/storeData';
import StoreHome from './store/StoreHome';
import StoreShop from './store/StoreShop';
import ProductDetails from './store/ProductDetails';
import StoreCart from './store/StoreCart';

type ViewState = 'HOME' | 'SHOP' | 'CART';

const Store: React.FC = () => {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [cart, setCart] = useState<Product[]>([]);

  const navigateTo = (view: ViewState) => {
    setCurrentView(view);
    setActiveProduct(null);
    window.scrollTo(0, 0);
  };

  const addToCart = (product: Product) => {
    setCart([...cart, product]);
    alert(`${product.name} added to bag`);
  };

  const removeFromCart = (indexToRemove: number) => {
    setCart(cart.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCheckout = () => {
    alert('Checkout initiated! (This is a demo)');
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-cream font-sans selection:bg-brand-primary">
      {/* Announcement Bar */}
      <div className="bg-brand-dark text-brand-cream/80 text-[10px] font-bold text-center py-2.5 tracking-[0.2em] uppercase">
        Free Shipping on Orders Over $100 — Worldwide
      </div>

      {/* Navigation */}
      <nav className="border-b border-brand-cream/10 sticky top-0 bg-brand-bg/90 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 mb-6 md:mb-0">
            <DonnerLogo className="h-32 w-auto text-brand-accent transform scale-125 origin-left" />
          </div>

          <div className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-widest text-brand-cream/60">
            <button
              onClick={() => navigateTo('HOME')}
              className={`hover:text-brand-accent transition-colors ${currentView === 'HOME' && !activeProduct ? 'text-brand-accent' : ''}`}
            >
              Home
            </button>
            <button
              onClick={() => navigateTo('SHOP')}
              className={`hover:text-brand-accent transition-colors ${currentView === 'SHOP' && !activeProduct ? 'text-brand-accent' : ''}`}
            >
              Shop
            </button>
            {/* Editorial Removed */}
          </div>

          <div className="flex gap-4">
            <button className="p-2 hover:bg-brand-primary/20 rounded-full transition-colors">
              <span className="sr-only">Search</span>🔍
            </button>
            <button
              onClick={() => navigateTo('CART')}
              className={`p-2 hover:bg-brand-primary/20 rounded-full transition-colors relative ${currentView === 'CART' ? 'bg-brand-primary/30' : ''}`}
              title={`${cart.length} items in bag`}
            >
              <span className="sr-only">Cart</span>
              🛒
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-brand-accent text-brand-bg text-[9px] flex items-center justify-center rounded-full font-bold">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <main>
        {activeProduct ? (
          <ProductDetails
            product={activeProduct}
            onBack={() => setActiveProduct(null)}
            onAddToCart={() => addToCart(activeProduct)}
          />
        ) : currentView === 'CART' ? (
          <StoreCart
            cart={cart}
            onRemove={removeFromCart}
            onCheckout={handleCheckout}
            onContinueShopping={() => navigateTo('SHOP')}
          />
        ) : currentView === 'SHOP' ? (
          <StoreShop onProductSelect={setActiveProduct} />
        ) : (
          <StoreHome onProductSelect={setActiveProduct} />
        )}
      </main>

      <footer className="border-t border-brand-cream/10 bg-brand-dark/30 mt-auto pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 text-sm text-brand-cream/60">
          <div className="space-y-4">
            <h4 className="font-bold text-brand-cream uppercase tracking-widest">About</h4>
            <p>
              Redefining the digital shopping experience through generative AI and virtual garment
              fitting.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-brand-cream uppercase tracking-widest">Customer Care</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-brand-accent">
                  Shipping & Returns
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-accent">
                  Size Guide
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-accent">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-brand-cream uppercase tracking-widest">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-brand-accent">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-accent">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-brand-cream uppercase tracking-widest">Newsletter</h4>
            <div className="flex bg-brand-dark border border-brand-cream/20 p-1 rounded-lg">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 outline-none text-xs bg-transparent text-brand-cream placeholder-brand-cream/30"
              />
              <button className="px-4 py-2 bg-brand-accent text-brand-bg text-[10px] font-bold uppercase tracking-widest rounded hover:bg-brand-cream">
                Join
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-20 pt-8 border-t border-brand-cream/10 text-center">
          <p className="text-[10px] uppercase tracking-widest text-brand-cream/40">
            &copy; 2026 DONNER AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Store;
