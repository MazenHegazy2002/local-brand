import { lookup } from 'dns/promises';
import net from 'net';

// Pulls a seller's existing catalogue off their old website so it can be
// created as draft products. Tries, in order:
//   1. Shopify's public /products.json
//   2. WooCommerce's public Store API
//   3. A plain JSON product API at a common path (custom-built shops).
//   4. Any site: schema.org Product data (JSON-LD) on the page and on the
//      product pages listed in its sitemap.

export type ImportedProduct = {
  title: string;
  titleAr?: string | null;
  description: string;
  descriptionAr?: string | null;
  stock?: number | null;
  price: number | null;
  currency: string | null;
  images: string[];
  sizes: string[];
  colors: string[];
  sku: string | null;
  sourceUrl: string | null;
};

export const MAX_PRODUCTS = 200;
const MAX_PAGE_BYTES = 5 * 1024 * 1024;
const MAX_SITEMAP_PAGES = 60;
const TIMEOUT_MS = 15_000;
const UA = 'Mozilla/5.0 (compatible; BrandyyImporter/1.0; +https://brandyy.shop)';

// ── URL safety (no fetching our own server / private network) ─────────────

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
  return (
    v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')
  );
}

export function normalizeSiteUrl(raw: string): URL {
  let s = raw.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  const u = new URL(s);
  if (u.protocol !== 'http:' && u.protocol !== 'https:')
    throw new Error('Only http(s) links are supported.');
  if (u.username || u.password)
    throw new Error('Links with a username or password are not supported.');
  return u;
}

async function assertPublicHost(u: URL) {
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('That address is not a public website.');
  }
  const addrs = net.isIP(host) ? [host] : (await lookup(host, { all: true })).map(a => a.address);
  if (!addrs.length || addrs.some(isPrivateIp))
    throw new Error('That address is not a public website.');
}

/** fetch() that re-checks every redirect hop and caps the body size. */
export async function safeFetch(
  rawUrl: string,
  opts: { accept?: string; maxBytes?: number } = {}
): Promise<{ url: string; status: number; contentType: string; body: Buffer } | null> {
  let url = new URL(rawUrl);
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': UA, Accept: opts.accept ?? '*/*' },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url);
      continue;
    }
    const max = opts.maxBytes ?? MAX_PAGE_BYTES;
    if (Number(res.headers.get('content-length') || 0) > max) return null;
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > max) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    }
    return {
      url: url.toString(),
      status: res.status,
      contentType: res.headers.get('content-type') || '',
      body: Buffer.concat(chunks),
    };
  }
  return null;
}

async function getJson(url: string): Promise<unknown> {
  try {
    const r = await safeFetch(url, { accept: 'application/json' });
    if (!r || r.status !== 200 || !/json/i.test(r.contentType)) return null;
    return JSON.parse(r.body.toString('utf8'));
  } catch {
    return null;
  }
}

async function getText(url: string): Promise<string | null> {
  try {
    const r = await safeFetch(url, { accept: 'text/html,application/xml,text/xml,*/*' });
    return r && r.status === 200 ? r.body.toString('utf8') : null;
  } catch {
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(s: string) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<\s*(br|\/p|\/div|\/li|\/h\d)\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

function toNumber(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function uniq(arr: (string | null | undefined)[]) {
  return [...new Set(arr.map(s => (s ?? '').trim()).filter(Boolean))];
}

function absolute(url: string, base: string) {
  try {
    const u = new URL(url.startsWith('//') ? `https:${url}` : url, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    // Shopify CDN serves thumbnails when asked for a width — get the full image.
    if (u.hostname === 'cdn.shopify.com' || u.pathname.includes('/cdn/shop/')) {
      ['width', 'height', 'crop'].forEach(k => u.searchParams.delete(k));
    }
    return u.toString();
  } catch {
    return null;
  }
}

const SIZE_OPT = /^(size|sizes|المقاس|مقاس|الحجم)$/i;
const COLOR_OPT = /^(colou?r|colou?rs|اللون|لون)$/i;

// ── 1. Shopify ───────────────────────────────────────────────────────────

type ShopifyProduct = {
  title: string;
  body_html?: string;
  handle?: string;
  images?: { src: string }[];
  options?: { name: string; values: string[] }[];
  variants?: { price?: string; sku?: string }[];
};

export function mapShopify(list: ShopifyProduct[], origin: string): ImportedProduct[] {
  return list.map(p => {
    const opt = (re: RegExp) =>
      uniq((p.options ?? []).filter(o => re.test(o.name)).flatMap(o => o.values));
    const prices = (p.variants ?? [])
      .map(v => toNumber(v.price))
      .filter((n): n is number => n !== null);
    return {
      title: p.title,
      description: htmlToText(p.body_html),
      price: prices.length ? Math.min(...prices) : null,
      currency: null,
      images: uniq((p.images ?? []).map(i => absolute(i.src, origin))),
      sizes: opt(SIZE_OPT),
      colors: opt(COLOR_OPT),
      sku: p.variants?.[0]?.sku || null,
      sourceUrl: p.handle ? `${origin}/products/${p.handle}` : null,
    };
  });
}

async function fromShopify(origin: string): Promise<ImportedProduct[] | null> {
  const all: ShopifyProduct[] = [];
  for (let page = 1; page <= 4 && all.length < MAX_PRODUCTS; page++) {
    const data = (await getJson(`${origin}/products.json?limit=250&page=${page}`)) as {
      products?: ShopifyProduct[];
    } | null;
    if (!data || !Array.isArray(data.products)) return page === 1 ? null : mapShopify(all, origin);
    all.push(...data.products);
    if (data.products.length < 250) break;
  }
  return mapShopify(all, origin);
}

// ── 2. WooCommerce Store API ─────────────────────────────────────────────

type WooProduct = {
  name: string;
  description?: string;
  short_description?: string;
  permalink?: string;
  sku?: string;
  prices?: { price?: string; currency_code?: string; currency_minor_unit?: number };
  images?: { src: string }[];
  attributes?: { name: string; terms?: { name: string }[] }[];
};

export function mapWoo(list: WooProduct[], origin: string): ImportedProduct[] {
  return list.map(p => {
    const attr = (re: RegExp) =>
      uniq(
        (p.attributes ?? [])
          .filter(a => re.test(a.name))
          .flatMap(a => (a.terms ?? []).map(t => t.name))
      );
    const minor = p.prices?.currency_minor_unit ?? 2;
    const raw = toNumber(p.prices?.price);
    return {
      title: decodeEntities(p.name),
      description: htmlToText(p.description || p.short_description),
      price: raw === null ? null : raw / 10 ** minor,
      currency: p.prices?.currency_code || null,
      images: uniq((p.images ?? []).map(i => absolute(i.src, origin))),
      sizes: attr(SIZE_OPT),
      colors: attr(COLOR_OPT),
      sku: p.sku || null,
      sourceUrl: p.permalink || null,
    };
  });
}

async function fromWoo(origin: string): Promise<ImportedProduct[] | null> {
  const all: WooProduct[] = [];
  for (let page = 1; page <= 3 && all.length < MAX_PRODUCTS; page++) {
    const data = await getJson(`${origin}/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
    if (!Array.isArray(data)) return page === 1 ? null : mapWoo(all, origin);
    all.push(...(data as WooProduct[]));
    if (data.length < 100) break;
  }
  return mapWoo(all, origin);
}

// ── 3. Plain JSON product API ────────────────────────────────────────────

const pick = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    const v = o[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

export function mapGenericJson(list: Record<string, unknown>[], origin: string): ImportedProduct[] {
  return list
    .map(o => {
      const title = pick(o, [
        'name_en',
        'title_en',
        'name',
        'title',
        'product_name',
        'productName',
      ]);
      if (typeof title !== 'string') return null;
      const img = pick(o, ['images', 'image_url', 'imageUrl', 'image', 'thumbnail', 'photo']);
      const imgs = (Array.isArray(img) ? img : [img]).map(i =>
        typeof i === 'string'
          ? i
          : ((i as Record<string, unknown>)?.src ?? (i as Record<string, unknown>)?.url)
      );
      const str = (v: unknown) => (typeof v === 'string' ? v : null);
      const stock = toNumber(
        pick(o, ['available_stock', 'stock', 'stockCount', 'quantity', 'total_stock'])
      );
      return {
        title: title.trim(),
        titleAr: str(pick(o, ['name_ar', 'title_ar', 'nameAr', 'titleAr'])),
        description: htmlToText(
          str(pick(o, ['description_en', 'description', 'body_html', 'details']))
        ),
        descriptionAr: htmlToText(str(pick(o, ['description_ar', 'descriptionAr']))) || null,
        stock: stock === null ? null : Math.floor(stock),
        price: toNumber(
          pick(o, [
            'price',
            'sale_price',
            'catalog_price',
            'base_price',
            'regular_price',
            'basePrice',
          ])
        ),
        currency: str(pick(o, ['currency', 'currency_code'])),
        images: uniq(imgs.map(i => (typeof i === 'string' ? absolute(i, origin) : null))),
        sizes: [],
        colors: [],
        sku: str(pick(o, ['sku', 'code', 'quick_code'])),
        sourceUrl: null,
      } satisfies ImportedProduct;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

async function fromJsonApi(origin: string): Promise<ImportedProduct[] | null> {
  for (const path of ['/api/products', '/api/v1/products', '/api/catalog/products']) {
    const data = await getJson(`${origin}${path}`);
    const list = Array.isArray(data)
      ? data
      : ((data as Record<string, unknown> | null)?.products ??
        (data as Record<string, unknown> | null)?.data ??
        (data as Record<string, unknown> | null)?.items);
    if (Array.isArray(list) && list.length) {
      const mapped = mapGenericJson(
        list.filter(x => x && typeof x === 'object'),
        origin
      );
      if (mapped.length) return mapped;
    }
  }
  return null;
}

// ── 4. Any site: JSON-LD Product on product pages ────────────────────────

type LdNode = Record<string, unknown>;

function flattenLd(node: unknown, out: LdNode[] = []): LdNode[] {
  if (Array.isArray(node)) node.forEach(n => flattenLd(n, out));
  else if (node && typeof node === 'object') {
    const o = node as LdNode;
    out.push(o);
    if (o['@graph']) flattenLd(o['@graph'], out);
    if (o.hasVariant) flattenLd(o.hasVariant, out);
  }
  return out;
}

function isProduct(n: LdNode) {
  const t = n['@type'];
  return (Array.isArray(t) ? t : [t]).some(x => x === 'Product' || x === 'ProductGroup');
}

function ldImages(v: unknown, base: string): string[] {
  const list = Array.isArray(v) ? v : [v];
  return uniq(
    list
      .map(
        i =>
          (typeof i === 'string' ? i : ((i as LdNode)?.url ?? (i as LdNode)?.contentUrl)) as string
      )
      .map(s => (s ? absolute(s, base) : null))
  );
}

function metaContent(html: string, prop: string) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
    'i'
  );
  const m = re.exec(html);
  return m ? decodeEntities(m[1] ?? m[2] ?? '') : null;
}

/** Finds products described on one HTML page. */
export function parseProductPage(html: string, pageUrl: string): ImportedProduct[] {
  const nodes: LdNode[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (let m; (m = re.exec(html)); ) {
    try {
      flattenLd(JSON.parse(m[1].trim()), nodes);
    } catch {
      /* skip broken JSON-LD */
    }
  }
  const products = nodes.filter(isProduct).filter(n => typeof n.name === 'string');
  // A ProductGroup's variants are also Products — keep only the group.
  const variantNames = new Set(
    products.flatMap(p => flattenLd(p.hasVariant ?? [])).map(v => v.name as string)
  );
  const top = products.filter(
    p => !variantNames.has(p.name as string) || p['@type'] === 'ProductGroup'
  );

  const found = top.map(p => {
    const offers = flattenLd(p.offers ?? []);
    const prices = offers
      .map(o => toNumber(o.price ?? o.lowPrice))
      .filter((n): n is number => n !== null);
    const variants = flattenLd(p.hasVariant ?? []);
    return {
      title: decodeEntities(String(p.name)).trim(),
      description: htmlToText(String(p.description ?? '')),
      price: prices.length ? Math.min(...prices) : null,
      currency: (offers.find(o => o.priceCurrency)?.priceCurrency as string) ?? null,
      images: ldImages(p.image ?? variants.map(v => v.image), pageUrl),
      sizes: uniq(variants.map(v => v.size as string)),
      colors: uniq([p.color as string, ...variants.map(v => v.color as string)]),
      sku: (p.sku as string) || null,
      sourceUrl: (p.url as string) ? absolute(p.url as string, pageUrl) : pageUrl,
    };
  });
  if (found.length) return found;

  // No JSON-LD: fall back to Open Graph product tags.
  if (/^product/i.test(metaContent(html, 'og:type') ?? '')) {
    const title = metaContent(html, 'og:title');
    const img = metaContent(html, 'og:image');
    if (title) {
      return [
        {
          title,
          description: metaContent(html, 'og:description') ?? '',
          price: toNumber(metaContent(html, 'product:price:amount')),
          currency: metaContent(html, 'product:price:currency'),
          images: img ? uniq([absolute(img, pageUrl)]) : [],
          sizes: [],
          colors: [],
          sku: null,
          sourceUrl: pageUrl,
        },
      ];
    }
  }
  return [];
}

export function sitemapLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?\s*<\/loc>/gi;
  for (let m; (m = re.exec(xml)); ) out.push(decodeEntities(m[1].trim()));
  return out;
}

const PRODUCT_PATH = /\/(products?|item|shop|p)\/|product[-_]|\/منتج/i;

async function productUrlsFromSitemap(origin: string): Promise<string[]> {
  const queue = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  const robots = await getText(`${origin}/robots.txt`);
  for (const m of robots?.matchAll(/^sitemap:\s*(\S+)/gim) ?? []) queue.unshift(m[1]);
  const seen = new Set<string>();
  const pages = new Set<string>();
  while (queue.length && seen.size < 15) {
    const sm = queue.shift()!;
    if (seen.has(sm)) continue;
    seen.add(sm);
    const xml = await getText(sm);
    if (!xml) continue;
    for (const loc of sitemapLocs(xml)) {
      if (/\.xml(\.gz)?($|\?)/i.test(loc)) {
        // Product sitemaps first.
        if (/product/i.test(loc)) queue.unshift(loc);
        else queue.push(loc);
      } else if (PRODUCT_PATH.test(new URL(loc, origin).pathname)) {
        pages.add(loc);
      }
    }
  }
  return [...pages];
}

async function fromPages(start: URL): Promise<ImportedProduct[]> {
  const origin = start.origin;
  const results: ImportedProduct[] = [];
  const startHtml = await getText(start.toString());
  if (startHtml) results.push(...parseProductPage(startHtml, start.toString()));

  const urls = (await productUrlsFromSitemap(origin)).slice(0, MAX_SITEMAP_PAGES);
  // A few at a time so we don't hammer the old site.
  for (let i = 0; i < urls.length && results.length < MAX_PRODUCTS; i += 5) {
    const batch = await Promise.all(
      urls.slice(i, i + 5).map(async u => {
        const html = await getText(u);
        return html ? parseProductPage(html, u) : [];
      })
    );
    results.push(...batch.flat());
  }
  return results;
}

// ── Entry point ──────────────────────────────────────────────────────────

export async function scrapeWebsite(
  rawUrl: string
): Promise<{ source: 'shopify' | 'woocommerce' | 'json' | 'pages'; products: ImportedProduct[] }> {
  const start = normalizeSiteUrl(rawUrl);
  await assertPublicHost(start);
  const origin = start.origin;

  let source: 'shopify' | 'woocommerce' | 'json' | 'pages' = 'shopify';
  let products = await fromShopify(origin);
  if (!products?.length) {
    source = 'woocommerce';
    products = await fromWoo(origin);
  }
  if (!products?.length) {
    source = 'json';
    products = await fromJsonApi(origin);
  }
  if (!products?.length) {
    source = 'pages';
    products = await fromPages(start);
  }

  // De-duplicate by title, keep the richest entry.
  const byTitle = new Map<string, ImportedProduct>();
  for (const p of products) {
    if (!p.title) continue;
    const key = p.title.toLowerCase();
    const prev = byTitle.get(key);
    if (
      !prev ||
      p.images.length + p.description.length > prev.images.length + prev.description.length
    ) {
      byTitle.set(key, p);
    }
  }
  return { source, products: [...byTitle.values()].slice(0, MAX_PRODUCTS) };
}
