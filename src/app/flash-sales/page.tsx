'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import Image from 'next/image';
import { Zap } from 'lucide-react';

interface FlashProduct {
  id: string;
  title: string;
  basePrice: number;
  flashSalePrice: number;
  flashSaleEndsAt: string;
  flashSaleLimit: number | null;
  stockCount: number;
  images: { url: string }[];
  seller: { storeName: string };
  category: { name: string } | null;
}

function useCountdown(endsAt: string) {
  const calc = useCallback(() => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { h, m, s, expired: false };
  }, [endsAt]);

  const [time, setTime] = useState(calc);

  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);

  return time;
}

function CountdownBadge({ endsAt }: { endsAt: string }) {
  const { h, m, s, expired } = useCountdown(endsAt);
  if (expired) return <span className="text-xs font-bold text-red-500">Expired</span>;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="flex items-center gap-1 text-xs font-mono font-bold">
      <span className="bg-gray-900 text-white rounded px-1.5 py-0.5">{pad(h)}</span>
      <span className="text-gray-500">:</span>
      <span className="bg-gray-900 text-white rounded px-1.5 py-0.5">{pad(m)}</span>
      <span className="text-gray-500">:</span>
      <span className="bg-gray-900 text-white rounded px-1.5 py-0.5">{pad(s)}</span>
    </div>
  );
}

function FlashCard({ product }: { product: FlashProduct }) {
  const discount = Math.round(
    ((product.basePrice - product.flashSalePrice) / product.basePrice) * 100
  );
  const img = product.images[0]?.url ?? '/og-image.png';

  return (
    <Link
      href={`/product/${product.id}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <Image
          src={img}
          alt={product.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
          -{discount}%
        </div>
        {product.flashSaleLimit && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
              <div className="text-[10px] text-gray-500 mb-0.5">{product.stockCount} left</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-red-500 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (product.stockCount / product.flashSaleLimit) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-[11px] text-gray-400 mb-1 truncate">{product.category?.name}</p>
        <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 mb-2">
          {product.title}
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base font-black text-red-600">
            {product.flashSalePrice.toLocaleString()} EGP
          </span>
          <span className="text-xs text-gray-400 line-through">
            {product.basePrice.toLocaleString()} EGP
          </span>
        </div>
        <CountdownBadge endsAt={product.flashSaleEndsAt} />
      </div>
    </Link>
  );
}

export default function FlashSalesPage() {
  const [products, setProducts] = useState<FlashProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'discount' | 'ending' | 'price'>('ending');

  useEffect(() => {
    fetch('/api/flash-sales')
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...products].sort((a, b) => {
    if (sortBy === 'discount') {
      const da = (a.basePrice - a.flashSalePrice) / a.basePrice;
      const db = (b.basePrice - b.flashSalePrice) / b.basePrice;
      return db - da;
    }
    if (sortBy === 'ending') {
      return new Date(a.flashSaleEndsAt).getTime() - new Date(b.flashSaleEndsAt).getTime();
    }
    return a.flashSalePrice - b.flashSalePrice;
  });

  return (
    <div className="min-h-screen bg-[#f9f8f6]">
      <Navbar />

      {/* Hero banner */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-7 h-7 fill-yellow-300 stroke-yellow-300" />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Flash Sales</h1>
          </div>
          <p className="text-white/80 text-sm md:text-base max-w-lg">
            Massive discounts for a limited time only. Grab them before they expire!
          </p>
          {products.length > 0 && (
            <p className="text-white/70 text-xs mt-2">
              {products.length} deal{products.length !== 1 ? 's' : ''} live right now
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Sort bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${sorted.length} deals`}
          </p>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="ending">Ending Soon</option>
            <option value="discount">Biggest Discount</option>
            <option value="price">Lowest Price</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="aspect-square bg-gray-100 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
            <Zap className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No flash sales right now</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
              Check back soon — sellers launch new deals throughout the day.
            </p>
            <Link
              href="/shop"
              className="inline-block px-6 py-2.5 bg-[#1e3b8a] text-white rounded-full text-sm font-semibold hover:bg-[#16307a] transition-colors"
            >
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {sorted.map(p => (
              <FlashCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
