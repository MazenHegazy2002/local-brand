import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/db/route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn().mockResolvedValue([{ id: '1', name: 'Apparel' }]),
      count: jest.fn().mockResolvedValue(1),
    },
  },
}));

describe('Master REST API (/api/v1/db)', () => {
  it('rejects requests without valid API key', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/db?model=product');
    const res = await GET(req);
    expect(res.status).toBe(401);
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
    expect(body.message).toContain('Master REST API');
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
    expect(body.data).toHaveLength(1);
  });
});
