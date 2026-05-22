/**
 * @jest-environment node
 *
 * Unit tests for GET /api/cron/backup — the automated daily backup handler.
 *
 * Validates:
 *  - Bearer-token auth guard
 *  - Correct response shape (success, exportedAt, rowCounts, durationMs, storage)
 *  - All required tables are present in rowCounts
 *  - Row counts match mock data
 *  - Graceful 500 on DB failure
 *  - Storage field reflects missing BLOB_READ_WRITE_TOKEN
 *
 * The global prisma mock in tests/setup.ts is reused; we configure each
 * model's findMany return value in beforeEach.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/cron/backup/route';

type MockFn = jest.Mock<any>;
const mocked = prisma as unknown as {
  user: { findMany: MockFn };
  product: { findMany: MockFn };
  order: { findMany: MockFn };
  category: { findMany: MockFn };
  sellerProfile: { findMany: MockFn };
  notification: { findMany: MockFn };
  promoCodeUsage: { findMany: MockFn };
  auditLog: { findMany: MockFn };
};

const REQUIRED_TABLES = ['users', 'products', 'orders', 'categories', 'sellerProfiles'];

function makeRequest(authHeader?: string): Request {
  return new Request('http://localhost/api/cron/backup', {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

beforeEach(() => {
  jest.clearAllMocks();

  // Fixture data — one row per table so rowCounts are easy to assert
  mocked.user.findMany.mockResolvedValue([
    {
      id: 'u1',
      email: 'test@brandy.eg',
      name: 'Test User',
      role: 'BUYER',
      createdAt: new Date(),
      emailVerified: null,
    },
  ]);
  mocked.product.findMany.mockResolvedValue([
    {
      id: 'p1',
      title: 'Test Product',
      basePrice: 100,
      published: true,
      sellerId: 'u1',
      categoryId: 'c1',
      createdAt: new Date(),
    },
  ]);
  mocked.order.findMany.mockResolvedValue([
    {
      id: 'o1',
      status: 'PENDING',
      totalAmount: 150,
      userId: 'u1',
      createdAt: new Date(),
      idempotencyKey: 'idem-1',
    },
  ]);
  mocked.category.findMany.mockResolvedValue([
    { id: 'c1', name: 'Electronics', slug: 'electronics' },
  ]);
  mocked.sellerProfile.findMany.mockResolvedValue([
    { id: 's1', userId: 'u1', storeName: 'Brandy Store', status: 'ACTIVE', createdAt: new Date() },
  ]);
  mocked.notification.findMany.mockResolvedValue([]);
  mocked.promoCodeUsage.findMany.mockResolvedValue([]);
  mocked.auditLog.findMany.mockResolvedValue([]);

  // Ensure no auth secret or blob token by default
  delete process.env.CRON_SECRET;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

// ── Auth guard ──────────────────────────────────────────────────────────────

describe('auth guard', () => {
  it('returns 401 when CRON_SECRET is set but Authorization header is absent', async () => {
    process.env.CRON_SECRET = 'supersecret';
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toMatch(/unauthorized/i);
  });

  it('returns 401 when CRON_SECRET is set and wrong token is provided', async () => {
    process.env.CRON_SECRET = 'supersecret';
    const res = await GET(makeRequest('Bearer wrongtoken'));
    expect(res.status).toBe(401);
  });

  it('accepts a correct Bearer token', async () => {
    process.env.CRON_SECRET = 'supersecret';
    const res = await GET(makeRequest('Bearer supersecret'));
    expect(res.status).toBe(200);
  });

  it('skips auth when CRON_SECRET is not set', async () => {
    const res = await GET(makeRequest()); // no auth header
    expect(res.status).toBe(200);
  });
});

// ── Response shape ──────────────────────────────────────────────────────────

describe('response shape', () => {
  it('returns success: true', async () => {
    const res = await GET(makeRequest());
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('includes a valid exportedAt ISO timestamp', async () => {
    const before = Date.now();
    const res = await GET(makeRequest());
    const after = Date.now();
    const body = (await res.json()) as { exportedAt: string };
    const ts = new Date(body.exportedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('includes durationMs as a non-negative number', async () => {
    const res = await GET(makeRequest());
    const body = (await res.json()) as { durationMs: number };
    expect(typeof body.durationMs).toBe('number');
    expect(body.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('includes a filename string', async () => {
    const res = await GET(makeRequest());
    const body = (await res.json()) as { filename: string };
    expect(typeof body.filename).toBe('string');
    expect(body.filename).toMatch(/^backups\/\d{4}-\d{2}-\d{2}\.json$/);
  });
});

// ── rowCounts ────────────────────────────────────────────────────────────────

describe('rowCounts', () => {
  it('includes every required table', async () => {
    const res = await GET(makeRequest());
    const body = (await res.json()) as { rowCounts: Record<string, number> };
    for (const table of REQUIRED_TABLES) {
      expect(body.rowCounts).toHaveProperty(table);
      expect(typeof body.rowCounts[table]).toBe('number');
    }
  });

  it('row counts match fixture data', async () => {
    const res = await GET(makeRequest());
    const body = (await res.json()) as { rowCounts: Record<string, number> };
    expect(body.rowCounts.users).toBe(1);
    expect(body.rowCounts.products).toBe(1);
    expect(body.rowCounts.orders).toBe(1);
    expect(body.rowCounts.categories).toBe(1);
    expect(body.rowCounts.sellerProfiles).toBe(1);
    expect(body.rowCounts.notifications).toBe(0);
    expect(body.rowCounts.auditLogs).toBe(0);
  });

  it('row counts are zero when DB returns empty arrays', async () => {
    mocked.user.findMany.mockResolvedValue([]);
    mocked.product.findMany.mockResolvedValue([]);
    mocked.order.findMany.mockResolvedValue([]);
    mocked.category.findMany.mockResolvedValue([]);
    mocked.sellerProfile.findMany.mockResolvedValue([]);

    const res = await GET(makeRequest());
    const body = (await res.json()) as { rowCounts: Record<string, number> };
    for (const table of REQUIRED_TABLES) {
      expect(body.rowCounts[table]).toBe(0);
    }
  });
});

// ── Storage ──────────────────────────────────────────────────────────────────

describe('storage field', () => {
  it('reports "none" and blobUrl: null when BLOB_READ_WRITE_TOKEN is absent', async () => {
    const res = await GET(makeRequest());
    const body = (await res.json()) as { storage: string; blobUrl: null };
    expect(body.storage).toMatch(/none/i);
    expect(body.blobUrl).toBeNull();
  });
});

// ── Error handling ───────────────────────────────────────────────────────────

describe('error handling', () => {
  it('returns 500 with success: false on DB error', async () => {
    mocked.user.findMany.mockRejectedValue(new Error('DB connection lost'));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toContain('DB connection lost');
  });
});
