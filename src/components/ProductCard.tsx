'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import WishlistButton, { WishlistProduct } from './WishlistButton';
import { Badge, PriceDisplay, RatingStars, useToast } from '@/components/ui';
import type { Product, Tag, ProductVariant, ProductImage } from '@/types';
import { useCartStore } from '@/lib/cartStore';
import { useLanguage } from '@/providers/LanguageContext';
import { COLOR_MAP, getSwatchBackground, getSwatchStyle } from '@/lib/colors';

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
  const variants = React.useMemo(
    () => (product.variants || []) as ProductVariant[],
    [product.variants]
  );

  const uniqueColors = React.useMemo(() => {
    const colorMap = new Map<string, { variant: ProductVariant; colorName: string }>();
    variants.forEach(v => {
      let color = '';
      try {
        const attrs = JSON.parse(v.attributes || '{}');
        color = String(attrs.color || attrs.Color || '').trim();
      } catch (_e) {
        if (v.title && v.title.includes('-')) {
          const parts = v.title.split('-').map(p => p.trim());
          if (parts.length >= 2) color = parts[0];
        }
      }
      if (!color && v.title) {
        color = v.title.trim();
      }
      if (color) {
        const colorName = color;
        const key = colorName.toLowerCase();
        if (!colorMap.has(key) || (!colorMap.get(key)!.variant.stockCount && v.stockCount)) {
          colorMap.set(key, { variant: v, colorName });
        }
      }
    });
    return Array.from(colorMap.values());
  }, [variants]);

  // ── Image Matching Logic ──
  const getMatchedImageUrl = React.useCallback(
    (colorName: string) => {
      if (!colorName) return null;
      const lowerColor = colorName.toLowerCase().trim();

      // 1. Direct check on matching variant image / attributes
      const matchingColorItem = uniqueColors.find(
        c => c.colorName.toLowerCase().trim() === lowerColor
      );
      const variant = matchingColorItem?.variant;
      if (variant) {
        let vImg = (variant as any).image || (variant as any).imageUrl;
        if (!vImg && variant.attributes) {
          try {
            const attrs =
              typeof variant.attributes === 'string'
                ? JSON.parse(variant.attributes)
                : variant.attributes;
            vImg = attrs.image || attrs.imageUrl || attrs.img || attrs.image_url;
          } catch (_e) {}
        }
        if (vImg) return vImg;
      }

      // 2. Search product images array by regex/substring on URL
      const allImages = product.images || [];
      if (allImages.length > 0) {
        const matched = allImages.find((img: ProductImage) => {
          const urlLower = (img.url || '').toLowerCase();
          const regex = new RegExp(`\\b${lowerColor}\\b|[-_]${lowerColor}[-_.]`, 'i');
          return regex.test(urlLower) || urlLower.includes(lowerColor);
        });
        if (matched?.url) return matched.url;

        // 3. Positional index match: if color #1 is selected and images array aligns, use image #1
        const colorIndex = uniqueColors.findIndex(
          c => c.colorName.toLowerCase().trim() === lowerColor
        );
        if (colorIndex >= 0 && colorIndex < allImages.length) {
          if (allImages[colorIndex]?.url) return allImages[colorIndex].url;
        }
      }

      return null;
    },
    [product.images, uniqueColors]
  );

  const hasRealColors =
    uniqueColors.length > 0 &&
    !uniqueColors.every(c => {
      const lower = c.colorName.toLowerCase();
      return lower === 'standard' || lower === 'default' || lower === '';
    });

  const initialColor = hasRealColors && uniqueColors.length === 1 ? uniqueColors[0].colorName : '';

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
      const defaultColor = uniqueColors.length === 1 ? firstColor.colorName : null;
      setSelectedColor(defaultColor);
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
  }, [
    product.variants,
    displayImage,
    hasRealColors,
    basePrice,
    getMatchedImageUrl,
    uniqueColors,
    variants,
  ]);

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
        aria-label={`View ${displayName}${productBrand ? ` by ${productBrand}` : ''} (${displayId.slice(-4)})`}
        className="block overflow-hidden relative aspect-[4/5] shrink-0 bg-gray-50"
      >
        <Image
          src={activeImage || displayImage || '/placeholder.png'}
          alt={displayName}
          fill
          sizes="(max-width: 480px) 45vw, (max-width: 768px) 48vw, (max-width: 1024px) 33vw, 220px"
          className="object-cover transition-transform duration-700 group-hover:scale-115"
          loading="lazy"
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
          {/* Brand slug with sufficient touch target area */}
          <Link
            href={`/brand/${productBrandSlug}`}
            className="text-[#1e3b8a] dark:text-[#6b8ff5] text-xs font-bold uppercase tracking-wider min-h-[32px] inline-flex items-center py-1 hover:underline"
          >
            {productBrand}
          </Link>
          {/* Title with matching unique accessible name */}
          <Link
            href={`/product/${displayId}`}
            aria-label={`View ${displayName}${productBrand ? ` by ${productBrand}` : ''} (${displayId.slice(-4)})`}
            className="block min-h-[36px] py-1"
          >
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
                    className={`w-6 h-6 rounded-full transition-all duration-200 hover:scale-110 flex-shrink-0 border-2 shadow-sm ${
                      isSelected
                        ? 'border-[#1e3b8a] ring-2 ring-[#1e3b8a] ring-offset-2 scale-105'
                        : 'border-slate-300/90 dark:border-slate-600 hover:border-slate-400'
                    }`}
                    style={getSwatchStyle(colorName)}
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
                      aria-label={`Select size ${sz}`}
                      aria-pressed={isSelected}
                      className={`px-2 py-0.5 text-[9px] font-black rounded border active:scale-95 ${
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
