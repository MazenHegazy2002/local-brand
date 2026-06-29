'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Product } from '@/types';
import { Skeleton } from '@/components/ui';
import ProductCard, { ProductCardProduct } from '@/components/ProductCard';

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
        <h1 className="text-3xl font-black text-gray-900 mb-2">Search Results</h1>
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
            {products.map((product: Product, idx: number) => (
              <ProductCard
                key={product.id}
                product={
                  {
                    ...product,
                    name: product.title,
                    image: product.images?.[0]?.url,
                    brand: product.seller?.storeName || 'Local Brand',
                    brandSlug: product.seller?.storeName
                      ? product.seller.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                      : '',
                  } as ProductCardProduct
                }
                index={idx}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No products found</h2>
            <p className="text-gray-500">We couldn't find any products matching your search.</p>
          </div>
        )}
      </div>
    </main>
  );
}
