'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import WishlistButton, { WishlistProduct } from './WishlistButton';
import { Badge, PriceDisplay, RatingStars, useToast } from '@/components/ui';
import type { Product, Tag, ProductVariant, ProductImage } from '@/types';
import { useCartStore } from '@/lib/cartStore';
import { useLanguage } from '@/providers/LanguageContext';

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

type LegacyProduct = {
  id: number | string;
  name: string;
  nameAr?: string | null;
  image?: string;
  tags?: string[];
  brand?: string;
  brandSlug?: string;
  price?: number;
  variants?: ProductVariant[];
  images?: ProductImage[];
};

export type ProductCardProduct = Omit<Partial<Product>, 'id' | 'category' | 'tags' | 'seller'> &
  LegacyProduct & {
    seller?: { storeName?: string };
  };

export default function ProductCard({
  product,
  index,
}: {
  product: ProductCardProduct;
  index?: number;
}) {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const isAr = lang === 'ar';

  const displayId = product.slug || String(product.id);
  const displayName = isAr
    ? product.nameAr ||
      (product as Partial<Product>).titleAr ||
      product.name ||
      (product as Partial<Product>).title ||
      'منتج'
    : product.name || (product as Partial<Product>).title || 'Product';
  const basePrice = product.price ?? (product as Partial<Product>).basePrice ?? 0;
  const displayImage = product.image || (product as Partial<Product>).images?.[0]?.url;
  const productTags = product.tags || [];
  const productBrand =
    product.brand ||
    ((product as Partial<Product>).seller as { storeName?: string } | undefined)?.storeName ||
    '';
  const productBrandSlug =
    product.brandSlug || productBrand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const isVerifiedLocal = (product as Partial<Product>).isVerifiedLocal ?? false;

  const reviews = (product as any).reviews || [];
  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviewCount
      : 0;

  // ── Client Cart & Language Hooks ──
  const addItem = useCartStore(s => s.addItem);

  const addToCartText = t ? t('AddToCart') || t('Add') || 'Add to Cart' : 'Add to Cart';
  const addedText = t ? t('AddedToCart') || t('Added') || 'Added ✓' : 'Added ✓';
  const _egpText = t ? t('EGP') || 'EGP' : 'EGP';

  // ── Color Swatch & Variant Parsing ──
  const variants = (product.variants || []) as ProductVariant[];
  const colorMap = new Map<string, { variant: ProductVariant; colorName: string }>();

  variants.forEach(v => {
    try {
      const attrs = JSON.parse(v.attributes || '{}');
      const color = attrs.color || attrs.Color;
      if (color) {
        const colorName = String(color).trim();
        const key = colorName.toLowerCase();
        // Prefer in-stock variant if there are duplicates for the same color
        if (!colorMap.has(key) || (!colorMap.get(key)!.variant.stockCount && v.stockCount)) {
          colorMap.set(key, { variant: v, colorName });
        }
      }
    } catch (_e) {
      // Ignore parsing errors
    }
  });

  const uniqueColors = Array.from(colorMap.values());

  // ── Image Matching Logic ──
  const getMatchedImageUrl = (colorName: string) => {
    if (!colorName || !product.images) return null;
    const lowerColor = colorName.toLowerCase();

    // Find image that has the color name in its URL
    const matched = product.images.find(img => {
      const urlLower = img.url.toLowerCase();
      const regex = new RegExp(`\\b${lowerColor}\\b|[-_]${lowerColor}[-_.]`, 'i');
      return regex.test(urlLower) || urlLower.includes(lowerColor);
    });

    return matched?.url || null;
  };

  const hasRealColors =
    uniqueColors.length > 0 &&
    !uniqueColors.every(c => {
      const lower = c.colorName.toLowerCase();
      return lower === 'standard' || lower === 'default' || lower === '';
    });

  const initialColor = hasRealColors ? uniqueColors[0].colorName : '';

  // ── Interactive Client State ──
  const [selectedColor, setSelectedColor] = useState<string | null>(initialColor || null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(
    hasRealColors ? uniqueColors[0].variant : variants[0] || null
  );
  const [activePrice, setActivePrice] = useState<number>(
    hasRealColors ? uniqueColors[0].variant.price || basePrice : basePrice
  );
  const [activeImage, setActiveImage] = useState<string | undefined>(
    hasRealColors ? getMatchedImageUrl(uniqueColors[0].colorName) || displayImage : displayImage
  );
  const [added, setAdded] = useState(false);

  // Initialize selected values based on parsed variants
  useEffect(() => {
    if (hasRealColors) {
      const firstColor = uniqueColors[0];
      setSelectedColor(firstColor.colorName);
      setActiveVariant(firstColor.variant);
      setActivePrice(firstColor.variant.price || basePrice);

      const matchedImg = getMatchedImageUrl(firstColor.colorName);
      setActiveImage(matchedImg || displayImage);
    } else {
      setSelectedColor(null);
      setActiveVariant(variants[0] || null);
      setActivePrice(basePrice);
      setActiveImage(displayImage);
    }
    setSelectedSize(null);
  }, [product.variants, displayImage, hasRealColors]);

  // Supports both old format { "color":"Red","size":"M" } and new format { "color":"Red","sizes":["S","M","L"] }
  const parsedVariants = variants.flatMap((v: any) => {
    let color = '';
    let rawSizes: string[] = [];
    let singleSize = '';
    try {
      const attrs = JSON.parse(v.attributes || '{}');
      color = String(attrs.color || attrs.Color || '').trim();

      if (Array.isArray(attrs.sizes) && attrs.sizes.length > 0) {
        rawSizes = attrs.sizes.map((s: any) => String(s).trim()).filter(Boolean);
      } else if (attrs.size || attrs.Size) {
        singleSize = String(attrs.size || attrs.Size || '').trim();
      }
    } catch (_e) {
      if (v.title && v.title.includes('-')) {
        const parts = v.title.split('-').map((p: string) => p.trim());
        if (parts.length >= 2) {
          color = parts[0];
          singleSize = parts[1];
        }
      }
    }

    if (!color && v.title) {
      color = v.title;
    }

    if (rawSizes.length > 0) {
      return rawSizes.map((sz: string) => ({ ...v, color, size: sz }));
    }
    return [{ ...v, color, size: singleSize }];
  });

  const sizesForSelectedColor = parsedVariants.filter(
    (v: any) => !selectedColor || v.color.toLowerCase() === selectedColor.toLowerCase()
  );

  const uniqueSizes = Array.from(
    new Map(
      sizesForSelectedColor
        .filter((v: any) => v.size)
        .map((v: any) => [v.size.toLowerCase(), v.size])
    ).values()
  ) as string[];

  // Auto-select the size when only one option is available
  useEffect(() => {
    if (uniqueSizes.length === 1 && !selectedSize) {
      setSelectedSize(uniqueSizes[0]);
    }
    // Reset selection if the single-size is no longer valid (e.g. color changed)
    if (uniqueSizes.length > 1 && selectedSize && !uniqueSizes.includes(selectedSize)) {
      setSelectedSize(null);
    }
  }, [uniqueSizes.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Add to Cart action
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasRealColors && !selectedColor) {
      toast({
        title: lang === 'ar' ? 'يرجى اختيار اللون أولاً' : 'Please select a color first',
        variant: 'error',
      });
      return;
    }

    if (uniqueSizes.length > 0 && !selectedSize) {
      toast({
        title: lang === 'ar' ? 'يرجى اختيار المقاس أولاً' : 'Please select a size first',
        variant: 'error',
      });
      return;
    }

    const variantId = activeVariant?.id || displayId;
    const sizeVal = selectedSize || undefined;
    const colorVal = selectedColor || undefined;
    const compositeId = `${variantId}-${sizeVal || ''}-${colorVal || ''}`;

    addItem({
      id: compositeId,
      variantId,
      name: displayName,
      price: activePrice,
      image: activeImage || displayImage || '/placeholder.png',
      selectedSize: sizeVal || undefined,
      selectedColor: colorVal || undefined,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div
      className="product-card group relative fade-in flex flex-col h-full"
      style={{ animationDelay: index ? `${0.1 * (index + 1)}s` : '0s' }}
    >
      <Link
        href={`/product/${displayId}`}
        className="block overflow-hidden relative aspect-[4/5] shrink-0 bg-gray-50"
      >
        <Image
          src={activeImage || displayImage || '/placeholder.png'}
          alt={displayName}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-115"
          priority={index ? index < 4 : false}
        />
        {/* Wishlist Button Overlay */}
        <div className="absolute top-4 right-4 z-20">
          <WishlistButton product={product as unknown as WishlistProduct} />
        </div>
        {/* Badges Overlay */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
          {isVerifiedLocal && (
            <span
              title="Verified Local Brand"
              className="inline-flex items-center gap-1 bg-[#1e3b8a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow"
            >
              <svg
                className="w-3 h-3 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Local
            </span>
          )}
          {productTags.slice(0, 2).map((tag: string | Tag) => {
            const tagName =
              typeof tag === 'string' ? tag : isAr && tag.nameAr ? tag.nameAr : tag.name;
            return (
              <Badge key={tagName} size="sm" variant="default">
                {tagName}
              </Badge>
            );
          })}
        </div>
      </Link>

      <div className="p-5 flex flex-col flex-1 justify-between bg-transparent">
        <div>
          {/* Brand slug */}
          <Link
            href={`/brand/${productBrandSlug}`}
            className="text-[#1e3b8a] dark:text-[#6b8ff5] text-xs font-bold uppercase tracking-wider mb-1.5 block hover:underline"
          >
            {productBrand}
          </Link>
          {/* Title */}
          <Link href={`/product/${displayId}`}>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 line-clamp-2 mb-2 hover:text-[#1e3b8a] dark:hover:text-[#6b8ff5] transition-colors leading-tight">
              {displayName}
            </h3>
          </Link>

          {/* Stars & Review Count */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <RatingStars value={avgRating} readOnly size="sm" />
            <span className="text-xs text-slate-500">({reviewCount})</span>
          </div>

          {/* Color Swatches Grid */}
          {hasRealColors && (
            <div className="flex flex-wrap gap-2 mb-3 mt-1 items-center">
              {uniqueColors.map(({ variant, colorName }) => {
                const isSelected = selectedColor === colorName;
                const bgStyle = getSwatchBackground(colorName);
                const isWhite = colorName.toLowerCase() === 'white';

                return (
                  <button
                    key={variant.id}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedColor(colorName);
                      setActiveVariant(variant);
                      setActivePrice(variant.price || basePrice);
                      const matchedImg = getMatchedImageUrl(colorName);
                      if (matchedImg) {
                        setActiveImage(matchedImg);
                      } else {
                        setActiveImage(displayImage);
                      }

                      // Reset size if not supported by new color
                      const newSizes = parsedVariants.filter(
                        (v: any) => v.color.toLowerCase() === colorName.toLowerCase()
                      );
                      const sizeExists = newSizes.some(
                        (v: any) => v.size.toLowerCase() === (selectedSize || '').toLowerCase()
                      );
                      if (!sizeExists) {
                        setSelectedSize(null);
                      }
                    }}
                    title={colorName}
                    className={`w-6 h-6 rounded-full transition-all duration-200 hover:scale-110 flex-shrink-0 ${
                      isWhite
                        ? 'border border-gray-300'
                        : isSelected
                          ? 'border-2 border-[#1e3b8a]'
                          : 'border border-transparent'
                    }`}
                    style={{
                      backgroundColor:
                        bgStyle.startsWith('#') || bgStyle.startsWith('hsl') ? bgStyle : undefined,
                      background:
                        !bgStyle.startsWith('#') && !bgStyle.startsWith('hsl')
                          ? bgStyle
                          : undefined,
                      outline: isSelected ? '2px solid #1e3b8a' : 'none',
                      outlineOffset: '2px',
                    }}
                    aria-label={`Select ${colorName} color`}
                    aria-pressed={isSelected}
                  />
                );
              })}
            </div>
          )}

          {/* Available Sizes list */}
          {uniqueSizes.length > 0 && (
            <div
              className="flex flex-wrap gap-1.5 mb-3 mt-1.5 items-center text-left"
              style={{ direction: isAr ? 'rtl' : 'ltr' }}
            >
              <span className="text-[10px] font-semibold text-slate-500 tracking-wider select-none mr-0.5">
                {isAr ? 'المقاسات:' : 'Sizes:'}
              </span>
              <div className="flex flex-wrap gap-1">
                {uniqueSizes.map(sz => {
                  const isSelected = selectedSize === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedSize(sz);
                      }}
                      className={`px-2 py-0.5 text-[9px] font-black rounded border transition-all duration-200 ${
                        isSelected
                          ? 'bg-[hsl(var(--primary))] text-white border-transparent shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border-slate-200/40'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-2">
          {/* Dynamic Price Display */}
          <div className="mb-4">
            <PriceDisplay price={activePrice} size="md" />
          </div>

          {/* Add to Cart Premium Trigger */}
          <button
            onClick={handleAddToCart}
            disabled={added || (activeVariant ? activeVariant.stockCount === 0 : false)}
            className={`w-full text-white py-3 px-4 font-bold tracking-tight flex justify-between items-center group/btn rounded-[var(--radius)] transition-all ${
              added
                ? 'bg-green-600 hover:bg-green-600 shadow-lg shadow-green-600/20'
                : (activeVariant ? activeVariant.stockCount === 0 : false)
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-[hsl(var(--primary))] hover:opacity-90 active:scale-95 shadow-md shadow-[hsl(var(--primary))]/10'
            }`}
          >
            <span className="text-xs tracking-wide uppercase">
              {added
                ? addedText
                : (activeVariant ? activeVariant.stockCount === 0 : false)
                  ? 'Out of Stock'
                  : addToCartText}
            </span>
            <span className="text-sm opacity-80 group-hover/btn:translate-x-0.5 transition-transform">
              {added ? '✓' : '🛒'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
