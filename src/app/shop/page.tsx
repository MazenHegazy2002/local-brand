'use client';

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/lib/cartStore";
import { useLanguage } from "@/providers/LanguageContext";
import WishlistButton from "@/components/WishlistButton";
import { ProductSkeleton, ProductGridSkeleton } from "@/components/Skeleton";

function ShopContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const initialCategory = searchParams.get('category') ?? 'all';
  const initialMinPrice = searchParams.get('minPrice') ?? '';
  const initialMaxPrice = searchParams.get('maxPrice') ?? '';
  
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  
  const addItem = useCartStore(s => s.addItem);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const { t } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (category !== 'all') params.set('category', category);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        params.set('limit', '50');
        
        const res = await fetch(`/api/products?${params.toString()}`);
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

    fetchData();
  }, [q, category, minPrice, maxPrice]);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories || []))
      .catch(err => console.error(err));
  }, []);

  const sortedProducts = useMemo(() => {
    let sorted = [...products];
    if (sort === 'price-asc') sorted.sort((a, b) => a.basePrice - b.basePrice);
    if (sort === 'price-desc') sorted.sort((a, b) => b.basePrice - a.basePrice);
    return sorted;
  }, [products, sort]);

  const handleAddToCart = (product: any) => {
    addItem({
      id: String(product.id),
      name: product.title,
      price: product.basePrice,
      image: product.images?.[0]?.url,
    });
    setAdded(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => setAdded(prev => ({ ...prev, [product.id]: false })), 1200);
  };

  const egp = t('EGP');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900">
            {q ? `${t('ResultsFor')} "${q}"` : category !== 'all' ? categories.find((c: any) => c.slug === category)?.name || 'Products' : t('AllProducts')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{sortedProducts.length} {t('Products')}</p>
        </div>
        <div className="flex gap-3">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('SearchDots')}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3b8a] bg-white"
          />
          <select value={sort} onChange={e => setSort(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white text-gray-700">
            <option value="default">{t('SortDefault')}</option>
            <option value="price-asc">{t('PriceLowHigh')}</option>
            <option value="price-desc">{t('PriceHighLow')}</option>
          </select>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden md:block w-56 shrink-0">
          <div className="bg-white rounded-xl p-4 border border-gray-100 sticky top-4">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-3">{t('Category')}</h3>
            <button 
              onClick={() => setCategory('all')}
              className={`block w-full text-left py-2 px-3 text-sm rounded-md mb-1 transition-colors ${category === 'all' ? 'bg-[#1e3b8a] text-white font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
              {t('All')}
            </button>
            {categories.map((cat: any) => (
              <button 
                key={cat.id}
                onClick={() => setCategory(cat.slug)}
                className={`block w-full text-left py-2 px-3 text-sm rounded-md mb-1 transition-colors ${category === cat.slug ? 'bg-[#1e3b8a] text-white font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
                {cat.name}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 mt-4 sticky top-[calc(4rem+180px)]">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-3">Price Range</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {loading ? (
            <ProductGridSkeleton count={12} />
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-semibold">{t('NoProductsFound')}</p>
              <p className="text-sm mt-2">{t('TryDifferentSearch')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {sortedProducts.map(product => (
                <div key={product.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                  <Link href={`/product/${product.id}`}>
                    <div className="aspect-square relative overflow-hidden bg-gray-50">
                      <img 
                        src={product.images?.[0]?.url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400"} 
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      {product.isFeatured && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className="text-[10px] font-bold bg-[#1e3b8a] text-white px-2 py-0.5 rounded-full">Featured</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 z-20">
                        <WishlistButton product={product} />
                      </div>
                    </div>
                  </Link>
                  <div className="p-3">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{product.category?.name || 'General'}</p>
                    <h3 className="font-bold text-gray-900 text-sm mb-2 leading-tight line-clamp-2">{product.title}</h3>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-[#1e3b8a] text-sm">{product.basePrice?.toLocaleString()} {egp}</span>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${added[product.id] ? 'bg-green-500 text-white' : 'bg-[#1e3b8a] text-white hover:bg-[#152c6e]'}`}>
                        {added[product.id] ? t('Added') : t('Add')}
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
