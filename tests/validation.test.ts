/**
 * @jest-environment node
 *
 * Schema-by-schema unit tests for `src/lib/validation.ts`. These are the
 * single trust boundary between user-supplied JSON and our server actions
 * / API routes — every payload that hits the database is validated by
 * something in this file. We focus on:
 *
 *   1. Each schema's required-field surface (what does it *reject*?).
 *   2. The defaults & transforms that downstream code silently relies on
 *      (e.g. `paymentMethod` defaults to COD, `link: ''` → undefined).
 *   3. Cross-cutting weird cases: empty arrays, oversized strings, wrong
 *      enum values, weird numerics.
 *
 * Anything we discover here that's *not* covered should grow a test, not
 * a bug ticket.
 */
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createProductSchema,
  productVariantSchema,
  shippingAddressInlineSchema,
  createOrderSchema,
  orderStatusUpdateSchema,
  createReviewSchema,
  cartItemSchema,
  addressSchema,
  createCouponSchema,
  sendNotificationSchema,
  disputeSchema,
  rmaSchema,
  productFilterSchema,
  adminCreateUserSchema,
} from '@/lib/validation';

const VALID_UUID = '11111111-1111-1111-1111-111111111111';
const VALID_UUID_2 = '22222222-2222-2222-2222-222222222222';

describe('registerSchema', () => {
  it('accepts a typical signup payload + defaults role to BUYER', () => {
    const r = registerSchema.parse({
      name: 'Mazen',
      email: 'mazen@example.com',
      password: 'correct horse battery',
    });
    expect(r.role).toBe('BUYER');
  });

  it('lets users opt in to SELLER role at signup', () => {
    const r = registerSchema.parse({
      name: 'Seller One',
      email: 's@example.com',
      password: 'topsecret',
      role: 'SELLER',
    });
    expect(r.role).toBe('SELLER');
  });

  it('rejects ADMIN role on the public signup endpoint', () => {
    const r = registerSchema.safeParse({
      name: 'Sneaky',
      email: 's@example.com',
      password: 'topsecret',
      role: 'ADMIN',
    });
    expect(r.success).toBe(false);
  });

  it('rejects passwords shorter than 8 chars', () => {
    const r = registerSchema.safeParse({
      name: 'Short',
      email: 's@example.com',
      password: '1234567',
    });
    expect(r.success).toBe(false);
  });

  it('rejects malformed emails', () => {
    const r = registerSchema.safeParse({
      name: 'No At',
      email: 'not-an-email',
      password: 'longenough',
    });
    expect(r.success).toBe(false);
  });

  it('rejects names shorter than 2 characters', () => {
    const r = registerSchema.safeParse({
      name: 'A',
      email: 's@example.com',
      password: 'longenough',
    });
    expect(r.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts any non-empty password (no length minimum on login)', () => {
    expect(loginSchema.parse({ email: 'a@b.com', password: 'x' })).toEqual({
      email: 'a@b.com',
      password: 'x',
    });
  });

  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('forgotPasswordSchema / resetPasswordSchema', () => {
  it('forgot only needs an email', () => {
    expect(forgotPasswordSchema.parse({ email: 'a@b.com' }).email).toBe('a@b.com');
  });

  it('reset enforces an 8-char password min and a non-empty token', () => {
    expect(resetPasswordSchema.safeParse({ token: '', password: 'longenough' }).success).toBe(
      false
    );
    expect(resetPasswordSchema.safeParse({ token: 't', password: 'short' }).success).toBe(false);
    expect(resetPasswordSchema.parse({ token: 't', password: 'longenough' })).toEqual({
      token: 't',
      password: 'longenough',
    });
  });
});

describe('createProductSchema', () => {
  const valid = {
    title: 'Cotton T-Shirt',
    slug: 'cotton-tshirt',
    description: 'A nice premium cotton t-shirt',
    basePrice: 199.99,
    categoryId: VALID_UUID,
  };

  it('accepts a minimal payload and applies defaults', () => {
    const p = createProductSchema.parse(valid);
    expect(p.condition).toBe('NEW');
    expect(p.isFeatured).toBe(false);
    expect(p.published).toBe(true);
  });

  it('rejects negative or zero prices', () => {
    expect(createProductSchema.safeParse({ ...valid, basePrice: 0 }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...valid, basePrice: -10 }).success).toBe(false);
  });

  it('rejects too-short description', () => {
    expect(createProductSchema.safeParse({ ...valid, description: 'short' }).success).toBe(false);
  });

  it('rejects non-UUID categoryId', () => {
    expect(createProductSchema.safeParse({ ...valid, categoryId: 'cat-1' }).success).toBe(false);
  });

  it('accepts optional flash-sale fields', () => {
    const p = createProductSchema.parse({
      ...valid,
      flashSalePrice: 99.99,
      flashSaleEndsAt: new Date(Date.now() + 86400000).toISOString(),
      flashSaleLimit: 100,
    });
    expect(p.flashSalePrice).toBe(99.99);
    expect(p.flashSaleLimit).toBe(100);
  });
});

describe('productVariantSchema — UPC handling', () => {
  it('accepts 8/12/13/14 digit UPCs', () => {
    for (const upc of ['12345670', '123456789012', '1234567890123', '12345678901234']) {
      expect(
        productVariantSchema.safeParse({
          title: 'Default',
          price: 100,
          stock: 5,
          upc,
        }).success
      ).toBe(true);
    }
  });

  it('rejects non-numeric UPCs', () => {
    expect(
      productVariantSchema.safeParse({
        title: 'Default',
        price: 100,
        stock: 5,
        upc: 'ABCD1234',
      }).success
    ).toBe(false);
  });

  it('accepts an empty-string UPC (the seller chose not to set one)', () => {
    expect(
      productVariantSchema.safeParse({
        title: 'Default',
        price: 100,
        stock: 5,
        upc: '',
      }).success
    ).toBe(true);
  });

  it('rejects negative stock', () => {
    expect(
      productVariantSchema.safeParse({
        title: 'Default',
        price: 100,
        stock: -1,
      }).success
    ).toBe(false);
  });
});

describe('createOrderSchema', () => {
  const inline = {
    fullName: 'Jane Doe',
    phone: '01234567890',
    street: '12 El Nasr St',
    city: 'New Cairo',
    governorate: 'Cairo',
  };

  it('defaults paymentMethod to CASH_ON_DELIVERY', () => {
    const o = createOrderSchema.parse({
      shippingAddress: inline,
      items: [{ variantId: VALID_UUID, quantity: 1 }],
    });
    expect(o.paymentMethod).toBe('CASH_ON_DELIVERY');
  });

  it('rejects an empty items array', () => {
    expect(
      createOrderSchema.safeParse({
        shippingAddress: inline,
        items: [],
      }).success
    ).toBe(false);
  });

  it('rejects negative or zero quantities', () => {
    expect(
      createOrderSchema.safeParse({
        shippingAddress: inline,
        items: [{ variantId: VALID_UUID, quantity: 0 }],
      }).success
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({
        shippingAddress: inline,
        items: [{ variantId: VALID_UUID, quantity: -3 }],
      }).success
    ).toBe(false);
  });

  it('rejects unsupported payment methods', () => {
    expect(
      createOrderSchema.safeParse({
        shippingAddress: inline,
        items: [{ variantId: VALID_UUID, quantity: 1 }],
        paymentMethod: 'BITCOIN',
      }).success
    ).toBe(false);
  });

  it('accepts addressId-only payloads (no inline shippingAddress needed)', () => {
    const o = createOrderSchema.parse({
      addressId: VALID_UUID,
      items: [{ variantId: VALID_UUID_2, quantity: 1 }],
    });
    expect(o.addressId).toBe(VALID_UUID);
  });

  it('caps order notes at 500 chars', () => {
    expect(
      createOrderSchema.safeParse({
        shippingAddress: inline,
        items: [{ variantId: VALID_UUID, quantity: 1 }],
        orderNotes: 'x'.repeat(501),
      }).success
    ).toBe(false);
  });
});

describe('shippingAddressInlineSchema', () => {
  it('defaults country to Egypt', () => {
    const a = shippingAddressInlineSchema.parse({
      fullName: 'Jane Doe',
      phone: '01234567890',
      street: '12 Tahrir',
      city: 'Cairo',
      governorate: 'Cairo',
    });
    expect(a.country).toBe('Egypt');
  });

  it('rejects 1-character street values', () => {
    expect(
      shippingAddressInlineSchema.safeParse({
        fullName: 'Jane',
        phone: '012345',
        street: 'A',
        city: 'Cairo',
        governorate: 'Cairo',
      }).success
    ).toBe(false);
  });
});

describe('orderStatusUpdateSchema', () => {
  it('accepts each terminal status the API layer handles', () => {
    for (const status of [
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'RETURNED',
    ] as const) {
      expect(orderStatusUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects PENDING_PAYMENT (that is set on order creation, not via this update path)', () => {
    expect(orderStatusUpdateSchema.safeParse({ status: 'PENDING_PAYMENT' }).success).toBe(false);
  });
});

describe('createReviewSchema', () => {
  it('clamps rating between 1 and 5', () => {
    expect(
      createReviewSchema.safeParse({ productId: VALID_UUID, orderItemId: VALID_UUID, rating: 0 })
        .success
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({ productId: VALID_UUID, orderItemId: VALID_UUID, rating: 6 })
        .success
    ).toBe(false);
    expect(
      createReviewSchema.parse({ productId: VALID_UUID, orderItemId: VALID_UUID, rating: 5 }).rating
    ).toBe(5);
  });

  it('rejects integer-shaped floats (rating must be int)', () => {
    expect(
      createReviewSchema.safeParse({ productId: VALID_UUID, orderItemId: VALID_UUID, rating: 4.5 })
        .success
    ).toBe(false);
  });

  it('caps comment length at 2000 characters', () => {
    expect(
      createReviewSchema.safeParse({
        productId: VALID_UUID,
        orderItemId: VALID_UUID,
        rating: 5,
        comment: 'x'.repeat(2001),
      }).success
    ).toBe(false);
  });
});

describe('cartItemSchema', () => {
  it('accepts a positive integer quantity', () => {
    expect(cartItemSchema.parse({ variantId: VALID_UUID, quantity: 3 }).quantity).toBe(3);
  });

  it('rejects non-integer quantity', () => {
    expect(cartItemSchema.safeParse({ variantId: VALID_UUID, quantity: 1.5 }).success).toBe(false);
  });

  it('rejects non-UUID variantIds', () => {
    expect(cartItemSchema.safeParse({ variantId: 'not-uuid', quantity: 1 }).success).toBe(false);
  });
});

describe('addressSchema', () => {
  it('defaults country=Egypt and isDefault=false', () => {
    const a = addressSchema.parse({
      street: '12 Tahrir Street',
      city: 'Cairo',
      governorate: 'Cairo',
    });
    expect(a.country).toBe('Egypt');
    expect(a.isDefault).toBe(false);
  });

  it('rejects 4-character streets (need ≥5)', () => {
    expect(
      addressSchema.safeParse({
        street: 'abcd',
        city: 'Cairo',
        governorate: 'Cairo',
      }).success
    ).toBe(false);
  });
});

describe('createCouponSchema', () => {
  const base = {
    code: 'SAVE10',
    discountType: 'PERCENTAGE' as const,
    discountValue: 10,
    expiryDate: new Date(Date.now() + 86400000).toISOString(),
  };

  it('defaults isActive=true', () => {
    expect(createCouponSchema.parse(base).isActive).toBe(true);
  });

  it('rejects negative discountValue', () => {
    expect(createCouponSchema.safeParse({ ...base, discountValue: -5 }).success).toBe(false);
  });

  it('rejects unknown discountType', () => {
    expect(
      createCouponSchema.safeParse({ ...base, discountType: 'BUY_ONE_GET_ONE' as any }).success
    ).toBe(false);
  });

  it('rejects expiryDate that is not a valid ISO datetime', () => {
    expect(createCouponSchema.safeParse({ ...base, expiryDate: '2025-13-99' }).success).toBe(false);
  });
});

describe('sendNotificationSchema — link transform', () => {
  it('coerces empty-string link to undefined', () => {
    const n = sendNotificationSchema.parse({
      title: 'Hi',
      message: 'There',
      link: '',
    });
    expect(n.link).toBeUndefined();
  });

  it('accepts absolute https URLs', () => {
    const n = sendNotificationSchema.parse({
      title: 'Hi',
      message: 'There',
      link: 'https://example.com/products/foo',
    });
    expect(n.link).toBe('https://example.com/products/foo');
  });

  it('accepts root-relative paths', () => {
    const n = sendNotificationSchema.parse({
      title: 'Hi',
      message: 'There',
      link: '/products/foo',
    });
    expect(n.link).toBe('/products/foo');
  });

  it('rejects schemeless absolute paths', () => {
    expect(
      sendNotificationSchema.safeParse({
        title: 'Hi',
        message: 'There',
        link: 'example.com/foo',
      }).success
    ).toBe(false);
  });

  it('rejects javascript: URLs (XSS surface)', () => {
    expect(
      sendNotificationSchema.safeParse({
        title: 'Hi',
        message: 'There',

        link: 'javascript:alert(1)',
      }).success
    ).toBe(false);
  });
});

describe('disputeSchema / rmaSchema', () => {
  it('require ≥10-character reasons', () => {
    expect(disputeSchema.safeParse({ orderId: VALID_UUID, reason: 'short' }).success).toBe(false);
    expect(rmaSchema.safeParse({ orderItemId: VALID_UUID, reason: 'short' }).success).toBe(false);
  });

  it('accept the happy path', () => {
    expect(
      disputeSchema.parse({
        orderId: VALID_UUID,
        reason: 'Delivered item is broken on arrival',
      }).reason
    ).toContain('broken');
  });
});

describe('productFilterSchema — query-string coercion', () => {
  it('coerces page/limit/minPrice from strings', () => {
    const f = productFilterSchema.parse({
      page: '3',
      limit: '50',
      minPrice: '100',
      maxPrice: '500',
      rating: '4',
      inStock: 'true',
    });
    expect(f.page).toBe(3);
    expect(f.limit).toBe(50);
    expect(f.minPrice).toBe(100);
    expect(f.rating).toBe(4);
    expect(f.inStock).toBe(true);
  });

  it('caps limit at 100 to prevent abusive queries', () => {
    expect(productFilterSchema.safeParse({ limit: '500' }).success).toBe(false);
  });

  it('defaults to page=1, limit=20', () => {
    const f = productFilterSchema.parse({});
    expect(f.page).toBe(1);
    expect(f.limit).toBe(20);
  });

  it('rejects unknown sort values', () => {
    expect(productFilterSchema.safeParse({ sort: 'random' }).success).toBe(false);
  });
});

describe('adminCreateUserSchema', () => {
  it('allows ADMIN role here (the public registerSchema does not)', () => {
    expect(
      adminCreateUserSchema.parse({
        name: 'New Admin',
        email: 'a@a.com',
        password: 'secret123',
        role: 'ADMIN',
      }).role
    ).toBe('ADMIN');
  });

  it('rejects 5-char passwords (admin-side min is 6)', () => {
    expect(
      adminCreateUserSchema.safeParse({
        name: 'New',
        email: 'a@a.com',
        password: 'short',
        role: 'BUYER',
      }).success
    ).toBe(false);
  });
});
