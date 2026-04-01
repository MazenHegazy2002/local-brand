'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useCartStore } from '@/lib/cartStore';
import { MOCK_PRODUCTS } from '@/lib/data';

// Note: Using mock data for client-side demo until full SSR is wired up
export default function ProductPage() {
  const { id } = useParams();
  const product = MOCK_PRODUCTS.find(p => String(p.id) === id);
  const addItem = useCartStore(s => s.addItem);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <main className="min-h-screen bg-[#f9f8f6]">
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center text-gray-500">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
          <p>The product you are looking for does not exist or has been removed.</p>
        </div>
      </main>
    );
  }

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: String(product.id),
        name: product.name,
        price: product.price,
        image: product.image,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 py-3">
        <div className="container mx-auto px-4 text-xs font-semibold text-gray-500 flex items-center gap-2">
          <span>Home</span>
          <span>/</span>
          <span>Shop</span>
          <span>/</span>
          <span className="text-[#1e3b8a]">{product.category}</span>
          <span>/</span>
          <span className="text-gray-900 truncate max-w-[200px]">{product.name}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 lg:gap-16">
          
          {/* Images */}
          <div className="w-full md:w-1/2">
            <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100 mb-4 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>
            {/* Thumbnails placeholder */}
            <div className="flex gap-3">
              <div className="w-20 h-20 rounded-lg bg-gray-50 border-2 border-[#1e3b8a] p-1 cursor-pointer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.image} className="w-full h-full object-cover rounded" alt="" />
              </div>
              <div className="w-20 h-20 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-gray-400">
                + More
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="w-full md:w-1/2 flex flex-col justify-center">
            <Link href={`/shop?q=${encodeURIComponent(product.brand)}`} className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 hover:text-[#1e3b8a] transition-colors">
              {product.brand}
            </Link>
            <h1 className="text-3xl lg:text-4xl font-black text-gray-900 leading-tight mb-4">
              {product.name}
            </h1>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="text-3xl font-black text-[#1e3b8a]">{product.price.toLocaleString()} EGP</div>
              <div className="flex bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-100">
                ✓ In Stock ({product.stock} left)
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed mb-8">
              {product.description}
            </p>

            <div className="h-px w-full bg-gray-100 mb-8" />

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
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors text-xl font-medium"
                >
                  +
                </button>
              </div>

              {/* Add to cart */}
              <button 
                onClick={handleAddToCart}
                disabled={added}
                className={`flex-1 h-12 rounded-lg font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 ${
                  added 
                    ? 'bg-green-500 text-white shadow-green-500/20' 
                    : 'bg-[#1e3b8a] hover:bg-[#152c6e] text-white shadow-[#1e3b8a]/20'
                }`}
              >
                {added ? (
                  <>✓ Added to Cart</>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    Add to Cart
                  </>
                )}
              </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              {product.tags.map(tag => (
                <span key={tag} className="text-xs font-semibold text-gray-500 border border-gray-200 bg-white px-3 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Guarantee */}
            <div className="mt-10 bg-gray-50 border border-gray-100 rounded-xl p-4 flex gap-4">
              <div className="w-10 h-10 shrink-0 bg-[#eef3f7] text-[#1e3b8a] rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">Local Brand Guarantee</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Every product is authenticated. Free returns within 14 days for all domestic orders. Secure payment processing.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
