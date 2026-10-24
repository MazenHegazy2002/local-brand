/**
 * @jest-environment node
 *
 * PATCH /api/user/profile — the app saves a profile photo uploaded via /api/upload.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('@/lib/mobile-auth', () => ({
  getRequestUserId: jest.fn(async () => 'u1'),
}));

const update = jest.fn<Promise<Record<string, unknown>>, [{ data: Record<string, unknown> }]>();
jest.mock('@/lib/prisma', () => ({
  prisma: { user: { update: (a: { data: Record<string, unknown> }) => update(a) } },
}));

import { PATCH } from '@/app/api/user/profile/route';

const patch = (body: unknown) =>
  PATCH(
    new Request('https://brandyy.shop/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  );

beforeEach(() => {
  jest.clearAllMocks();
  update.mockResolvedValue({ name: 'Omar' });
});

describe('PATCH /api/user/profile avatarUrl', () => {
  it('accepts a disk upload path from /api/upload', async () => {
    const res = await patch({ name: 'Omar', avatarUrl: '/api/files/3fa2d32b-4ff8.png' });
    expect(res.status).toBe(200);
    expect(update.mock.calls[0][0].data.avatarUrl).toBe('/api/files/3fa2d32b-4ff8.png');
  });

  it('accepts a full image URL', async () => {
    const res = await patch({ name: 'Omar', avatarUrl: 'https://cdn.example.com/a.jpg' });
    expect(res.status).toBe(200);
  });

  it('rejects anything else', async () => {
    for (const avatarUrl of ['/etc/passwd', 'javascript:alert(1)', '/api/files/../x']) {
      const res = await patch({ name: 'Omar', avatarUrl });
      expect(res.status).toBe(400);
    }
    expect(update).not.toHaveBeenCalled();
  });
});
