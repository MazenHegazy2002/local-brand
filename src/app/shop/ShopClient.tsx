'use client';

import Navbar from '@/components/Navbar';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/providers/LanguageContext';
import ProductCard, { ProductCardProduct } from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/Skeleton';
import { Product, Category } from '@/types';

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const { t } = useLanguage();

  const fetchFilters = async () => {
    try {
      const res = await fetch('/api/products/filters');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setBrands(data.brands || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async (currentPage = 1) => {
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
      params.set('page', String(currentPage));
      params.set('limit', '20');

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotal(data.pagination?.total ?? 0);
        setPage(currentPage);
        // Retrigger Google Translate so dynamically-loaded product names
        // get translated when the page is in Arabic (or any non-English) mode.
        setTimeout(() => window.retranslate?.(), 400);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);
  useEffect(() => {
    fetchProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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

  const activeFilterCount = [
    filters.brand,
    filters.condition,
    filters.inStock,
    filters.flashSale,
    filters.rating > 0,
    filters.tags,
  ].filter(Boolean).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900">
            {filters.q
              ? `${t('ResultsFor')} "${filters.q}"`
              : filters.category !== 'all'
                ? categories.find((c: Category) => c.slug === filters.category)?.name || 'Products'
                : t('AllProducts')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? (
              <span className="text-gray-400 animate-pulse">
                {t('SearchDots') || 'Searching...'}
              </span>
            ) : total > 0 ? (
              `${total} ${t('Products')}`
            ) : (
              `${sortedProducts.length} ${t('Products')}`
            )}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold ${showFilters ? 'bg-[#1e3b8a] text-white border-[#1e3b8a]' : 'bg-white border-gray-200'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            {t('Filters')}
            {activeFilterCount > 0 && (
              <span className="bg-white text-[#1e3b8a] px-1.5 rounded-full text-xs">
                {activeFilterCount}
              </span>
            )}
          </button>
          <input
            value={filters.q}
            onChange={e => handleFilterChange('q', e.target.value)}
            placeholder={t('SearchDots')}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3b8a] bg-white"
          />
          <select
            value={filters.sort}
            onChange={e => handleFilterChange('sort', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white text-gray-700"
          >
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
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                {t('Filters')}
              </h3>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">
                  {t('ClearAll')}
                </button>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                {t('Category')}
              </label>
              <select
                value={filters.category}
                onChange={e => handleFilterChange('category', e.target.value)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
              >
                <option value="all">{t('All')}</option>
                {categories.map((cat: Category) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">{t('Brand')}</label>
              <select
                value={filters.brand}
                onChange={e => handleFilterChange('brand', e.target.value)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
              >
                <option value="">All Brands</option>
                {brands.map((b: Brand) => (
                  <option key={b.storeSlug} value={b.storeSlug}>
                    {b.storeName}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={e => handleFilterChange('minPrice', e.target.value)}
                  className="w-1/2 border border-gray-200 rounded-md px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={e => handleFilterChange('maxPrice', e.target.value)}
                  className="w-1/2 border border-gray-200 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Condition</label>
              <select
                value={filters.condition}
                onChange={e => handleFilterChange('condition', e.target.value)}
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
              >
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
                  <button
                    key={star}
                    onClick={() => handleFilterChange('rating', filters.rating === star ? 0 : star)}
                    className={`text-lg ${filters.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {filters.rating > 0 ? `${filters.rating}+ stars` : 'Any rating'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={e => handleFilterChange('inStock', e.target.checked)}
                  className="rounded border-gray-300 text-[#1e3b8a] focus:ring-[#1e3b8a]"
                />
                <span className="text-sm text-gray-700">In Stock Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.flashSale}
                  onChange={e => handleFilterChange('flashSale', e.target.checked)}
                  className="rounded border-gray-300 text-[#1e3b8a] focus:ring-[#1e3b8a]"
                />
                <span className="text-sm text-gray-700">Flash Sales</span>
              </label>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col gap-6">
          {loading ? (
            <ProductGridSkeleton count={12} />
          ) : sortedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <svg
                className="w-20 h-20 text-gray-300 mb-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z"
                />
              </svg>
              <h3 className="text-xl font-bold text-gray-700 mb-2">{t('NoProductsFound')}</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-xs">
                {t('TryAdjustingFilters') ||
                  "Try adjusting your filters or search term to find what you're looking for."}
              </p>
              <button
                onClick={clearFilters}
                className="px-6 py-2.5 bg-[#1e3b8a] text-white rounded-full text-sm font-medium hover:bg-[#16307a] transition-colors"
              >
                {t('ClearFilters')}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {sortedProducts.map((product, idx) => (
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4 pb-2">
                  <button
                    onClick={() => fetchProducts(page - 1)}
                    disabled={page <= 1}
                    className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    {t('Previous') || 'Previous'}
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, i) =>
                      item === 'ellipsis' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-gray-400 select-none">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => fetchProducts(item as number)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                            item === page
                              ? 'bg-[#1e3b8a] text-white'
                              : 'border hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    onClick={() => fetchProducts(page + 1)}
                    disabled={page >= totalPages}
                    className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    {t('Next') || 'Next'}
                  </button>
                </div>
              )}
            </>
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
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-8">
            <ProductGridSkeleton count={12} />
          </div>
        }
      >
        <ShopContent />
      </Suspense>
    </main>
  );
}
