/**
 * Canonical list of image hostnames allowed across the platform.
 * Mirrors next.config.ts `images.remotePatterns` — keep them in sync.
 *
 * Used by:
 *   - src/app/api/products/bulk-upload/route.ts  (import validation)
 *   - src/app/api/ai/virtual-tryon/route.ts      (SSRF guard)
 */

export const ALLOWED_IMAGE_HOSTNAMES: string[] = [
  'images.unsplash.com',
  'res.cloudinary.com',
  'picsum.photos',
  '*.amazonaws.com',
  '*.public.blob.vercel-storage.com',
  'blob.vercel-storage.com',
  'lh3.googleusercontent.com',
];

/**
 * Returns true if `url` is an https URL whose hostname is on the allow-list.
 * Supports simple `*`-prefix wildcards (e.g. `*.amazonaws.com`).
 */
export function isAllowedImageUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const hostname = parsed.hostname.toLowerCase();
  return ALLOWED_IMAGE_HOSTNAMES.some(pattern => {
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1); // e.g. ".amazonaws.com"
      return hostname.endsWith(suffix);
    }
    return hostname === pattern;
  });
}
