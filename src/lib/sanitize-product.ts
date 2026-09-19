/**
 * Sanitizes product objects so large base64 data URLs (e.g. data:image/jpeg;base64,...)
 * stored in the database are transformed into lightweight streaming API endpoints
 * (/api/images/product-image/[id] or /api/images/product/[id]).
 *
 * This prevents multi-megabyte HTML documents and RSC payloads, reducing initial
 * page load transfer size by up to 99%.
 */

export function sanitizeProductImage<T extends { id?: string; url: string }>(
  img: T,
  productId?: string
): T {
  if (!img || !img.url) return img;
  if (img.url.startsWith('data:image/')) {
    if (img.id) {
      return {
        ...img,
        url: `/api/images/product-image/${img.id}`,
      };
    }
    if (productId) {
      return {
        ...img,
        url: `/api/images/product/${productId}`,
      };
    }
  }
  return img;
}

export function sanitizeProduct<
  T extends {
    id: string;
    images?: Array<{ id: string; url: string; [key: string]: any }>;
    image?: string;
    variants?: Array<{ image?: string | null; [key: string]: any }>;
    [key: string]: any;
  },
>(product: T): T {
  if (!product) return product;

  let sanitizedImages = product.images;
  if (Array.isArray(product.images)) {
    sanitizedImages = product.images.map(img => sanitizeProductImage(img, product.id));
  }

  let sanitizedImage = product.image;
  if (sanitizedImage && sanitizedImage.startsWith('data:image/')) {
    const firstImg = sanitizedImages?.[0];
    sanitizedImage = firstImg?.url || `/api/images/product/${product.id}`;
  } else if (!sanitizedImage && sanitizedImages?.[0]?.url) {
    sanitizedImage = sanitizedImages[0].url;
  }

  let sanitizedVariants = product.variants;
  if (Array.isArray(product.variants)) {
    sanitizedVariants = product.variants.map(v => {
      if (v.image && v.image.startsWith('data:image/')) {
        return {
          ...v,
          image: sanitizedImage || `/api/images/product/${product.id}`,
        };
      }
      return v;
    });
  }

  return {
    ...product,
    images: sanitizedImages,
    image: sanitizedImage,
    variants: sanitizedVariants,
  };
}

export function sanitizeProducts<
  T extends {
    id: string;
    images?: Array<{ id: string; url: string; [key: string]: any }>;
    image?: string;
    variants?: Array<{ image?: string | null; [key: string]: any }>;
    [key: string]: any;
  },
>(products: T[]): T[] {
  if (!Array.isArray(products)) return [];
  return products.map(sanitizeProduct);
}
