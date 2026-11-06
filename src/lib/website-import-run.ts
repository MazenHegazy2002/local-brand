import { prisma } from '@/lib/prisma';
import { saveFile } from '@/lib/file-store';
import { notifyAdminEvent } from '@/lib/admin-registration-alerts';
import {
  normalizeSiteUrl,
  scrapeWebsite,
  safeFetch,
  type ImportedProduct,
} from '@/lib/website-import';
import { notifyUser } from '@/lib/notification-helpers';

// Shared by the seller import (Seller Hub) and the staff import (Admin OS).

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
// Non-standard labels some hosts send (e.g. Easy Orders sends image/jpg).
const TYPE_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
};

/** Detects the format from the file's first bytes. */
export function sniffImageType(b: Buffer): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp';
  if (b.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  return null;
}
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Copies a remote image onto our own disk so the product doesn't depend on
// the old website staying online.
async function copyImage(url: string): Promise<string | null> {
  try {
    const r = await safeFetch(url, { accept: 'image/*', maxBytes: MAX_IMAGE_BYTES });
    if (!r || r.status !== 200 || r.body.length < 100) return null;
    const label = r.contentType.split(';')[0].trim().toLowerCase();
    const type = IMAGE_TYPES.has(TYPE_ALIASES[label] ?? label)
      ? (TYPE_ALIASES[label] ?? label)
      : sniffImageType(r.body);
    return type ? await saveFile(r.body, type) : null;
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
        updated: number;
        skipped: number;
        noImage: number;
        noPrice: number;
        failed: number;
        errors: string[];
      };
    };

/**
 * Reads a website and creates every product it finds as a DRAFT in the given
 * seller's catalogue, with images copied to our storage. Re-running is safe:
 * drafts with the same title are refreshed (missing photos, sizes, colours,
 * description, price, stock filled in); published products are left alone.
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

  const existing = new Map(
    (
      await prisma.product.findMany({
        where: { sellerId: profile.id, deletedAt: null },
        select: {
          id: true,
          title: true,
          published: true,
          basePrice: true,
          _count: { select: { images: true } },
          variants: { select: { id: true }, orderBy: { id: 'asc' }, take: 1 },
        },
      })
    ).map(p => [p.title.trim().toLowerCase(), p])
  );

  const result = {
    source: scraped.source,
    found: scraped.products.length,
    created: 0,
    updated: 0,
    skipped: 0,
    noImage: 0,
    noPrice: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const [i, p] of scraped.products.entries()) {
    const key = p.title.trim().toLowerCase();
    const prev = existing.get(key);
    // Published products are the seller's live listings — never touched.
    // (Also covers duplicates within this same run, marked published below.)
    if (prev?.published) {
      result.skipped++;
      continue;
    }
    try {
      const copyAll = async () => {
        const out: string[] = [];
        for (const src of p.images.slice(0, MAX_IMAGES)) {
          const saved = await copyImage(src);
          if (saved) out.push(saved);
        }
        return out;
      };
      const attributes = JSON.stringify({
        color: p.colors.length === 1 ? p.colors[0] : 'Default',
        ...(p.colors.length > 1 ? { colors: p.colors } : {}),
        ...(p.sizes.length ? { sizes: p.sizes } : {}),
      });
      const stockCount = p.stock && p.stock > 0 ? p.stock : 0;

      if (prev) {
        // Draft from an earlier run: fill in what's missing.
        const images = prev._count.images ? [] : await copyAll();
        const price = p.price ?? prev.basePrice;
        await prisma.product.update({
          where: { id: prev.id },
          data: {
            description: p.description.slice(0, 5000) || undefined,
            ...(p.descriptionAr ? { descriptionAr: p.descriptionAr.slice(0, 5000) } : {}),
            basePrice: price,
            ...(images.length
              ? { images: { create: images.map((u, n) => ({ url: u, isPrimary: n === 0 })) } }
              : {}),
          },
        });
        if (prev.variants[0]) {
          await prisma.productVariant.update({
            where: { id: prev.variants[0].id },
            data: { attributes, price, ...(stockCount ? { stockCount } : {}) },
          });
        }
        result.updated++;
        if (!prev._count.images && !images.length) result.noImage++;
        if (!(price > 0)) result.noPrice++;
        continue;
      }

      const images = await copyAll();
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
              attributes,
              price,
              stockCount,
            },
          },
        },
      });
      existing.set(key, {
        id: '',
        title: p.title,
        published: true,
        basePrice: price,
        _count: { images: 0 },
        variants: [],
      });
      result.created++;
      if (!images.length) result.noImage++;
      if (!(price > 0)) result.noPrice++;
    } catch (err) {
      result.failed++;
      if (result.errors.length < 20) result.errors.push(`"${p.title}": ${(err as Error).message}`);
    }
  }

  if (result.created + result.updated > 0) {
    const who = opts.startedBy ?? profile.storeName;
    void notifyAdminEvent({
      icon: '🌐',
      title: `${who} imported ${result.created} products (${result.updated} refreshed) from a website into ${profile.storeName}`,
      summary: `${who} imported ${result.created} draft products from ${url} into ${profile.storeName}.`,
      details: {
        Store: profile.storeName,
        'Started by': who,
        Website: url,
        Created: result.created,
        'Drafts refreshed': result.updated,
        'Without image': result.noImage,
        'Without price': result.noPrice,
      },
      link: '/admin-os?tab=products',
    });
  }

  return { ok: true, result };
}

// ── Approval flow ────────────────────────────────────────────────────────
// Sellers and co-admins ask; an admin approves (runs the import) or rejects.

export async function requestImport(opts: {
  sellerId: string;
  url: string;
  requestedById: string;
  requestedRole: 'SELLER' | 'CO_ADMIN';
}) {
  let url: string;
  try {
    url = normalizeSiteUrl(opts.url).toString();
  } catch {
    return {
      ok: false as const,
      status: 400,
      error: 'That link does not look like a website address.',
    };
  }
  const profile = await prisma.sellerProfile.findUnique({
    where: { id: opts.sellerId },
    select: { storeName: true },
  });
  if (!profile) return { ok: false as const, status: 404, error: 'Seller profile not found' };

  const pending = await prisma.productImportRequest.findFirst({
    where: { sellerId: opts.sellerId, url, status: 'PENDING' },
  });
  if (pending) return { ok: true as const, request: pending, alreadyPending: true };

  const request = await prisma.productImportRequest.create({
    data: {
      sellerId: opts.sellerId,
      url,
      requestedById: opts.requestedById,
      requestedRole: opts.requestedRole,
    },
  });
  const who = opts.requestedRole === 'CO_ADMIN' ? 'A co-admin' : profile.storeName;
  void notifyAdminEvent({
    icon: '🌐',
    title: `Approve product import for ${profile.storeName}?`,
    summary: `${who} asked to import products from ${url} into ${profile.storeName}. Approve or reject it in Admin OS → Products.`,
    details: { Store: profile.storeName, Website: url, 'Requested by': who },
    link: '/admin-os?tab=products',
  });
  return { ok: true as const, request, alreadyPending: false };
}

export async function decideImportRequest(opts: {
  id: string;
  adminId: string;
  approve: boolean;
}): Promise<
  { ok: false; status: number; error: string } | { ok: true; status: string; result?: unknown }
> {
  // Claim the request so two admins can't run it twice.
  const claimed = await prisma.productImportRequest.updateMany({
    where: { id: opts.id, status: 'PENDING' },
    data: {
      status: opts.approve ? 'RUNNING' : 'REJECTED',
      decidedById: opts.adminId,
      decidedAt: new Date(),
    },
  });
  if (!claimed.count) return { ok: false, status: 409, error: 'This request was already handled.' };
  const req = await prisma.productImportRequest.findUniqueOrThrow({ where: { id: opts.id } });
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: req.sellerId },
    select: { userId: true, storeName: true },
  });

  if (!opts.approve) {
    if (seller && req.requestedRole === 'SELLER') {
      await notifyUser({
        userId: seller.userId,
        title: 'Product import not approved',
        message: `Your request to import products from ${req.url} was not approved.`,
        link: '/seller-hub?tab=products',
      });
    }
    return { ok: true, status: 'REJECTED' };
  }

  const out = await importWebsiteForSeller({
    sellerId: req.sellerId,
    url: req.url,
    startedBy: `Admin (approved request)`,
  });
  await prisma.productImportRequest.update({
    where: { id: req.id },
    data: {
      status: out.ok ? 'DONE' : 'FAILED',
      result: JSON.stringify(out.ok ? out.result : { error: out.error }),
    },
  });
  if (seller) {
    await notifyUser({
      userId: seller.userId,
      title: out.ok ? 'Your products were imported' : 'Product import failed',
      message: out.ok
        ? `${out.result.created} products were added to your store as drafts (${out.result.updated} updated). Review and publish them.`
        : `We couldn't import products from ${req.url}: ${out.error}`,
      link: '/seller-hub?tab=products',
    });
  }
  return out.ok
    ? { ok: true, status: 'DONE', result: out.result }
    : { ok: false, status: out.status, error: out.error };
}
