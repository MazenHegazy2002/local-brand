import { z } from 'zod';

// ============================================
// AUTH SCHEMAS
// ============================================

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
  role: z.enum(['BUYER', 'SELLER']).optional().default('BUYER'),
  phone: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const createProductSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  titleAr: z
    .string()
    .max(200, 'Arabic title must be less than 200 characters')
    .optional()
    .nullable(),
  slug: z.string().min(3).max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  descriptionAr: z.string().optional().nullable(),
  basePrice: z.number().positive('Price must be positive'),
  categoryId: z.string().uuid('Invalid category ID'),
  condition: z.string().optional().default('NEW'),
  weightGrams: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional().default(false),
  published: z.boolean().optional().default(true),
  flashSalePrice: z.number().positive().optional(),
  flashSaleEndsAt: z.string().datetime().optional(),
  flashSaleLimit: z.number().int().positive().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const bulkProductSchema = z.object({
  products: z.array(createProductSchema),
});

export const productVariantSchema = z.object({
  // SKU is auto-generated from the product slug when blank, so it's
  // optional from the seller's perspective.
  sku: z.string().min(1).max(64).optional(),
  // UPC / EAN / GTIN. Numeric-only check is intentionally loose — we
  // accept 8/12/13/14 digit codes (UPC-E / UPC-A / EAN-13 / GTIN-14).
  upc: z
    .string()
    .regex(/^\d{8,14}$/, 'UPC must be 8-14 digits')
    .optional()
    .or(z.literal('')),
  title: z.string().min(1).max(100),
  titleAr: z.string().max(100).optional().nullable(),
  attributes: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  image: z.string().url().optional(),
});

export const productImageSchema = z.object({
  url: z.string().url(),
  isPrimary: z.boolean().default(false),
});

// ============================================
// ORDER SCHEMAS
// ============================================

export const shippingAddressInlineSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().min(6).max(40),
  street: z.string().min(2).max(300),
  city: z.string().min(2).max(120),
  governorate: z.string().min(2).max(120),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(80).optional().default('Egypt'),
});

export const createOrderSchema = z.object({
  addressId: z.string().uuid().optional(),
  guestEmail: z.string().email().optional(),
  // For users that don't have a saved address yet, allow passing the
  // shipping address inline. The action will persist it as a snapshot.
  shippingAddress: shippingAddressInlineSchema.optional(),
  couponCode: z.string().optional(),
  promoCode: z.string().optional(),
  paymentMethod: z
    .enum(['CASH_ON_DELIVERY', 'CREDIT_CARD', 'MOBILE_WALLET', 'PAYMOB', 'FAWRY', 'PAYSKY'])
    .default('CASH_ON_DELIVERY'),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().positive('Quantity must be a positive integer'),
        selectedSize: z.string().optional(),
        selectedColor: z.string().optional(),
      })
    )
    .min(1, 'At least one item is required'),
  orderNotes: z.string().max(500).optional(),
  giftWrapping: z.boolean().optional(),
  // Allow caller to inform the action that points were redeemed (so we can
  // attach this metadata to the order for refunds on cancellation).
  pointsRedeemed: z.number().int().min(0).optional(),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']),
  trackingNumber: z.string().optional(),
  courier: z.string().optional(),
});

export const orderItemStatusUpdateSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'SHIPPED',
    'DELIVERED',
    'RETURN_REQUESTED',
    'RETURNED',
    'REFUNDED',
    'CANCELLED',
  ]),
});

// ============================================
// REVIEW SCHEMAS
// ============================================

export const createReviewSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  orderItemId: z.string().uuid('Invalid order item ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(2000, 'Comment must be less than 2000 characters').optional(),
});

// ============================================
// CART SCHEMAS
// ============================================

export const cartItemSchema = z.object({
  variantId: z.string().uuid('Invalid variant ID'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
});

// ============================================
// ADDRESS SCHEMAS
// ============================================

export const addressSchema = z.object({
  street: z
    .string()
    .min(5, 'Street must be at least 5 characters')
    .max(200, 'Street must be less than 200 characters'),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters'),
  governorate: z
    .string()
    .min(2, 'Governorate must be at least 2 characters')
    .max(100, 'Governorate must be less than 100 characters'),
  postalCode: z.string().max(20).optional(),
  country: z.string().default('Egypt'),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = addressSchema.partial();

// ============================================
// COUPON SCHEMAS
// ============================================

export const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive(),
  minOrderValue: z.number().min(0).optional(),
  maxDiscount: z.number().positive().optional(),
  expiryDate: z.string().datetime(),
  usageLimit: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

export const couponEvaluateSchema = z.object({
  code: z.string().min(1),
  orderValue: z.number().min(0),
  items: z
    .array(
      z.object({
        variantId: z.string(),
        price: z.number(),
        quantity: z.number(),
      })
    )
    .optional(),
});

// ============================================
// NOTIFICATION SCHEMAS
// ============================================

// `z.string().url()` accepts ANY syntactically valid URL, including
// `javascript:`, `data:`, `vbscript:`, `file:`. Since we render this href in
// notification UI it would be a clickjacking / XSS surface — restrict to
// http(s) only via a stricter regex (still using `url()` to do the syntactic
// validation).
const httpUrlSchema = z
  .string()
  .url()
  .refine(v => /^https?:\/\//i.test(v), {
    message: 'Link must be an http(s) URL or a /-relative path',
  });

export const sendNotificationSchema = z.object({
  userId: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  // A link is either an absolute http(s) URL or a relative path starting with `/`.
  // Empty strings are coerced to undefined so we never store an empty href.
  link: z
    .union([
      httpUrlSchema,
      z.string().regex(/^\/[\w\-./?=&%#]*$/, 'Link must be an absolute URL or a /-relative path'),
      z.literal(''),
    ])
    .optional()
    .transform(v => (v === '' || v === undefined ? undefined : v)),
  targetAudience: z.enum(['all', 'sellers', 'buyers']).optional(),
});

// ============================================
// CHAT SCHEMAS
// ============================================

export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(2000, 'Message must be less than 2000 characters'),
  productId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
});

// ============================================
// DISPUTE SCHEMAS
// ============================================

export const disputeSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  orderItemId: z.string().uuid('Invalid order item ID').optional(),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must be less than 1000 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
});

// ============================================
// RMA (RETURN) SCHEMAS
// ============================================

export const rmaSchema = z.object({
  orderItemId: z.string().uuid('Invalid order item ID'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must be less than 1000 characters'),
  details: z.string().max(2000, 'Details must be less than 2000 characters').optional(),
});

export const rmaUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'COMPLETED']),
  adminNotes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

// ============================================
// SHIPPING SCHEMAS
// ============================================

export const shippingCalculateSchema = z.object({
  governorate: z.string().min(1, 'Governorate is required'),
  weightGrams: z.number().min(0).optional(),
  items: z
    .array(
      z.object({
        quantity: z.number().int().positive(),
        weightGrams: z.number(),
      })
    )
    .optional(),
});

// ============================================
// FILTER SCHEMAS
// ============================================

export const productFilterSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'rating', 'popular']).optional(),
  rating: z.coerce.number().optional(),
  tags: z.string().optional(),
  condition: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  flashSale: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// UPLOAD SCHEMAS
// ============================================

export const uploadSchema = z.object({
  folder: z.string().optional(),
});

// ============================================
// SELLER SCHEMAS
// ============================================

export const createSellerProfileSchema = z.object({
  storeName: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  city: z.string().max(100).optional(),
  governorate: z.string().max(100).optional(),
});

export const updateSellerProfileSchema = createSellerProfileSchema.partial();

// ============================================
// ADMIN SCHEMAS
// ============================================

export const adminCreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['ADMIN', 'SELLER', 'BUYER']),
  storeName: z.string().max(100).optional(),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'SELLER', 'BUYER']).optional(),
});

// ============================================
// TAXONOMY SCHEMAS
// ============================================

export const createTaxonomySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
});

export const updateTaxonomySchema = createTaxonomySchema.partial();

// ============================================
// TYPE EXPORTS
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CartItemInput = z.infer<typeof cartItemSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type CouponEvaluateInput = z.infer<typeof couponEvaluateSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type DisputeInput = z.infer<typeof disputeSchema>;
export type RMAInput = z.infer<typeof rmaSchema>;
export type RMAUpdateInput = z.infer<typeof rmaUpdateSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
