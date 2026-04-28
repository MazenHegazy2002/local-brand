'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useLanguage } from '@/providers/LanguageContext';
import WishlistButton from '@/components/WishlistButton';

export default function ProductDetails({ product }: { product: any }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { t } = useLanguage();
  const addItem = useCartStore(s => s.addItem);

  const stockCount = product.variants?.reduce((acc: number, v: any) => acc + v.stockCount, 0) || 0;
  const primaryImage = product.images?.find((i: any) => i.isPrimary)?.url || product.images?.[0]?.url || '/placeholder.png';

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product.id,
        name: product.title,
        price: product.basePrice,
        image: primaryImage,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-4 mb-6">
      {/* Quantity */}
      <div className="flex items-center justify-between border border-gray-200 rounded-lg bg-gray-50 px-2 h-12 w-full sm:w-32">
        <button 
          onClick={() => setQty(Math.max(1, qty - 1))}
          className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors text-xl font-medium"
        >
          −
        </button>
        <div className="font-bold text-gray-900 w-full text-center">{qty}</div>
        <button 
          onClick={() => setQty(Math.min(stockCount, qty + 1))}
          className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors text-xl font-medium"
        >
          +
        </button>
      </div>

      {/* Add to cart */}
      <button 
        onClick={handleAddToCart}
        disabled={added || stockCount === 0}
        className={`flex-1 h-12 rounded-lg font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 ${
          added 
            ? 'bg-green-500 text-white shadow-green-500/20' 
            : 'bg-[#1e3b8a] hover:bg-[#152c6e] text-white shadow-[#1e3b8a]/20'
        } disabled:opacity-50`}
      >
        {added ? (
          <>{t('AddedToCart')}</>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            {t('AddToCart')}
          </>
        )}
      </button>

      {/* Wishlist button */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <WishlistButton product={{
          id: product.id,
          name: product.title,
          price: product.basePrice,
          image: primaryImage,
          brand: product.seller.storeName,
          category: product.category?.name || 'General',
          tags: product.tags.map((t: any) => t.name)
        }} className="!w-12 !h-12 !bg-white border border-gray-200 hover:!bg-gray-50" />
      </div>
    </div>
  );
}
