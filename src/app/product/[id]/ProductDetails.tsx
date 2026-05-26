'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cartStore';
import { useLanguage } from '@/providers/LanguageContext';
import WishlistButton from '@/components/WishlistButton';
import { Product, ProductVariant, ProductImage, Tag } from '@/types';

// Comprehensive color map to convert variant color strings to hex/HSL color codes
const COLOR_MAP: Record<string, string> = {
  black: '#0f172a',
  white: '#f8fafc',
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#eab308',
  pink: '#db2777',
  purple: '#9333ea',
  orange: '#ea580c',
  gray: '#64748b',
  grey: '#64748b',
  brown: '#78350f',
  beige: '#f5f5dc',
  navy: '#1e3a8a',
  maroon: '#7f1d1d',
  teal: '#0d9488',
  gold: '#d97706',
  silver: '#cbd5e1',
  lavender: '#e9d5ff',
  olive: '#808000',
  cream: '#fef3c7',
  charcoal: '#334155',
  indigo: '#4f46e5',
  violet: '#7c3aed',
  khaki: '#f0e68c',
  cyan: '#0891b2',
  magenta: '#c026d3',
  turquoise: '#06b6d4',
  mustard: '#ca8a04',
  burgundy: '#881337',
  plum: '#4a0e4e',
  mint: '#6ee7b7',
  sky: '#38bdf8',
  peach: '#ffebd2',
  coral: '#f87171',
  bronze: '#cd7f32',
  copper: '#b87333',
  lilac: '#d8b4fe',
  apricot: '#ffb7c5',
  amber: '#f59e0b',
  emerald: '#10b981',
  sapphire: '#1d4ed8',
  rust: '#b45309',
  chocolate: '#4a3728',
  sand: '#f59e0b',
  camel: '#c2b280',
  tan: '#d2b48c',
  terracotta: '#c35237',
  denim: '#3b82f6',
  mauve: '#e0b0ff',
  sage: '#9caf88',
  taupe: '#483c32',
};

// Generates background color or split-color linear gradients for swatches
const getSwatchBackground = (colorName: string) => {
  const name = colorName.toLowerCase().trim();
  if (name.includes('/') || name.includes('-')) {
    const parts = name.split(/[\/-]/).map(p => p.trim());
    if (parts.length >= 2) {
      const color1 = COLOR_MAP[parts[0]] || parts[0];
      const color2 = COLOR_MAP[parts[1]] || parts[1];
      return `linear-gradient(135deg, ${color1} 50%, ${color2} 50%)`;
    }
  }
  return COLOR_MAP[name] || name;
};

// Category slugs / name fragments that qualify for the Virtual Try-On button
const TRYON_CATEGORY_SLUGS = ['men', 'women'];
function isTryOnCategory(category: { slug?: string; name?: string } | null | undefined): boolean {
  if (!category) return false;
  const slug = (category.slug ?? '').toLowerCase();
  const name = (category.name ?? '').toLowerCase();
  return TRYON_CATEGORY_SLUGS.some(k => slug.includes(k) || name.includes(k));
}

export default function ProductDetails({
  product,
  virtualTryOnEnabled = false,
}: {
  product: any;
  virtualTryOnEnabled?: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const addItem = useCartStore(s => s.addItem);

  const images = product.images || [];
  const primaryImage =
    images.find((i: ProductImage) => i.isPrimary)?.url || images[0]?.url || '/placeholder.png';

  const variants = product.variants || [];
  const hasVariants = variants.length > 0;

  // ── Color & Size Parsing Logic ──
  const parsedVariants = variants.map((v: any) => {
    let color = '';
    let size = '';
    try {
      const attrs = JSON.parse(v.attributes || '{}');
      color = String(attrs.color || attrs.Color || '').trim();
      size = String(attrs.size || attrs.Size || '').trim();
    } catch (e) {
      // Robust fallback for traditional layouts
      if (v.title.includes('-')) {
        const parts = v.title.split('-').map((p: string) => p.trim());
        if (parts.length >= 2) {
          color = parts[0];
          size = parts[1];
        }
      }
    }
    return { ...v, color, size };
  });

  // Extract unique color entities
  const colorMap = new Map<string, { variant: any; colorName: string }>();
  parsedVariants.forEach((v: any) => {
    if (v.color) {
      const key = v.color.toLowerCase();
      // Prioritize in-stock variant if there are duplicate color entries
      if (!colorMap.has(key) || (!colorMap.get(key)!.variant.stockCount && v.stockCount)) {
        colorMap.set(key, { variant: v, colorName: v.color });
      }
    }
  });
  const uniqueColors = Array.from(colorMap.values());
  const hasColors = uniqueColors.length > 0;

  // Image search mapping matching search criteria
  const getMatchedImageUrl = (colorName: string) => {
    if (!colorName || !images.length) return null;
    const lowerColor = colorName.toLowerCase();
    const matched = images.find((img: ProductImage) => {
      const urlLower = img.url.toLowerCase();
      const regex = new RegExp(`\\b${lowerColor}\\b|[-_]${lowerColor}[-_.]`, 'i');
      return regex.test(urlLower) || urlLower.includes(lowerColor);
    });
    return matched?.url || null;
  };

  // ── Interactive Client States ──
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    return uniqueColors.length > 0 ? uniqueColors[0].colorName : '';
  });
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [activeImage, setActiveImage] = useState<string>(primaryImage);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Sync initial color image when product variants or primary image changes
  useEffect(() => {
    if (uniqueColors.length > 0) {
      const firstColor = uniqueColors[0].colorName;
      setSelectedColor(firstColor);
      const matchedImg = getMatchedImageUrl(firstColor);
      if (matchedImg) {
        setActiveImage(matchedImg);
      } else {
        setActiveImage(primaryImage);
      }
    } else {
      setActiveImage(primaryImage);
    }
    setSelectedSize('');
    setQty(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, primaryImage]);

  // Extract all unique sizes for selected color
  const sizesForColor = parsedVariants.filter(
    (v: any) => !hasColors || v.color.toLowerCase() === selectedColor.toLowerCase()
  );

  const uniqueSizes = Array.from(
    new Map(
      sizesForColor.filter((v: any) => v.size).map((v: any) => [v.size.toLowerCase(), v.size])
    ).values()
  ) as string[];
  const hasSizes = uniqueSizes.length > 0;

  // Dynamic color selection handler
  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName);
    const matchedImg = getMatchedImageUrl(colorName);
    if (matchedImg) {
      setActiveImage(matchedImg);
    }

    // Auto-reset size if it doesn't exist for the new color
    const newSizes = parsedVariants.filter(
      (v: any) => v.color.toLowerCase() === colorName.toLowerCase()
    );
    const sizeExists = newSizes.some(
      (v: any) => v.size.toLowerCase() === selectedSize.toLowerCase()
    );
    if (!sizeExists) {
      setSelectedSize('');
    }
  };

  // Active calculated variant
  const activeVariant =
    parsedVariants.find((v: any) => {
      const matchesColor = !hasColors || v.color.toLowerCase() === selectedColor.toLowerCase();
      const matchesSize = !hasSizes || v.size.toLowerCase() === selectedSize.toLowerCase();
      return matchesColor && matchesSize;
    }) || null;

  // Fallback variant when only 1 tier option exists
  const fallbackVariant = !hasColors && !hasSizes && variants.length > 0 ? variants[0] : null;

  const resolvedVariant = activeVariant || fallbackVariant;

  // Real-time stock status calculations
  const totalStockCount = variants.reduce((acc: number, v: any) => acc + v.stockCount, 0);
  const availableStock = resolvedVariant
    ? resolvedVariant.stockCount
    : hasColors && selectedColor
      ? parsedVariants
          .filter((v: any) => v.color.toLowerCase() === selectedColor.toLowerCase())
          .reduce((acc: number, v: any) => acc + v.stockCount, 0)
      : totalStockCount;

  // Dynamic pricing matching state
  const activePrice =
    resolvedVariant?.price ??
    (hasColors && selectedColor
      ? parsedVariants.find((v: any) => v.color.toLowerCase() === selectedColor.toLowerCase())
          ?.price
      : null) ??
    product.basePrice;

  const handleAddToCart = () => {
    if (hasVariants && hasSizes && !selectedSize) {
      alert('Please select a size first');
      return;
    }

    for (let i = 0; i < qty; i++) {
      addItem({
        id: resolvedVariant?.id || product.id,
        name: product.title,
        price: activePrice,
        image: activeImage || primaryImage,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-8 lg:gap-16">
      {/* ── Left Column: Media Showcase ── */}
      <div className="w-full md:w-1/2">
        <div className="aspect-square bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-800 mb-4 relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            fetchPriority="high"
            loading="eager"
          />
        </div>

        {/* Gallery Thumbnails */}
        {images.length > 1 && (
          <div className="flex flex-wrap gap-3">
            {images.map((img: ProductImage, i: number) => {
              const isActive = activeImage === img.url;
              return (
                <button
                  key={img.id || i}
                  onClick={() => setActiveImage(img.url)}
                  className={`w-20 h-20 rounded-lg bg-slate-50 dark:bg-slate-800/50 border p-1 overflow-hidden transition-all duration-300 transform hover:scale-105 ${
                    isActive
                      ? 'border-[#1e3b8a] dark:border-[#6b8ff5] ring-2 ring-[#1e3b8a]/20'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    className="w-full h-full object-cover rounded"
                    alt={`${product.title} gallery thumbnail ${i + 1}`}
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right Column: Configuration & Details ── */}
      <div className="w-full md:w-1/2 flex flex-col justify-center">
        {/* Brand redirect + verification badge */}
        <div className="flex items-center gap-2 mb-2.5">
          <Link
            href={`/brand/${product.seller.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:text-[#534AB7] dark:hover:text-[#6b8ff5] transition-colors"
          >
            {product.seller.storeName}
          </Link>
          {(product.seller as { status?: string }).status === 'ACTIVE' && (
            <span
              title="Verified seller on Brandy"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#534AB7]/10 text-[#534AB7] dark:bg-[#534AB7]/20 dark:text-[#6b8ff5] rounded text-[10px] font-bold uppercase tracking-wide"
            >
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Verified
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-50 leading-tight mb-4">
          {product.title}
        </h1>

        {/* Dynamic Price & In-stock Indicators */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="text-3xl font-black text-[#534AB7] dark:text-[#6b8ff5]">
            {activePrice.toLocaleString()} {t('EGP') || 'EGP'}
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
              availableStock > 5
                ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50'
                : availableStock > 0
                  ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                  : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'
            }`}
          >
            {availableStock > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
                {t('InStock') || 'In Stock'} ({availableStock} {t('Left') || 'Left'})
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {t('OutOfStock') || 'Out of Stock'}
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-350 leading-relaxed mb-8">
          {product.description}
        </p>

        {/* SKU/UPC code indicator */}
        {(variants.some((v: any) => v.sku) || variants.some((v: any) => v.upc)) && (
          <div className="mb-8 text-[11px] text-gray-400 dark:text-slate-500 font-mono flex flex-wrap gap-x-4 gap-y-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-gray-100 dark:border-slate-800/80">
            {resolvedVariant?.sku && <span>SKU: {resolvedVariant.sku}</span>}
            {!resolvedVariant?.sku && variants[0]?.sku && <span>SKU: {variants[0].sku}</span>}
            {resolvedVariant?.upc && <span>UPC: {resolvedVariant.upc}</span>}
            {!resolvedVariant?.upc && variants[0]?.upc && <span>UPC: {variants[0].upc}</span>}
          </div>
        )}

        <div className="h-px w-full bg-gray-100 dark:bg-slate-800 mb-8" />

        {/* ── Variant Pickers (Client-side interactive swatches & sizing) ── */}
        <div className="space-y-6 mb-8">
          {/* Colors Circular Picker */}
          {hasColors && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Colors</span>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {selectedColor}
                </span>
              </div>
              <div className="flex flex-wrap gap-3.5 items-center">
                {uniqueColors.map(({ variant, colorName }) => {
                  const isSelected = selectedColor.toLowerCase() === colorName.toLowerCase();
                  const bgStyle = getSwatchBackground(colorName);
                  const isWhite = colorName.toLowerCase() === 'white';

                  return (
                    <button
                      key={variant.id}
                      onClick={() => handleColorSelect(colorName)}
                      title={colorName}
                      className={`w-8 h-8 rounded-full transition-all duration-300 transform hover:scale-115 flex-shrink-0 relative ${
                        isWhite
                          ? 'border border-gray-300 dark:border-gray-600'
                          : 'border border-transparent'
                      }`}
                      style={{
                        backgroundColor:
                          bgStyle.startsWith('#') || bgStyle.startsWith('hsl')
                            ? bgStyle
                            : undefined,
                        background:
                          !bgStyle.startsWith('#') && !bgStyle.startsWith('hsl')
                            ? bgStyle
                            : undefined,
                        boxShadow: isSelected ? `0 0 0 2px bg-white, 0 0 0 4px #534AB7` : 'none',
                      }}
                      aria-label={`Select ${colorName} color`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Sizing dropdown selector */}
          {hasSizes && (
            <div>
              <label
                htmlFor="size-selector"
                className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3"
              >
                Size
              </label>
              <div className="relative">
                <select
                  id="size-selector"
                  value={selectedSize}
                  onChange={e => setSelectedSize(e.target.value)}
                  className="w-full h-12 pl-4 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#534AB7] dark:focus:border-[#6b8ff5] focus:ring-1 focus:ring-[#534AB7] dark:focus:ring-[#6b8ff5] cursor-pointer appearance-none transition-all"
                >
                  <option value="">Select Size</option>
                  {uniqueSizes.map(sizeName => {
                    // Check stock count for this specific size and color
                    const sizeVariant = parsedVariants.find(
                      (v: any) =>
                        v.size.toLowerCase() === sizeName.toLowerCase() &&
                        (!hasColors || v.color.toLowerCase() === selectedColor.toLowerCase())
                    );
                    const isOutOfStock = !sizeVariant || sizeVariant.stockCount === 0;

                    return (
                      <option
                        key={sizeName}
                        value={sizeName}
                        disabled={isOutOfStock}
                        className="font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950"
                      >
                        {sizeName} {isOutOfStock ? '(Out of stock)' : ''}
                      </option>
                    );
                  })}
                </select>
                {/* Custom select arrow icon */}
                <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Quantity Picker & Cart Call-To-Action ── */}
        <div className="flex flex-col sm:flex-row items-stretch gap-4">
          {/* Quantity */}
          <div className="flex items-center justify-between border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40 px-2.5 h-12 w-full sm:w-32">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={availableStock === 0}
              className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-xl font-semibold disabled:opacity-30"
            >
              −
            </button>
            <div className="font-bold text-slate-900 dark:text-slate-100 w-full text-center">
              {qty}
            </div>
            <button
              onClick={() => setQty(Math.min(availableStock, qty + 1))}
              disabled={availableStock === 0 || qty >= availableStock}
              className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-xl font-semibold disabled:opacity-30"
            >
              +
            </button>
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            disabled={added || availableStock === 0}
            className={`flex-1 h-12 rounded-xl font-black text-sm tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 ${
              added
                ? 'bg-green-500 text-white shadow-green-500/20'
                : availableStock === 0
                  ? 'bg-gray-300 dark:bg-slate-800 text-gray-500 dark:text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-[#534AB7] hover:bg-[#433b9c] dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8] text-white shadow-[#534AB7]/20'
            }`}
          >
            {added ? (
              <>{t('AddedToCart') || 'Added ✓'}</>
            ) : availableStock === 0 ? (
              <>{t('OutOfStock') || 'Out of Stock'}</>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                {t('AddToCart') || 'Add to Cart'}
              </>
            )}
          </button>

          {/* Wishlist Icon Overlay */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <WishlistButton
              product={{
                id: product.id,
                title: product.title,
                name: product.title,
                basePrice: product.basePrice,
                price: activePrice,
                image: activeImage || primaryImage,
              }}
              className="!w-12 !h-12 !bg-white dark:!bg-slate-800 border border-gray-200 dark:border-slate-700 hover:!bg-gray-50 dark:hover:!bg-slate-700/60"
            />
          </div>
        </div>

        {/* ── Virtual Try-On button (AI plugin, men/women categories only) ── */}
        {virtualTryOnEnabled && isTryOnCategory(product.category) && (
          <button
            onClick={() => {
              const params = new URLSearchParams({
                product_image: activeImage || primaryImage,
                title: product.title,
                ...(selectedColor ? { color: selectedColor } : {}),
              });
              router.push(`/virtual-tryon?${params.toString()}`);
            }}
            className="mt-3 w-full h-12 rounded-xl font-black text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/20 active:scale-95"
          >
            <span className="text-base">✨</span>
            Try It On — AI Fitting Room
          </button>
        )}

        {/* Global stock overview */}
        {hasVariants && (
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-4 text-center sm:text-left">
            Total available: {totalStockCount} units across all options
          </div>
        )}

        {/* Guarantee */}
        <div className="mt-8 bg-slate-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 rounded-xl p-4 flex gap-4">
          <div className="w-10 h-10 shrink-0 bg-[#eef3f7] dark:bg-slate-700/60 text-[#534AB7] dark:text-[#6b8ff5] rounded-full flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">
              {t('BrandyGuarantee') || 'Brandy Guarantee'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('GuaranteeText') ||
                'Every product is authenticated. Free returns within 14 days for all domestic orders. Secure payment processing.'}
            </p>
          </div>
        </div>

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {product.tags.map((tag: Tag) => (
              <span
                key={tag.id}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 rounded-full animate-fade-in"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
