'use client';

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/lib/cartStore";
import { useLanguage } from "@/providers/LanguageContext";
import WishlistButton from "@/components/WishlistButton";
import { ProductSkeleton, ProductGridSkeleton } from "@/components/Skeleton";
import { Product, Category, Tag } from "@/types";

interface FilterState {
  q: string;
  category: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  tags: string;
  condition: string;
  inStock: boolean;
  flashSale: boolean;
  rating: number;
  sort: string;
}

interface Brand {
  storeSlug: string;
  storeName: string;
}

function ShopContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const initialCategory = searchParams.get('category') ?? 'all';
  const initialMinPrice = searchParams.get('minPrice') ?? '';
  const initialMaxPrice = searchParams.get('maxPrice') ?? '';
  
  const [filters, setFilters] = useState<FilterState>({
    q: initialQ,
    category: initialCategory,
    brand: '',
    minPrice: initialMinPrice,
    maxPrice: initialMaxPrice,
    tags: '',
    condition: '',
    inStock: false,
    flashSale: false,
    rating: 0,
    sort: 'newest',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  
  const addItem = useCartStore(s => s.addItem);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const { t } = useLanguage();

  const fetchFilters = async () => {
    try {
      const res = await fetch('/api/products/filters');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setBrands(data.brands || []);
        setTags(data.tags || []);
        if (data.priceRange) {
          setPriceRange(data.priceRange);
        }
      }
    } catch (e) { console.error(e); }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.brand) params.set('brand', filters.brand);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.tags) params.set('tags', filters.tags);
      if (filters.condition) params.set('condition', filters.condition);
      if (filters.inStock) params.set('inStock', 'true');
      if (filters.flashSale) params.set('flashSale', 'true');
      if (filters.rating > 0) params.set('rating', String(filters.rating));
      params.set('sort', filters.sort);
      params.set('limit', '50');
      
      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFilters(); }, []);
  useEffect(() => { fetchProducts(); }, [filters]);

  const handleFilterChange = (key: keyof FilterState, value: string | number | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      q: '',
      category: 'all',
      brand: '',
      minPrice: '',
      maxPrice: '',
      tags: '',
      condition: '',
      inStock: false,
      flashSale: false,
      rating: 0,
      sort: 'newest',
    });
  };

  const sortedProducts = useMemo(() => {
    let sorted = [...products];
    if (filters.sort === 'price-asc') sorted.sort((a, b) => a.basePrice - b.basePrice);
    if (filters.sort === 'price-desc') sorted.sort((a, b) => b.basePrice - a.basePrice);
    return sorted;
  }, [products, filters.sort]);

  const handleAddToCart = (product: Product) => {
    // Prefer the product's default variant id — that's the id the cart and
    // order pipeline actually expect. Fall back to the product id (the cart
    // validation endpoint can rewrite that for us on the next open).
    const variant = product.variants?.[0];
    addItem({
      id: String(variant?.id ?? product.id),
      name: product.title,
      price: variant?.price ?? product.basePrice,
      image: product.images?.[0]?.url || '',
    });
    setAdded(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => setAdded(prev => ({ ...prev, [product.id]: false })), 1200);
  };

  const egp = t('EGP');

  const activeFilterCount = [
    filters.brand, filters.condition, filters.inStock, filters.flashSale, filters.rating > 0, filters.tags
  ].filter(Boolean).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900">
            {filters.q ? `${t('ResultsFor')} "${filters.q}"` : filters.category !== 'all' ? categories.find((c: Category) => c.slug === filters.category)?.name || 'Products' : t('AllProducts')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{sortedProducts.length} {t('Products')}</p>
        </div>
        <div className="flex gap-3 items-center">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold ${showFilters ? 'bg-[#1e3b8a] text-white border-[#1e3b8a]' : 'bg-white border-gray-200'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            {t('Filters')}
            {activeFilterCount > 0 && <span className="bg-white text-[#1e3b8a] px-1.5 rounded-full text-xs">{activeFilterCount}</span>}
          </button>
          <input
            value={filters.q}
            onChange={e => handleFilterChange('q', e.target.value)}
            placeholder={t('SearchDots')}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3b8a] bg-white"
          />
          <select value={filters.sort} onChange={e => handleFilterChange('sort', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white text-gray-700">
            <option value="newest">{t('Newest')}</option>
            <option value="oldest">{t('Oldest')}</option>
            <option value="price-asc">{t('PriceLowHigh')}</option>
            <option value="price-desc">{t('PriceHighLow')}</option>
            <option value="rating">{t('TopRated')}</option>
            <option value="featured">{t('Featured')}</option>
          </select>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className={`${showFilters ? 'block' : 'hidden'} md:block w-56 shrink-0`}>
          <div className="bg-white rounded-xl p-4 border border-gray-100 sticky top-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{t('Filters')}</h3>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">{t('ClearAll')}</button>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">{t('Category')}</label>
              <select value={filters.category} onChange={e => handleFilterChange('category', e.target.value)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white">
                <option value="all">{t('All')}</option>
                {categories.map((cat: Category) => (
                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">{t('Brand')}</label>
              <select value={filters.brand} onChange={e => handleFilterChange('brand', e.target.value)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white">
                <option value="">All Brands</option>
                {brands.map((b: Brand) => (
                  <option key={b.storeSlug} value={b.storeSlug}>{b.storeName}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Price Range</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min" value={filters.minPrice}
                  onChange={e => handleFilterChange('minPrice', e.target.value)}
                  className="w-1/2 border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
                <input type="number" placeholder="Max" value={filters.maxPrice}
                  onChange={e => handleFilterChange('maxPrice', e.target.value)}
                  className="w-1/2 border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Condition</label>
              <select value={filters.condition} onChange={e => handleFilterChange('condition', e.target.value)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white">
                <option value="">Any</option>
                <option value="NEW">New</option>
                <option value="LIKE_NEW">Like New</option>
                <option value="USED">Used</option>
                <option value="REFURBISHED">Refurbished</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Rating</label>
              <div className="flex gap-1">
                {[4, 3, 2, 1].map(star => (
                  <button key={star} onClick={() => handleFilterChange('rating', filters.rating === star ? 0 : star)}
                    className={`text-lg ${filters.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
                ))}
              </div>
              <p className="text-xs text-gray-500">{filters.rating > 0 ? `${filters.rating}+ stars` : 'Any rating'}</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.inStock} onChange={e => handleFilterChange('inStock', e.target.checked)}
                  className="rounded border-gray-300 text-[#1e3b8a] focus:ring-[#1e3b8a]" />
                <span className="text-sm text-gray-700">In Stock Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.flashSale} onChange={e => handleFilterChange('flashSale', e.target.checked)}
                  className="rounded border-gray-300 text-[#1e3b8a] focus:ring-[#1e3b8a]" />
                <span className="text-sm text-gray-700">Flash Sales</span>
              </label>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {loading ? <ProductGridSkeleton count={12} /> : sortedProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-semibold">{t('NoProductsFound')}</p>
              <button onClick={clearFilters} className="mt-4 text-[#1e3b8a] hover:underline">{t('ClearFilters')}</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {sortedProducts.map(product => (
                <div key={product.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                  <Link href={`/product/${product.id}`}>
                    <div className="aspect-square relative overflow-hidden bg-gray-50">
                      <img src={product.images?.[0]?.url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400"} alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                      {product.isFeatured && <div className="absolute top-2 left-2 z-10"><span className="text-[10px] font-bold bg-[#1e3b8a] text-white px-2 py-0.5 rounded-full">Featured</span></div>}
                      {product.flashSalePrice && product.flashSaleEndsAt && new Date(product.flashSaleEndsAt) > new Date() && (
                        <div className="absolute top-2 right-2 z-10"><span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">Sale</span></div>
                      )}
                      <div className="absolute top-2 right-2 z-20"><WishlistButton product={product} /></div>
                    </div>
                  </Link>
                  <div className="p-3">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{product.category?.name || 'General'}</p>
                    <h3 className="font-bold text-gray-900 text-sm mb-2 leading-tight line-clamp-2">{product.title}</h3>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-[#1e3b8a] text-sm">{product.basePrice?.toLocaleString()} {egp}</span>
                      <button onClick={() => handleAddToCart(product)}
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
