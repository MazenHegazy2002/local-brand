'use client';

import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCartStore } from '@/lib/cartStore';
import { useLanguage } from '@/providers/LanguageContext';

function CompareContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids') || '';
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});
  const addItem = useCartStore(s => s.addItem);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchProducts = async () => {
      if (!idsParam) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/products/compare?ids=${idsParam}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [idsParam]);

  const removeFromCompare = (productId: string) => {
    const currentIds = idsParam.split(',').filter(id => id !== productId);
    if (currentIds.length > 0) {
      window.location.href = `/compare?ids=${currentIds.join(',')}`;
    } else {
      window.location.href = '/compare';
    }
  };

  const handleAddToCart = (product: any) => {
    addItem({
      id: String(product.id),
      name: product.title,
      price: product.basePrice,
      image: product.image,
    });
    setAddedToCart(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => setAddedToCart(prev => ({ ...prev, [product.id]: false })), 1500);
  };

  const egp = t('EGP');

  const comparisonRows = [
    { label: 'Image', key: 'image', render: (p: any) => (
      <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden mx-auto">
        {p.image && <img src={p.image} alt={p.title} className="w-full h-full object-cover" />}
      </div>
    )},
    { label: 'Price', key: 'price', render: (p: any) => (
      <span className="font-black text-lg text-[#1e3b8a]">{p.basePrice?.toLocaleString()} {egp}</span>
    )},
    { label: 'Rating', key: 'rating', render: (p: any) => (
      <div className="flex items-center gap-1">
        <span className="text-yellow-400">★</span>
        <span className="font-medium">{p.reviewCount || 0}</span>
        <span className="text-gray-400 text-xs">reviews</span>
      </div>
    )},
    { label: 'Brand', key: 'brand', render: (p: any) => (
      <span className="font-semibold text-gray-700">{p.seller}</span>
    )},
    { label: 'Description', key: 'description', render: (p: any) => (
      <span className="text-gray-500 text-xs line-clamp-2">High-quality product with excellent features</span>
    )},
    { label: 'Stock', key: 'stock', render: (p: any) => (
      p.stockCount > 0 ? (
        <span className="text-green-600 font-semibold text-sm">✓ In Stock ({p.stockCount})</span>
      ) : (
        <span className="text-red-500 font-semibold text-sm">Out of Stock</span>
      )
    )},
    { label: 'Seller', key: 'seller', render: (p: any) => (
      <span className="text-gray-600 text-sm">{p.seller}</span>
    )},
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f8f6]">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="animate-pulse">Loading comparison...</div>
        </div>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="min-h-screen bg-[#f9f8f6]">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚖️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Products to Compare</h1>
            <p className="text-gray-500 mb-8">Add products to start comparing them side by side.</p>
            <Link href="/shop" className="inline-block bg-[#1e3b8a] hover:bg-[#152c6e] text-white font-bold px-6 py-3 rounded-xl">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Compare Products</h1>
            <p className="text-gray-500">{products.length} products being compared</p>
          </div>
          <Link href="/shop" className="text-[#1e3b8a] font-semibold hover:underline">
            + Add More
          </Link>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 text-gray-400 font-semibold text-sm bg-gray-50 w-32"></th>
                  {products.map(product => (
                    <th key={product.id} className="p-4 min-w-[200px]">
                      <div className="flex flex-col items-center">
                        <button 
                          onClick={() => removeFromCompare(product.id)}
                          className="text-gray-400 hover:text-red-500 text-xs mb-2"
                        >
                          ✕ Remove
                        </button>
                        <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden mb-3">
                          {product.image && (
                            <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm text-center line-clamp-2">{product.title}</h3>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr key={row.key} className={`border-b border-gray-50 ${idx === comparisonRows.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="p-4 text-gray-500 font-semibold text-sm bg-gray-50 w-32">
                      {row.label}
                    </td>
                    {products.map(product => (
                      <td key={product.id} className="p-4 text-center">
                        {row.render(product)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="p-4 bg-gray-50 w-32"></td>
                  {products.map(product => (
                    <td key={product.id} className="p-4">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={addedToCart[product.id] || product.stockCount === 0}
                          className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
                            addedToCart[product.id]
                              ? 'bg-green-500 text-white'
                              : product.stockCount === 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-[#1e3b8a] hover:bg-[#152c6e] text-white'
                          }`}
                        >
                          {addedToCart[product.id] ? '✓ Added' : 'Add to Cart'}
                        </button>
                        <Link
                          href={`/product/${product.id}`}
                          className="w-full py-2 border border-gray-200 text-gray-700 font-semibold text-sm rounded-lg text-center hover:bg-gray-50"
                        >
                          View Details
                        </Link>
                      </div>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sticky Add to Cart for Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden">
          <div className="flex gap-3">
            <select className="flex-1 border border-gray-200 rounded-lg px-3 py-2 bg-white">
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.title.slice(0, 30)}</option>
              ))}
            </select>
            <button className="px-6 bg-[#1e3b8a] text-white font-bold rounded-lg">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f9f8f6]">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">Loading...</div>
      </div>
    }>
    &gt;
      <CompareContent />
    </Suspense>
  );
}