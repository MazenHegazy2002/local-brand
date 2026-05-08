'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CountdownTimer from './CountdownTimer';
import type { Product } from '@/types';

interface DealOfTheDayProps {
  heading?: string;
}

/**
 * Pulls the highest-discount flash sale product as the "Deal of the Day".
 * Falls back to the newest flash-sale item or the featured one if no active sale.
 */
export default function DealOfTheDay({ heading = 'Deal of the Day' }: DealOfTheDayProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchDeal = async () => {
      try {
        const res = await fetch('/api/deals/flash-sales?limit=10');
        if (res.ok) {
          const data = await res.json();
          const flashSales: Product[] = data.products || data.flashSales || [];
          if (!cancelled && flashSales.length > 0) {
            // Pick the highest-discount one as the featured deal
            const best = flashSales.reduce<Product>((acc, p) => {
              const accPct = acc.flashSalePrice
                ? ((acc.basePrice - acc.flashSalePrice) / acc.basePrice) * 100
                : 0;
              const pPct = p.flashSalePrice
                ? ((p.basePrice - p.flashSalePrice) / p.basePrice) * 100
                : 0;
              return pPct > accPct ? p : acc;
            }, flashSales[0]);
            setProduct(best);
          }
        }
      } catch (err) {
        console.error('Failed to load deal of the day', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDeal();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-8 md:p-12 animate-pulse">
        <div className="h-6 w-48 bg-white/60 rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square bg-white/60 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-white/60 rounded" />
            <div className="h-4 w-full bg-white/60 rounded" />
            <div className="h-10 w-40 bg-white/60 rounded" />
          </div>
        </div>
      </section>
    );
  }

  if (!product || !product.flashSalePrice || !product.flashSaleEndsAt) return null;

  const discountPct = Math.round(
    ((product.basePrice - product.flashSalePrice) / product.basePrice) * 100
  );
  const primaryImage = product.images?.find((i) => i.isPrimary)?.url || product.images?.[0]?.url;

  return (
    <section className="bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 rounded-3xl p-6 md:p-10 border border-red-100 overflow-hidden relative">
      <div className="absolute top-4 right-4 bg-red-500 text-white rounded-full px-4 py-1 text-xs font-black tracking-wider uppercase shadow-md">
        🔥 {heading}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="aspect-square bg-white rounded-2xl overflow-hidden border border-red-100 shadow-sm">
          {primaryImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primaryImage} alt={product.title} className="w-full h-full object-cover" />
          )}
        </div>

        <div>
          <div className="inline-block bg-red-500 text-white rounded-lg px-3 py-1 text-xs font-black mb-4">
            SAVE {discountPct}%
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 leading-tight">
            {product.title}
          </h2>
          <p className="text-sm text-slate-600 mb-6 line-clamp-2">{product.description}</p>

          <div className="flex items-baseline gap-3 mb-6">
            <div className="text-4xl font-black text-red-600">
              {product.flashSalePrice.toLocaleString()} EGP
            </div>
            <div className="text-lg text-slate-400 line-through">
              {product.basePrice.toLocaleString()} EGP
            </div>
          </div>

          <div className="mb-6">
            <CountdownTimer endsAt={product.flashSaleEndsAt} size="md" label="Offer ends in" />
          </div>

          <Link
            href={`/product/${product.id}`}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-slate-800 transition-colors"
          >
            Grab this deal
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
