/**
 * @jest-environment node
 *
 * Unit tests for the static portion of `src/app/sitemap.ts`.
 * We mock the prisma client so we can verify URL shapes without hitting a DB.
 */

import type { MetadataRoute } from 'next';
import { PLATFORM_URL } from '@/lib/constants';

// Mock prisma before importing the sitemap module
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'prod-1', updatedAt: new Date('2025-01-01') },
        { id: 'prod-2', updatedAt: new Date('2025-02-01') },
      ]),
    },
    category: {
      findMany: jest.fn().mockResolvedValue([{ slug: 'fashion' }, { slug: 'electronics' }]),
    },
    sellerProfile: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ storeName: 'Cairo Crafts', updatedAt: new Date('2025-01-15') }]),
    },
  },
}));

describe('sitemap', () => {
  let sitemap: () => Promise<MetadataRoute.Sitemap>;

  beforeAll(async () => {
    const mod = await import('@/app/sitemap');
    sitemap = mod.default;
  });

  it('returns an array of sitemap entries', async () => {
    const entries = await sitemap();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  it('includes the homepage as priority 1', async () => {
    const entries = await sitemap();
    const home = entries.find(e => e.url === PLATFORM_URL);
    expect(home).toBeDefined();
    expect(home?.priority).toBe(1);
  });

  it('includes /shop with high priority', async () => {
    const entries = await sitemap();
    const shop = entries.find(e => e.url === `${PLATFORM_URL}/shop`);
    expect(shop).toBeDefined();
    expect(shop?.priority).toBeGreaterThanOrEqual(0.8);
  });

  it('includes all static pages', async () => {
    const entries = await sitemap();
    const urls = entries.map(e => e.url);
    expect(urls).toContain(`${PLATFORM_URL}/brands`);
    expect(urls).toContain(`${PLATFORM_URL}/about`);
    expect(urls).toContain(`${PLATFORM_URL}/contact`);
    expect(urls).toContain(`${PLATFORM_URL}/legal`);
  });

  it('includes mocked product pages', async () => {
    const entries = await sitemap();
    const urls = entries.map(e => e.url);
    expect(urls).toContain(`${PLATFORM_URL}/product/prod-1`);
    expect(urls).toContain(`${PLATFORM_URL}/product/prod-2`);
  });

  it('includes mocked category pages', async () => {
    const entries = await sitemap();
    const urls = entries.map(e => e.url);
    expect(urls).toContain(`${PLATFORM_URL}/category/fashion`);
    expect(urls).toContain(`${PLATFORM_URL}/category/electronics`);
  });

  it('includes mocked brand pages with slugified names', async () => {
    const entries = await sitemap();
    const urls = entries.map(e => e.url);
    expect(urls).toContain(`${PLATFORM_URL}/brand/cairo-crafts`);
  });

  it('all URLs start with the platform URL', async () => {
    const entries = await sitemap();
    for (const entry of entries) {
      expect(entry.url.startsWith(PLATFORM_URL)).toBe(true);
    }
  });

  it('does not include private routes like /dashboard or /admin', async () => {
    const entries = await sitemap();
    const urls = entries.map(e => e.url);
    const privateRoutes = urls.filter(
      u => u.includes('/dashboard') || u.includes('/admin') || u.includes('/api/')
    );
    expect(privateRoutes).toHaveLength(0);
  });
});
