/**
 * @jest-environment node
 *
 * GET /api/reviews — shoppers only see PUBLISHED reviews; hidden or rejected ones
 * (moderated in Admin OS) don't show or count towards the average.
 */

import { describe, it, expect } from '@jest/globals';

const findMany = jest.fn<Promise<{ rating: number }[]>, [{ where: Record<string, unknown> }]>(
  async () => [{ rating: 4 }]
);
const count = jest.fn<Promise<number>, [{ where: Record<string, unknown> }]>(async () => 1);
jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findMany: (a: { where: Record<string, unknown> }) => findMany(a),
      count: (a: { where: Record<string, unknown> }) => count(a),
    },
  },
}));
jest.mock('@/lib/mobile-auth', () => ({ getRequestSession: jest.fn() }));
jest.mock('@/lib/admin-registration-alerts', () => ({ notifyAdminEvent: jest.fn() }));

import { GET } from '@/app/api/reviews/route';

describe('GET /api/reviews', () => {
  it('only reads published reviews for the list, the count and the average', async () => {
    const res = await GET(new Request('https://brandyy.shop/api/reviews?productId=p1'));
    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledTimes(2);
    for (const [args] of findMany.mock.calls) {
      expect(args.where).toEqual({ productId: 'p1', status: 'PUBLISHED' });
    }
    expect(count.mock.calls[0][0].where).toEqual({ productId: 'p1', status: 'PUBLISHED' });
  });
});
