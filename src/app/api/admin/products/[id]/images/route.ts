// GET   /api/admin/products/[id]/images?imageId=  → the photo's bytes (download / edit)
// PATCH /api/admin/products/[id]/images  { imageId, url } → replace it with an edited copy
// (uploaded first via /api/upload). Admins and co-admins only.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { MIME, SAFE_NAME, readStoredFile } from '@/lib/file-store';

const Body = z.object({
  imageId: z.string().min(1),
  // Disk uploads come back as /api/files/<name>; hosted ones as https URLs.
  url: z
    .string()
    .max(2000)
    .refine(v => /^\/api\/files\/[\w-]+(\.\w+)?$/.test(v) || /^https:\/\/[^\s]+$/i.test(v), {
      message: 'Invalid image url',
    }),
});

const isStaff = (role?: string) => role === 'ADMIN' || role === 'CO_ADMIN';

// Sellers can paste any https image URL; never let that reach the server's own network.
const isPublicHost = (host: string) =>
  !/^(localhost|.*\.(local|internal|localhost))$/i.test(host) &&
  !/^\d{1,3}(\.\d{1,3}){3}$/.test(host) && // IPv4 literal
  !host.includes(':'); // IPv6 literal

// Serves the photo through our own origin so the browser can download it or draw it on a
// canvas wherever it's hosted. Only URLs already stored on this product are fetched.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isStaff(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const imageId = req.nextUrl.searchParams.get('imageId') || '';
  const image = await prisma.productImage.findFirst({
    where: { id: imageId, productId: id },
    select: { url: true },
  });
  if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

  let bytes: ArrayBuffer | Buffer;
  let type = 'image/jpeg';
  const local = image.url.match(/\/api\/files\/([^/?#]+)$/);
  try {
    if (local && SAFE_NAME.test(local[1])) {
      bytes = await readStoredFile(local[1]);
      type = MIME[local[1].split('.').pop()!] ?? type;
    } else if (/^https:\/\//i.test(image.url) && isPublicHost(new URL(image.url).hostname)) {
      const res = await fetch(image.url, { signal: AbortSignal.timeout(15_000) });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.startsWith('image/')) throw new Error('not an image');
      bytes = await res.arrayBuffer();
      type = ct;
    } else {
      throw new Error('unsupported url');
    }
  } catch {
    return NextResponse.json({ error: 'Could not load the photo' }, { status: 502 });
  }
  return new NextResponse(new Uint8Array(bytes), {
    headers: { 'Content-Type': type, 'Cache-Control': 'private, no-store' },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isStaff(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { id } = await ctx.params;
  const { imageId, url } = parsed.data;
  const { count } = await prisma.productImage.updateMany({
    where: { id: imageId, productId: id },
    data: { url },
  });
  if (!count) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

  await prisma.auditLog
    .create({
      data: {
        adminId: user.id,
        action: 'EDITED_PRODUCT_IMAGE',
        targetId: id,
        details: `Replaced image ${imageId}`,
      },
    })
    .catch(() => {});
  try {
    const { invalidateCache } = await import('@/lib/cache');
    await invalidateCache('products:*');
    await invalidateCache('homepage:*');
  } catch {
    /* cache is best-effort */
  }

  return NextResponse.json({ ok: true, url });
}
