// Base64 product images are served by /api/images/product-image/[id] so API
// responses stay small. Behind the VPS proxy req.url is 0.0.0.0:3000, so build
// the public origin from the forwarded headers.
export function publicOrigin(req: Request) {
  const h = req.headers;
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return new URL(req.url).origin;
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto.split(',')[0]}://${host.split(',')[0]}`;
}

export function productImageUrl(req: Request, img: { id: string; url: string }) {
  if (img.url.startsWith('data:')) return `${publicOrigin(req)}/api/images/product-image/${img.id}`;
  // Disk-stored files are saved as "/api/files/<name>"; the app needs a full URL.
  if (img.url.startsWith('/')) return `${publicOrigin(req)}${img.url}`;
  return img.url;
}
