import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/db/route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn().mockResolvedValue([{ id: '1', name: 'Apparel' }]),
      count: jest.fn().mockResolvedValue(1),
    },
    user: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'u1', name: 'Mazen', passwordHash: 'secret_hash', email: 'mazen@example.com' },
        ]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    trafficLog: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

describe('Master REST API (/api/v1/db)', () => {
  it('rejects requests without valid API key', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/db?model=product');
    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('accepts valid API key header and returns API documentation on help', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/db?help=true', {
      headers: { 'x-api-key': 'brandyy_master_key_2026_xyz999' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('Restricted Internal Server API');
  });

  it('handles POST requests with action findMany', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/db', {
      method: 'POST',
      headers: {
        'x-api-key': 'brandyy_master_key_2026_xyz999',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'findMany',
        model: 'category',
        args: { take: 2 },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('sanitizes sensitive fields like passwordHash from user queries', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/db', {
      method: 'POST',
      headers: {
        authorization: 'Bearer brandyy_master_key_2026_xyz999',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'findMany',
        model: 'user',
        args: {},
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].passwordHash).toBeUndefined();
    expect(body.data[0].email).toBe('mazen@example.com');
  });

  it('rejects mutating actions like deleteMany', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/db', {
      method: 'POST',
      headers: {
        authorization: 'Bearer brandyy_master_key_2026_xyz999',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteMany',
        model: 'user',
        args: {},
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Only read operations are permitted');
  });

  it('preserves Date objects in query results for JSON ISO serialization', async () => {
    const testDate = new Date('2026-10-27T12:00:00.000Z');
    const req = new NextRequest('http://localhost:3000/api/v1/db', {
      method: 'POST',
      headers: {
        authorization: 'Bearer brandyy_master_key_2026_xyz999',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'findMany',
        model: 'trafficLog',
        args: {},
      }),
    });
    // mock trafficLog delegate with a Date field
    (prisma as any).trafficLog = {
      findMany: jest.fn().mockResolvedValue([{ id: 'tl_1', createdAt: testDate }]),
    };

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].createdAt).toBe('2026-10-27T12:00:00.000Z');
  });
});
