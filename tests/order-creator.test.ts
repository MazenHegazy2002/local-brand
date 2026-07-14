/**
 * @jest-environment node
 *
 * Smoke tests for `createOrderForUser` — the canonical order-creation
 * helper used by both the user-facing `createOrder` action and the
 * server-to-server payment finalize paths (PaySky callback / Stripe
 * webhook). The focus here is on the input-validation + early-rejection
 * paths that don't depend on a real DB; the full transactional path is
 * exercised by integration tests in CI against a live Postgres.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { createOrderForUser } from '@/lib/order-creator';

type MockFn = jest.Mock<any>;

const mocked = prisma as unknown as {
  productVariant: { findUnique: MockFn };
  address: { findUnique: MockFn };
  coupon: { findUnique: MockFn; update: MockFn };
  $transaction: MockFn;
  order: { create: MockFn; findUnique: MockFn };
  user: { findUnique: MockFn };
};

const VALID_VARIANT_ID = '11111111-1111-1111-1111-111111111111';
const VALID_VARIANT_ID_2 = '22222222-2222-2222-2222-222222222222';

const baseInlineAddress = {
  fullName: 'Ahmed Mohamed',
  phone: '01234567890',
  street: '12 El Nasr St',
  city: 'New Cairo',
  governorate: 'Cairo',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createOrderForUser — input validation', () => {
  it('rejects an empty items array', async () => {
    const result = await createOrderForUser('user-1', {
      items: [],
      shippingAddress: baseInlineAddress,
      paymentMethod: 'CASH_ON_DELIVERY',
    });

    expect(result.error).toBeDefined();
    expect(result.success).toBeUndefined();
  });

  it('rejects when neither userId nor guestEmail is supplied', async () => {
    const result = await createOrderForUser(null, {
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
      shippingAddress: baseInlineAddress,
      paymentMethod: 'CASH_ON_DELIVERY',
    });

    expect(result.error).toMatch(/Unauthorized|guest email/i);
  });

  it('accepts guest checkout with a valid email + inline address', async () => {
    mocked.productVariant.findUnique.mockResolvedValue({
      id: VALID_VARIANT_ID,
      stockCount: 5,
      price: 100,
      product: {
        title: 'T-Shirt',
        basePrice: 100,
        published: true,
        deletedAt: null,
        flashSalePrice: null,
        flashSaleEndsAt: null,
        seller: { storeName: 'Demo Store' },
      },
    });
    // $transaction is mocked in tests/setup.ts to invoke the callback with
    // a stub tx object — provide minimal stubs for what the helper uses.
    const txOrderCreate = jest.fn<any>().mockResolvedValue({ id: 'order-1' });
    const txVariantUpdateMany = jest.fn<any>().mockResolvedValue({ count: 1 });
    mocked.$transaction.mockImplementation((fn: any) =>
      fn({
        productVariant: { updateMany: txVariantUpdateMany },
        order: { create: txOrderCreate },
        coupon: { update: jest.fn<any>() },
      })
    );
    mocked.order.findUnique.mockResolvedValue(null);

    const result = await createOrderForUser(null, {
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
      shippingAddress: baseInlineAddress,
      paymentMethod: 'CASH_ON_DELIVERY',
      guestEmail: 'guest@example.com',
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBe('order-1');
    // Stock decrement was attempted with the right quantity guard.
    expect(txVariantUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: VALID_VARIANT_ID,
          stockCount: { gte: 1 },
        }),
        data: expect.objectContaining({ stockCount: { decrement: 1 } }),
      })
    );
    // Order.create stamps the inline address (with guest email tucked in).
    const createPayload = (txOrderCreate.mock.calls[0][0] as any).data;
    const snapshot = JSON.parse(createPayload.shippingAddressSnapshot);
    expect(snapshot.email).toBe('guest@example.com');
    expect(snapshot.governorate).toBe('Cairo');
    expect(createPayload.userId).toBeNull();
    expect(createPayload.guestEmail).toBe('guest@example.com');
  });
});

describe('createOrderForUser — stock + variant resolution', () => {
  it('rejects with a friendly message when a variant has been deleted', async () => {
    mocked.productVariant.findUnique.mockResolvedValue(null);

    const result = await createOrderForUser('user-1', {
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
      shippingAddress: baseInlineAddress,
      paymentMethod: 'CASH_ON_DELIVERY',
    });

    expect(result.error).toMatch(/no longer available|refresh your cart/i);
  });

  it('rejects when stockCount < requested quantity', async () => {
    mocked.productVariant.findUnique.mockResolvedValue({
      id: VALID_VARIANT_ID,
      stockCount: 1,
      price: 100,
      product: {
        title: 'Out-of-stock Item',
        basePrice: 100,
        published: true,
        deletedAt: null,
        flashSalePrice: null,
        flashSaleEndsAt: null,
        seller: { storeName: 'Demo Store' },
      },
    });

    const result = await createOrderForUser('user-1', {
      items: [{ variantId: VALID_VARIANT_ID, quantity: 5 }],
      shippingAddress: baseInlineAddress,
      paymentMethod: 'CASH_ON_DELIVERY',
    });

    expect(result.error).toMatch(/out of stock/i);
    expect(result.error).toContain('Out-of-stock Item');
  });

  it('aggregates pricing across multiple line items in the address fee path', async () => {
    mocked.productVariant.findUnique
      .mockResolvedValueOnce({
        id: VALID_VARIANT_ID,
        stockCount: 10,
        price: 100,
        product: {
          title: 'A',
          basePrice: 100,
          published: true,
          deletedAt: null,
          flashSalePrice: null,
          flashSaleEndsAt: null,
          seller: { storeName: 'S' },
        },
      })
      .mockResolvedValueOnce({
        id: VALID_VARIANT_ID_2,
        stockCount: 10,
        price: 200,
        product: {
          title: 'B',
          basePrice: 200,
          published: true,
          deletedAt: null,
          flashSalePrice: null,
          flashSaleEndsAt: null,
          seller: { storeName: 'S' },
        },
      });

    const txOrderCreate = jest.fn<any>().mockResolvedValue({ id: 'order-2' });
    mocked.$transaction.mockImplementation((fn: any) =>
      typeof fn === 'function'
        ? fn({
            productVariant: { updateMany: jest.fn<any>().mockResolvedValue({ count: 1 }) },
            order: { create: txOrderCreate },
            coupon: { update: jest.fn<any>() },
          })
        : Promise.all(fn)
    );

    const result = await createOrderForUser('user-1', {
      items: [
        { variantId: VALID_VARIANT_ID, quantity: 2 },
        { variantId: VALID_VARIANT_ID_2, quantity: 1 },
      ],
      shippingAddress: baseInlineAddress,
      paymentMethod: 'CASH_ON_DELIVERY',
    });

    expect(result.success).toBe(true);
    const createPayload = (txOrderCreate.mock.calls[0][0] as any).data;
    // Subtotal 100*2 + 200*1 = 400, +14% VAT = 456, +Cairo shipping 40 = 496
    expect(createPayload.totalAmount).toBeCloseTo(496);
    expect(createPayload.shippingFee).toBe(40);
    expect(createPayload.discountAmount).toBe(0);
    expect(createPayload.items.create.length).toBe(2);
  });
});

describe('createOrderForUser — coupon application', () => {
  it('applies a percentage coupon respecting maxDiscount', async () => {
    mocked.productVariant.findUnique.mockResolvedValue({
      id: VALID_VARIANT_ID,
      stockCount: 5,
      price: 1000,
      product: {
        title: 'X',
        basePrice: 1000,
        published: true,
        deletedAt: null,
        flashSalePrice: null,
        flashSaleEndsAt: null,
        seller: { storeName: 'S' },
      },
    });
    mocked.coupon.findUnique.mockResolvedValue({
      id: 'coupon-1',
      isActive: true,
      expiryDate: new Date(Date.now() + 86400000),
      discountType: 'PERCENTAGE',
      discountValue: 50, // 50% off
      maxDiscount: 200, // capped at 200 EGP
      minOrderValue: null,
      usageLimit: null,
      usedCount: 0,
    });
    const txOrderCreate = jest.fn<any>().mockResolvedValue({ id: 'order-3' });
    const couponUpdateMany = jest.fn<any>().mockResolvedValue({ count: 1 });
    mocked.$transaction.mockImplementation((fn: any) =>
      typeof fn === 'function'
        ? fn({
            productVariant: { updateMany: jest.fn<any>().mockResolvedValue({ count: 1 }) },
            order: { create: txOrderCreate },
            coupon: { updateMany: couponUpdateMany },
          })
        : Promise.all(fn)
    );

    const result = await createOrderForUser('user-1', {
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
      shippingAddress: baseInlineAddress,
      paymentMethod: 'CASH_ON_DELIVERY',
      couponCode: 'HALFOFF',
    });

    expect(result.success).toBe(true);
    const payload = (txOrderCreate.mock.calls[0][0] as any).data;
    // 50% of 1000 = 500, capped at maxDiscount=200
    expect(payload.discountAmount).toBe(200);
    // (1000 - 200) * 1.14 + 40 shipping = 952
    expect(payload.totalAmount).toBeCloseTo(952);
    expect(payload.couponId).toBe('coupon-1');
    expect(couponUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'coupon-1' },
        data: { usedCount: { increment: 1 } },
      })
    );
  });

  it('ignores expired coupons silently', async () => {
    mocked.productVariant.findUnique.mockResolvedValue({
      id: VALID_VARIANT_ID,
      stockCount: 5,
      price: 100,
      product: {
        title: 'X',
        basePrice: 100,
        published: true,
        deletedAt: null,
        flashSalePrice: null,
        flashSaleEndsAt: null,
        seller: { storeName: 'S' },
      },
    });
    mocked.coupon.findUnique.mockResolvedValue({
      id: 'expired',
      isActive: true,
      expiryDate: new Date(Date.now() - 86400000), // yesterday
      discountType: 'FIXED',
      discountValue: 50,
    });
    const txOrderCreate = jest.fn<any>().mockResolvedValue({ id: 'order-4' });
    mocked.$transaction.mockImplementation((fn: any) =>
      typeof fn === 'function'
        ? fn({
            productVariant: { updateMany: jest.fn<any>().mockResolvedValue({ count: 1 }) },
            order: { create: txOrderCreate },
            coupon: { update: jest.fn<any>() },
          })
        : Promise.all(fn)
    );

    const result = await createOrderForUser('user-1', {
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
      shippingAddress: baseInlineAddress,
      paymentMethod: 'CASH_ON_DELIVERY',
      couponCode: 'EXPIRED',
    });

    expect(result.success).toBe(true);
    expect((txOrderCreate.mock.calls[0][0] as any).data.discountAmount).toBe(0);
    expect((txOrderCreate.mock.calls[0][0] as any).data.couponId).toBeNull();
  });
});

describe('createOrderForUser — concurrency / stock race', () => {
  it('aborts cleanly when the atomic stock decrement returns 0 rows', async () => {
    mocked.productVariant.findUnique.mockResolvedValue({
      id: VALID_VARIANT_ID,
      stockCount: 5,
      price: 100,
      product: {
        title: 'Y',
        basePrice: 100,
        published: true,
        deletedAt: null,
        flashSalePrice: null,
        flashSaleEndsAt: null,
        seller: { storeName: 'S' },
      },
    });
    mocked.$transaction.mockImplementation((fn: any) =>
      typeof fn === 'function'
        ? fn({
            productVariant: {
              // Simulate someone else having taken the last unit between our
              // findUnique and our updateMany.
              updateMany: jest.fn<any>().mockResolvedValue({ count: 0 }),
            },
            order: { create: jest.fn<any>() },
            coupon: { update: jest.fn<any>() },
          })
        : Promise.all(fn)
    );

    const result = await createOrderForUser('user-1', {
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
      shippingAddress: baseInlineAddress,
      paymentMethod: 'CASH_ON_DELIVERY',
    });

    expect(result.error).toMatch(/Stock error/i);
    expect(result.success).toBeUndefined();
  });
});

describe('createOrderForUser — selected size and color snapshots', () => {
  it('saves selectedSize and selectedColor to OrderItem data', async () => {
    mocked.productVariant.findUnique.mockResolvedValue({
      id: VALID_VARIANT_ID,
      stockCount: 5,
      price: 100,
      product: {
        title: 'T-Shirt',
        basePrice: 100,
        published: true,
        deletedAt: null,
        flashSalePrice: null,
        flashSaleEndsAt: null,
        seller: { storeName: 'Demo Store' },
      },
    });

    const txOrderCreate = jest.fn<any>().mockResolvedValue({ id: 'order-1' });
    mocked.$transaction.mockImplementation((fn: any) =>
      fn({
        productVariant: { updateMany: jest.fn<any>().mockResolvedValue({ count: 1 }) },
        order: { create: txOrderCreate },
        coupon: { update: jest.fn<any>() },
      })
    );

    const result = await createOrderForUser('user-1', {
      items: [
        {
          variantId: VALID_VARIANT_ID,
          quantity: 1,
          selectedSize: 'L',
          selectedColor: 'Red',
        },
      ],
      shippingAddress: baseInlineAddress,
      paymentMethod: 'CASH_ON_DELIVERY',
    });

    expect(result.success).toBe(true);
    expect(txOrderCreate).toHaveBeenCalled();
    const createData = txOrderCreate.mock.calls[0][0] as any;
    expect(createData.data.items.create[0]).toEqual({
      variantId: VALID_VARIANT_ID,
      productTitleSnapshot: 'T-Shirt',
      sellerNameSnapshot: 'Demo Store',
      priceAtPurchase: 100,
      quantity: 1,
      status: 'PENDING',
      selectedSize: 'L',
      selectedColor: 'Red',
    });
  });
});
