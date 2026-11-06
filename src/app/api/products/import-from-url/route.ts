import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { rateLimit } from '@/lib/rateLimit';
import { saveFile } from '@/lib/file-store';
import { notifyAdminEvent } from '@/lib/admin-registration-alerts';
import { scrapeWebsite, safeFetch, type ImportedProduct } from '@/lib/website-import';

export const maxDuration = 300;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Copies a remote image onto our own disk so the product doesn't depend on
// the old website staying online.
async function copyImage(url: string): Promise<string | null> {
  try {
    const r = await safeFetch(url, { accept: 'image/*', maxBytes: MAX_IMAGE_BYTES });
    const type = r?.contentType.split(';')[0].trim().toLowerCase();
    if (!r || r.status !== 200 || !type || !IMAGE_TYPES.has(type) || r.body.length < 100)
      return null;
    return await saveFile(r.body, type);
  } catch {
    return null;
  }
}

function slugify(title: string, i: number) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'product'}-${Date.now().toString(36)}-${i}`;
}

/**
 * POST /api/products/import-from-url  { url }
 *
 * Reads a seller's old website (Shopify, WooCommerce, or any site with
 * schema.org product data) and creates every product it finds as a DRAFT
 * in the seller's catalogue, with images copied to our storage. The seller
 * reviews them and publishes each one from Seller Hub > Products.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser)?.role !== 'SELLER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { windowMs: 60 * 60 * 1000, maxRequests: 5 });
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Too many imports. Please try again in an hour.' },
      { status: 429 }
    );
  }

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url || typeof url !== 'string' || url.length > 500) {
    return NextResponse.json({ error: 'Enter your website link.' }, { status: 400 });
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: (session.user as SessionUser).id },
  });
  if (!profile) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });

  let scraped: { source: string; products: ImportedProduct[] };
  try {
    scraped = await scrapeWebsite(url);
  } catch (err) {
    return NextResponse.json(
      { error: `Couldn't open that website: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (!scraped.products.length) {
    return NextResponse.json(
      {
        error:
          "We couldn't find any products on that website. Try the link to your shop or a product page, or use the Excel import instead.",
      },
      { status: 422 }
    );
  }

  const category = await prisma.category.findFirst({ orderBy: { name: 'asc' } });
  if (!category) {
    return NextResponse.json({ error: 'No categories exist on the platform.' }, { status: 500 });
  }

  // Skip products this seller already has (by title), so re-running is safe.
  const existing = new Set(
    (
      await prisma.product.findMany({
        where: { sellerId: profile.id, deletedAt: null },
        select: { title: true },
      })
    ).map(p => p.title.trim().toLowerCase())
  );

  const results = {
    source: scraped.source,
    found: scraped.products.length,
    created: 0,
    skipped: 0,
    noImage: 0,
    noPrice: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const [i, p] of scraped.products.entries()) {
    if (existing.has(p.title.trim().toLowerCase())) {
      results.skipped++;
      continue;
    }
    try {
      const images: string[] = [];
      for (const src of p.images.slice(0, MAX_IMAGES)) {
        const saved = await copyImage(src);
        if (saved) images.push(saved);
      }

      const price = p.price ?? 0;
      const slug = slugify(p.title, i);
      const sizes = p.sizes.length ? p.sizes : [];

      await prisma.product.create({
        data: {
          title: p.title.slice(0, 200),
          titleAr: p.titleAr?.slice(0, 200) || null,
          description: p.description.slice(0, 5000),
          descriptionAr: p.descriptionAr?.slice(0, 5000) || null,
          basePrice: price,
          sellerId: profile.id,
          categoryId: category.id,
          published: false, // always a draft — the seller activates it
          slug,
          images: {
            create: images.map((u, n) => ({ url: u, isPrimary: n === 0 })),
          },
          variants: {
            create: {
              sku: `${slug.toUpperCase().slice(0, 40)}`,
              title: 'Default',
              attributes: JSON.stringify({
                color: p.colors.length === 1 ? p.colors[0] : 'Default',
                ...(p.colors.length > 1 ? { colors: p.colors } : {}),
                ...(sizes.length ? { sizes } : {}),
              }),
              price,
              stockCount: p.stock && p.stock > 0 ? p.stock : 0,
            },
          },
        },
      });
      existing.add(p.title.trim().toLowerCase());
      results.created++;
      if (!images.length) results.noImage++;
      if (!(price > 0)) results.noPrice++;
    } catch (err) {
      results.failed++;
      if (results.errors.length < 20)
        results.errors.push(`"${p.title}": ${(err as Error).message}`);
    }
  }

  if (results.created > 0) {
    void notifyAdminEvent({
      icon: '🌐',
      title: `${profile.storeName} imported ${results.created} products from a website`,
      summary: `${profile.storeName} imported ${results.created} draft products from ${url}.`,
      details: {
        Store: profile.storeName,
        Website: url,
        Created: results.created,
        'Without image': results.noImage,
        'Without price': results.noPrice,
      },
      link: '/admin-os?tab=products',
    });
  }

  return NextResponse.json(results);
}
