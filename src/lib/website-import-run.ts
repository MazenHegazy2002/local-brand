import { prisma } from '@/lib/prisma';
import { saveFile } from '@/lib/file-store';
import { notifyAdminEvent } from '@/lib/admin-registration-alerts';
import { scrapeWebsite, safeFetch, type ImportedProduct } from '@/lib/website-import';

// Shared by the seller import (Seller Hub) and the staff import (Admin OS).

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

export type ImportOutcome =
  | { ok: false; status: number; error: string }
  | {
      ok: true;
      result: {
        source: string;
        found: number;
        created: number;
        skipped: number;
        noImage: number;
        noPrice: number;
        failed: number;
        errors: string[];
      };
    };

/**
 * Reads a website and creates every product it finds as a DRAFT in the given
 * seller's catalogue, with images copied to our storage. Products the seller
 * already has (same title) are skipped, so re-running is safe.
 */
export async function importWebsiteForSeller(opts: {
  sellerId: string;
  url: string;
  /** Who started it, for the admin alert — e.g. "Admin jane@x.com". Omit for the seller. */
  startedBy?: string;
}): Promise<ImportOutcome> {
  const { url } = opts;
  const profile = await prisma.sellerProfile.findUnique({ where: { id: opts.sellerId } });
  if (!profile) return { ok: false, status: 404, error: 'Seller profile not found' };

  let scraped: { source: string; products: ImportedProduct[] };
  try {
    scraped = await scrapeWebsite(url);
  } catch (err) {
    return {
      ok: false,
      status: 400,
      error: `Couldn't open that website: ${(err as Error).message}`,
    };
  }

  if (!scraped.products.length) {
    return {
      ok: false,
      status: 422,
      error:
        "We couldn't find any products on that website. Try the link to the shop or a product page, or use the Excel import instead.",
    };
  }

  const category = await prisma.category.findFirst({ orderBy: { name: 'asc' } });
  if (!category) return { ok: false, status: 500, error: 'No categories exist on the platform.' };

  const existing = new Set(
    (
      await prisma.product.findMany({
        where: { sellerId: profile.id, deletedAt: null },
        select: { title: true },
      })
    ).map(p => p.title.trim().toLowerCase())
  );

  const result = {
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
      result.skipped++;
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
                ...(p.sizes.length ? { sizes: p.sizes } : {}),
              }),
              price,
              stockCount: p.stock && p.stock > 0 ? p.stock : 0,
            },
          },
        },
      });
      existing.add(p.title.trim().toLowerCase());
      result.created++;
      if (!images.length) result.noImage++;
      if (!(price > 0)) result.noPrice++;
    } catch (err) {
      result.failed++;
      if (result.errors.length < 20) result.errors.push(`"${p.title}": ${(err as Error).message}`);
    }
  }

  if (result.created > 0) {
    const who = opts.startedBy ?? profile.storeName;
    void notifyAdminEvent({
      icon: '🌐',
      title: `${who} imported ${result.created} products from a website into ${profile.storeName}`,
      summary: `${who} imported ${result.created} draft products from ${url} into ${profile.storeName}.`,
      details: {
        Store: profile.storeName,
        'Started by': who,
        Website: url,
        Created: result.created,
        'Without image': result.noImage,
        'Without price': result.noPrice,
      },
      link: '/admin-os?tab=products',
    });
  }

  return { ok: true, result };
}
