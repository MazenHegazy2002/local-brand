'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cartStore';
import { useLanguage } from '@/providers/LanguageContext';
import WishlistButton from '@/components/WishlistButton';
import { RatingStars } from '@/components/ui/RatingStars';
import { useToast } from '@/components/ui';
import { ProductImage, Tag } from '@/types';
import { ShareButton } from '@/components/ShareButton';
import { ReportButton } from '@/components/ReportButton';
import { CountdownTimer } from '@/components/ui/CountdownTimer';

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
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const addItem = useCartStore(s => s.addItem);

  const productTitle = isAr && product.titleAr ? product.titleAr : product.title;
  const productDescription =
    isAr && product.descriptionAr ? product.descriptionAr : product.description;

  const images = React.useMemo(() => product.images || [], [product.images]);
  const primaryImage =
    images.find((i: ProductImage) => i.isPrimary)?.url || images[0]?.url || '/placeholder.png';

  const variants = product.variants || [];
  const hasVariants = variants.length > 0;

  const reviews = product.reviews || [];
  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviewCount
      : 0;

  // ── Color & Size Parsing Logic ──
  // Supports both old format { "color":"Red","size":"M" } and new format { "color":"Red","sizes":["S","M","L"] }
  const parsedVariants = variants.flatMap((v: any) => {
    let color = '';
    let rawSizes: string[] = [];
    let singleSize = '';
    try {
      const attrs = JSON.parse(v.attributes || '{}');
      color = String(attrs.color || attrs.Color || '').trim();

      // New seller products store sizes as an array; old seeded data uses singular "size"
      if (Array.isArray(attrs.sizes) && attrs.sizes.length > 0) {
        rawSizes = attrs.sizes.map((s: any) => String(s).trim()).filter(Boolean);
      } else if (attrs.size || attrs.Size) {
        singleSize = String(attrs.size || attrs.Size || '').trim();
      }
    } catch (_e) {
      // Robust fallback for title-encoded layouts e.g. "Red - M"
      if (v.title && v.title.includes('-')) {
        const parts = v.title.split('-').map((p: string) => p.trim());
        if (parts.length >= 2) {
          color = parts[0];
          singleSize = parts[1];
        }
      }
    }

    // Fallback: use variant title as color name when attrs.color is missing
    if (!color && v.title) {
      color = v.title;
    }

    // Expand a variant with a sizes array into one virtual entry per size so the
    // existing deduplication + selection logic works without changes downstream.
    if (rawSizes.length > 0) {
      return rawSizes.map((sz: string) => ({ ...v, color, size: sz }));
    }
    return [{ ...v, color, size: singleSize }];
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
  const hasColors =
    uniqueColors.length > 0 &&
    !uniqueColors.every((c: any) => {
      const lower = c.colorName.toLowerCase();
      return lower === 'standard' || lower === 'default' || lower === '';
    });

  const initialColor = hasColors && uniqueColors.length === 1 ? uniqueColors[0].colorName : '';

  // Image search mapping matching search criteria
  const getMatchedImageUrl = React.useCallback(
    (colorName: string) => {
      if (!colorName || !images.length) return null;
      const lowerColor = colorName.toLowerCase();
      const matched = images.find((img: ProductImage) => {
        const urlLower = img.url.toLowerCase();
        const regex = new RegExp(`\\b${lowerColor}\\b|[-_]${lowerColor}[-_.]`, 'i');
        return regex.test(urlLower) || urlLower.includes(lowerColor);
      });
      return matched?.url || null;
    },
    [images]
  );

  // ── Interactive Client States ──
  const [selectedColor, setSelectedColor] = useState<string>(initialColor);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [activeImage, setActiveImage] = useState<string>(primaryImage);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Sync initial color image when product variants or primary image changes
  useEffect(() => {
    setSelectedColor(initialColor);
    setSelectedSize('');
    setQty(1);
    const matchedImg = initialColor ? getMatchedImageUrl(initialColor) : null;
    setActiveImage(matchedImg || primaryImage);
  }, [product.id, primaryImage, initialColor, getMatchedImageUrl]);

  // Extract all unique sizes for selected color, or all sizes if no color is selected yet
  const sizesForColor = parsedVariants.filter(
    (v: any) =>
      !hasColors || !selectedColor || v.color.toLowerCase() === selectedColor.toLowerCase()
  );

  const uniqueSizes = Array.from(
    new Map(
      sizesForColor.filter((v: any) => v.size).map((v: any) => [v.size.toLowerCase(), v.size])
    ).values()
  ) as string[];
  const hasSizes = uniqueSizes.length > 0;

  // Auto-select the only available size so the user doesn't have to pick manually
  useEffect(() => {
    if (uniqueSizes.length === 1 && !selectedSize) {
      setSelectedSize(uniqueSizes[0]);
    }
  }, [uniqueSizes.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const isFlashSaleActive =
    product.flashSalePrice !== null &&
    product.flashSalePrice !== undefined &&
    (!product.flashSaleStartsAt || new Date(product.flashSaleStartsAt) <= new Date()) &&
    (!product.flashSaleEndsAt || new Date(product.flashSaleEndsAt) > new Date());

  // Dynamic pricing matching state
  const activePrice = isFlashSaleActive
    ? (product.flashSalePrice ?? product.basePrice)
    : (resolvedVariant?.price ??
      (hasColors && selectedColor
        ? parsedVariants.find((v: any) => v.color.toLowerCase() === selectedColor.toLowerCase())
            ?.price
        : null) ??
      product.basePrice);

  const { toast } = useToast();

  const handleAddToCart = () => {
    if (hasColors && !selectedColor) {
      toast({
        title: lang === 'ar' ? 'يرجى اختيار اللون أولاً' : 'Please select a color first',
        variant: 'error',
      });
      return;
    }
    if (hasSizes && !selectedSize) {
      toast({
        title: lang === 'ar' ? 'يرجى اختيار المقاس أولاً' : 'Please select a size first',
        variant: 'error',
      });
      return;
    }

    const variantId = resolvedVariant?.id || product.id;
    const sizeVal = selectedSize || undefined;
    const colorVal = selectedColor || undefined;
    const compositeId = `${variantId}-${sizeVal || ''}-${colorVal || ''}`;

    for (let i = 0; i < qty; i++) {
      addItem({
        id: compositeId,
        variantId,
        name: productTitle,
        price: activePrice,
        image: activeImage || primaryImage,
        selectedSize: sizeVal,
        selectedColor: colorVal,
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
            alt={productTitle}
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
                    alt={`${productTitle} gallery thumbnail ${i + 1}`}
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
        {/* Brand redirect + verification badge + Share */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
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
                  />
                </svg>
                Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ShareButton
              productId={product.id}
              productName={productTitle}
              productSlug={product.slug}
            />
            <ReportButton productId={product.id} productName={productTitle} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-50 leading-tight mb-2">
          {productTitle}
        </h1>

        {/* Rating Stars */}
        <div className="flex items-center gap-2 mb-4">
          <RatingStars value={avgRating} readOnly size="md" />
          <span className="text-sm font-semibold text-slate-650 dark:text-slate-400">
            {reviewCount > 0
              ? `${avgRating.toFixed(1)} (${reviewCount} ${t('Reviews') || 'reviews'})`
              : `0.0 (${t('NoReviewsYet') || 'No reviews yet'})`}
          </span>
        </div>

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

        {/* Flash Sale Banner & Countdown */}
        {isFlashSaleActive && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <span className="inline-block bg-red-650 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded mb-1 animate-pulse">
                  ⚡ Flash Sale
                </span>
                <div className="text-xs text-red-700 dark:text-red-400 font-semibold">
                  Original Price:{' '}
                  <span className="line-through">{product.basePrice.toLocaleString()} EGP</span>
                </div>
              </div>
              {product.flashSaleEndsAt && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Ends in:
                  </span>
                  <CountdownTimer
                    targetDate={
                      product.flashSaleEndsAt instanceof Date
                        ? product.flashSaleEndsAt.toISOString()
                        : String(product.flashSaleEndsAt)
                    }
                    compact
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Low Stock Urgency Banner */}
        {availableStock > 0 && availableStock <= 5 && (
          <div className="mb-6 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/50 text-amber-850 dark:text-amber-400 text-xs font-bold rounded-xl flex items-center gap-2.5 animate-pulse">
            <span className="text-sm">⚠️</span> Low Stock! Only {availableStock} items left in
            stock.
          </div>
        )}

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-350 leading-relaxed mb-8">
          {productDescription}
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
              <div className="flex flex-wrap gap-2.5 items-center">
                {uniqueColors.map(({ variant, colorName }) => {
                  const isSelected = selectedColor.toLowerCase() === colorName.toLowerCase();
                  const bgStyle = getSwatchBackground(colorName);
                  const colorHex = COLOR_MAP[colorName.toLowerCase()] || bgStyle;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => handleColorSelect(colorName)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'border-[#1e3b8a] bg-blue-50/80 text-[#1e3b8a] ring-2 ring-[#1e3b8a]/20 shadow-sm'
                          : 'border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-gray-300'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                        style={{
                          backgroundColor:
                            colorHex.startsWith('#') || colorHex.startsWith('hsl')
                              ? colorHex
                              : undefined,
                          background:
                            !colorHex.startsWith('#') && !colorHex.startsWith('hsl')
                              ? colorHex
                              : undefined,
                        }}
                      />
                      {colorName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size pill buttons */}
          {hasSizes && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Size</span>
                {selectedSize && (
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {selectedSize}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueSizes.map(sizeName => {
                  const sizeVariant = parsedVariants.find(
                    (v: any) =>
                      v.size.toLowerCase() === sizeName.toLowerCase() &&
                      (!hasColors ||
                        !selectedColor ||
                        v.color.toLowerCase() === selectedColor.toLowerCase())
                  );
                  const isOutOfStock = !sizeVariant || sizeVariant.stockCount === 0;
                  const isSelected = selectedSize.toLowerCase() === sizeName.toLowerCase();

                  return (
                    <button
                      key={sizeName}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => setSelectedSize(sizeName)}
                      className={`min-w-[44px] h-10 px-3 rounded-lg border text-sm font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                        isOutOfStock
                          ? 'border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed line-through'
                          : isSelected
                            ? 'border-[#534AB7] bg-[#534AB7] text-white shadow-md shadow-[#534AB7]/30 scale-105'
                            : 'border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-[#534AB7] hover:text-[#534AB7] dark:hover:border-[#6b8ff5] dark:hover:text-[#6b8ff5]'
                      }`}
                    >
                      {sizeName}
                    </button>
                  );
                })}
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
                title: productTitle,
                name: productTitle,
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
                title: productTitle,
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
                #{isAr && tag.nameAr ? tag.nameAr : tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
