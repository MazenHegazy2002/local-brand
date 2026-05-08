'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/types';

interface RelatedProductsProps {
  productId: string;
  heading?: string;
  type?: 'similar' | 'trending' | 'personalized';
  limit?: number;
}

export default function RelatedProducts({
  productId,
  heading = 'You may also like',
  type = 'similar',
  limit = 6,
}: RelatedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchRecommendations = async () => {
      try {
        const res = await fetch(`/api/products/${productId}/recommendations?type=${type}&limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setProducts(data.recommendations || []);
        }
      } catch (err) {
        console.error('Failed to load recommendations', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRecommendations();
    return () => { cancelled = true; };
  }, [productId, type, limit]);

  if (loading) {
    return (
      <section className="mt-16">
        <h2 className="text-2xl font-black text-gray-900 mb-6">{heading}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-black text-gray-900 mb-6">{heading}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {products.map((product) => {
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
