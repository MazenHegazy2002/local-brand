'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Product } from '@/types';
import { Skeleton } from '@/components/ui';

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchResults() {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Failed to fetch search results');
        const data = await res.json();
        setProducts(data.products || []);
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (query) {
      fetchResults();
    } else {
      setProducts([]);
      setIsLoading(false);
    }
  }, [query]);

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">
          Search Results
        </h1>
        <p className="text-gray-600 mb-8">
          {query ? `Showing results for "${query}"` : 'Enter a search term to find products'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-8">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="w-full aspect-[4/5] rounded-xl" />
                <Skeleton className="w-3/4 h-4" />
                <Skeleton className="w-1/2 h-4" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product: Product) => {
              const image = product.images?.[0]?.url || '';
              return (
                <div key={product.id}>
                  {/* Assuming ProductCard is imported or we just render something basic here if not imported */}
                  <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                    <div className="w-full aspect-[4/5] bg-gray-100">
                       <img src={image} alt={product.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm truncate">{product.title}</h3>
                      <div className="text-[#1e3b8a] font-bold text-sm">{product.basePrice} EGP</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No products found</h2>
            <p className="text-gray-500">
              We couldn't find any products matching your search.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}