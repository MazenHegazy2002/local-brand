'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useLanguage } from '@/providers/LanguageContext';
import WishlistButton from '@/components/WishlistButton';

export default function ProductDetails({ product }: { product: any }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const { t } = useLanguage();
  const addItem = useCartStore(s => s.addItem);

  const variants = product.variants || [];
  const hasVariants = variants.length > 1;
  
  const stockCount = hasVariants 
    ? variants.reduce((acc: number, v: any) => acc + v.stockCount, 0)
    : (product.variants?.[0]?.stockCount || 0);
  
  const primaryImage = product.images?.find((i: any) => i.isPrimary)?.url || product.images?.[0]?.url || '/placeholder.png';

  const selectedPrice = selectedVariant?.price || product.basePrice;
  const availableStock = selectedVariant?.stockCount || stockCount;

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) {
      alert('Please select a variant first');
      return;
    }

    for (let i = 0; i < qty; i++) {
      addItem({
        id: selectedVariant?.id || product.id,
        name: product.title,
        price: selectedPrice,
        image: primaryImage,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="space-y-6">
      {/* Variant Selection */}
      {hasVariants && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Option
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {variants.map((variant: any) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isAvailable = variant.stockCount > 0;
              
              return (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  disabled={!isAvailable}
                  className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected 
                      ? 'border-[#1e3b8a] bg-[#1e3b8a]/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  } ${!isAvailable ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                >
                  <div className="font-medium text-sm text-gray-900">
                    {variant.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {variant.price} EGP
                  </div>
                  {!isAvailable && (
                    <div className="absolute top-1 right-1 text-[10px] text-red-500">Out of stock</div>
                  )}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-[#1e3b8a] rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Display */}
      <div className="flex items-center gap-4">
        {selectedVariant?.price && selectedVariant.price !== product.basePrice && (
          <span className="text-xl text-gray-400 line-through">{product.basePrice} EGP</span>
        )}
        <span className="text-3xl font-black text-[#1e3b8a]">{selectedPrice} EGP</span>
      </div>

      {/* Stock Status */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
          availableStock > 5 
            ? 'bg-green-50 text-green-700 border border-green-200'
            : availableStock > 0
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {availableStock > 0 ? (
            <>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {t('InStock')} ({availableStock} {t('Left')})
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Out of Stock
            </>
          )}
        </div>
      </div>

      {/* Quantity & Add to Cart */}
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
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
            onClick={() => setQty(Math.min(availableStock, qty + 1))}
            disabled={availableStock === 0}
            className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors text-xl font-medium disabled:opacity-50"
          >
            +
          </button>
        </div>

        {/* Add to cart */}
        <button 
          onClick={handleAddToCart}
          disabled={added || availableStock === 0}
          className={`flex-1 h-12 rounded-lg font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 ${
            added 
              ? 'bg-green-500 text-white shadow-green-500/20' 
              : availableStock === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#1e3b8a] hover:bg-[#152c6e] text-white shadow-[#1e3b8a]/20'
          }`}
        >
          {added ? (
            <>{t('AddedToCart')}</>
          ) : availableStock === 0 ? (
            <>Out of Stock</>
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
            title: product.title,
            name: product.title,
            basePrice: product.basePrice,
            price: selectedPrice,
            image: primaryImage,
          }} className="!w-12 !h-12 !bg-white border border-gray-200 hover:!bg-gray-50" />
        </div>
      </div>

      {/* Stock Info */}
      {hasVariants && (
        <div className="text-xs text-gray-500">
          Total available: {stockCount} units across all options
        </div>
      )}
    </div>
  );
}