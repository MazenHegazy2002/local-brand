'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRecentlyViewedStore } from '@/lib/recentlyViewedStore';
import type { Product } from '@/types';

interface RecentlyViewedProps {
  /** Product ID to exclude (e.g. when displayed on a product detail page, exclude the current product). */
  excludeId?: string;
  /** Register the given product id as viewed on mount. */
  trackId?: string;
  heading?: string;
  limit?: number;
}

export default function RecentlyViewed({
  excludeId,
  trackId,
  heading = 'Recently viewed',
  limit = 6,
}: RecentlyViewedProps) {
  const { productIds, addProduct } = useRecentlyViewedStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Track visit
  useEffect(() => {
    if (trackId) addProduct(trackId);
  }, [trackId, addProduct]);

  // Load full product data for the tracked ids
  useEffect(() => {
    const ids = productIds.filter((id) => id !== excludeId).slice(0, limit);
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        const res = await fetch(`/api/products?ids=${ids.join(',')}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            // Preserve the recent-first order.
            const map = new Map<string, Product>(
              (data.products || []).map((p: Product) => [p.id, p])
            );
            const ordered = ids
              .map((id) => map.get(id))
              .filter((p): p is Product => !!p);
            setProducts(ordered);
          }
        }
      } catch (err) {
        console.error('Recently viewed load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productIds, excludeId, limit]);

  if (products.length === 0 && !loading) return null;

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-black text-gray-900 mb-6">{heading}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))
          : products.map((product) => {
              const image = product.images?.[0]?.url;
              return (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 min-h-[32px]">
                      {product.title}
                    </h3>
                    <div className="text-sm font-black text-[#1e3b8a] mt-2">
                      {product.basePrice.toLocaleString()} EGP
                    </div>
                  </div>
                </Link>
              );
            })}
      </div>
    </section>
  );
}
