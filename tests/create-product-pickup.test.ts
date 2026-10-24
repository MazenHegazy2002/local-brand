/**
 * @jest-environment node
 *
 * createProductForSeller: a new product only goes live when the seller has a pickup
 * address — the same rule as toggling a product live (toggleProductPublishedCore).
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

type Seller = Record<string, unknown>;
let seller: Seller;
const create = jest.fn<Promise<Record<string, unknown>>, [{ data: Record<string, unknown> }]>();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(async () => ({ emailVerified: new Date(), phone: null })) },
    sellerProfile: { findUnique: jest.fn(async () => seller) },
    product: {
      findUnique: jest.fn(async () => null),
      create: (a: { data: Record<string, unknown> }) => create(a),
    },
    productVariant: { findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null) },
  },
}));
jest.mock('@/lib/admin-registration-alerts', () => ({ notifyAdminEvent: jest.fn() }));
jest.mock('@/lib/cache', () => ({ invalidateCache: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));

import { createProductForSeller } from '@/lib/seller-core';

const product = {
  title: 'Linen Scarf',
  basePrice: 250,
  weightKg: 0.3,
  mainImage: 'https://cdn.example.com/scarf.jpg',
  variants: [{ color: 'Beige', stock: 3 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  create.mockImplementation(async ({ data }) => ({ id: 'p1', ...data }));
  seller = {
    id: 's1',
    status: 'ACTIVE',
    storeName: 'Test Store',
    governorate: 'Cairo',
    city: 'Nasr City',
    pickupStreet: '12 Test Street',
    pickupPhone: '01000000000',
  };
});

describe('createProductForSeller pickup address', () => {
  it('publishes when the pickup address is complete', async () => {
    const res = await createProductForSeller('u1', product as never);
    if (res.error) throw new Error(res.error);
    expect(res.published).toBe(true);
    expect(create.mock.calls[0][0].data.published).toBe(true);
  });

  it('saves a draft and says why when the pickup address is missing', async () => {
    seller.pickupStreet = null;
    const res = await createProductForSeller('u1', product as never);
    if (res.error) throw new Error(res.error);
    expect(res.published).toBe(false);
    expect(res.publishBlockedReason).toMatch(/pickup warehouse address/);
    expect(create.mock.calls[0][0].data.published).toBe(false);
  });
});
