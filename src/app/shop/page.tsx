'use client';

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/lib/cartStore";
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from "@/lib/data";

import { Suspense } from "react";

function ShopContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const addItem = useCartStore(s => s.addItem);
  const [added, setAdded] = useState<Record<number, boolean>>({});

  // Update q when URL param changes  
  useEffect(() => { setQ(searchParams.get('q') ?? ''); }, [searchParams]);

  const categories = ['All', ...MOCK_CATEGORIES];

  let filtered = MOCK_PRODUCTS
    .filter(p => category === 'All' || p.category === category)
    .filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.brand.toLowerCase().includes(q.toLowerCase()));

  if (sort === 'price-asc') filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') filtered = [...filtered].sort((a, b) => b.price - a.price);

  const handleAddToCart = (product: typeof MOCK_PRODUCTS[0]) => {
    addItem({
      id: String(product.id),
      name: product.name,
      price: product.price,
      image: product.image,
    });
    setAdded(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => setAdded(prev => ({ ...prev, [product.id]: false })), 1200);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header + search */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900">
            {q ? `Results for "${q}"` : category === 'All' ? 'All Products' : category}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} products</p>
        </div>
        <div className="flex gap-3">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search..."
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3b8a] bg-white"
          />
          <select value={sort} onChange={e => setSort(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white text-gray-700">
            <option value="default">Sort: Default</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className="hidden md:block w-48 shrink-0">
          <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-3">Category</h3>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`block w-full text-left py-1.5 px-3 text-sm rounded-md mb-1 transition-colors ${category === cat ? 'bg-[#1e3b8a] text-white font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
              {cat}
            </button>
          ))}
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-semibold">No products found</p>
              <p className="text-sm mt-2">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filtered.map(product => (
                <div key={product.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                  <Link href={`/product/${product.id}`}>
                    <div className="aspect-square relative overflow-hidden bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-2 left-2">
                        {product.tags.slice(0, 1).map(t => (
                          <span key={t} className="text-[10px] font-bold bg-[#1e3b8a] text-white px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    </div>
                  </Link>
                  <div className="p-3">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{product.brand}</p>
                    <h3 className="font-bold text-gray-900 text-sm mb-2 leading-tight line-clamp-2">{product.name}</h3>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-[#1e3b8a] text-sm">{product.price.toLocaleString()} EGP</span>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${added[product.id] ? 'bg-green-500 text-white' : 'bg-[#1e3b8a] text-white hover:bg-[#152c6e]'}`}>
                        {added[product.id] ? '✓ Added' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center">Loading shop...</div>}>
        <ShopContent />
      </Suspense>
    </main>
  );
}
