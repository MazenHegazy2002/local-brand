// ============================================
// USER TYPES
// ============================================

export type Role = 'BUYER' | 'SELLER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  phone: string | null;
  avatarUrl: string | null;
  defaultAddressId: string | null;
  loyaltyPoints: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  emailVerified: Date | null;
  orders?: Order[];
  addresses?: Address[];
  reviews?: Review[];
  wishlist?: WishlistItem[];
  cart?: CartItem[];
  sellerProfile?: SellerProfile | null;
  passwordResetTokens?: PasswordResetToken[];
  notifications?: Notification[];
  auditLogs?: AuditLog[];
  productQAs?: ProductQA[];
}

export interface PasswordResetToken {
  id: string;
  email: string;
  token: string;
  expires: Date;
  user?: User;
}

// ============================================
// SELLER TYPES
// ============================================

export type SellerStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface SellerProfile {
  id: string;
  userId: string;
  storeName: string;
  description: string | null;
  logoUrl: string | null;
  city: string | null;
  governorate: string | null;
  commissionRate: number;
  status: SellerStatus;
  bankAccount: string | null;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  user?: User;
  products?: Product[];
  payouts?: Payout[];
}

// ============================================
// CATEGORY & PRODUCT TYPES
// ============================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parent?: Category | null;
  children?: Category[];
  products?: Product[];
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  products?: Product[];
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  products?: Product[];
}

export interface Product {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  basePrice: number;
  condition: string;
  isFeatured: boolean;
  weightGrams: number | null;
  published: boolean;
  flashSalePrice: number | null;
  flashSaleEndsAt: Date | null;
  flashSaleLimit: number | null;
  countryOfOrigin: string;
  isVerifiedLocal: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  seller?: SellerProfile;
  category?: Category;
  variants?: ProductVariant[];
  images?: ProductImage[];
  reviews?: Review[];
  wishlistedBy?: WishlistItem[];
  tags?: Tag[];
  collections?: Collection[];
  productQAs?: ProductQA[];
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  isPrimary: boolean;
  product?: Product;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  // Optional Universal Product Code / EAN / GTIN. 8-14 digits, set only
  // when the seller has a real barcode from GS1 / the manufacturer.
  upc?: string | null;
  title: string;
  attributes: string;
  price: number;
  stockCount: number;
  product?: Product;
  cartItems?: CartItem[];
  orderItems?: OrderItem[];
}

// ============================================
// CART TYPES
// ============================================

export interface CartItem {
  id: string;
  userId: string;
  variantId: string;
  quantity: number;
  savedPrice: number;
  addedAt: Date;
  user?: User;
  variant?: ProductVariant;
}

// ============================================
// ORDER TYPES
// ============================================

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';
export type OrderItemStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED'
  | 'CANCELLED';
export type PaymentMethod =
  | 'CREDIT_CARD'
  | 'MOBILE_WALLET'
  | 'CASH_ON_DELIVERY'
  | 'PAYMOB'
  | 'FAWRY'
  | 'PAYSKY';
export type PaymentStatus =
  | 'UNPAID'
  | 'AUTHORIZED'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface Order {
  id: string;
  userId: string | null;
  guestEmail: string | null;
  couponId: string | null;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  platformFee: number;
  sellerPayoutTotal: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  paymentChannel?: string | null;
  paymentNetworkRef?: string | null;
  paymentMaskedPan?: string | null;
  idempotencyKey: string | null;
  payoutProcessedAt?: Date | null;
  orderNotes?: string | null;
  giftWrapping?: boolean;
  shippingAddressSnapshot: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User | null;
  coupon?: Coupon | null;
  items?: OrderItem[];
  shipments?: Shipment[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  productTitleSnapshot: string;
  sellerNameSnapshot: string;
  priceAtPurchase: number;
  quantity: number;
  status: OrderItemStatus;
  order?: Order;
  variant?: ProductVariant;
  returnRequest?: ReturnRequest | null;
}

export interface Shipment {
  id: string;
  orderId: string;
  trackingNumber: string | null;
  courier: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  order?: Order;
}

// ============================================
// COUPON TYPES
// ============================================

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  expiryDate: Date;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  orders?: Order[];
}

// ============================================
// REVIEW TYPES
// ============================================

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string | null;
  verifiedPurchase: boolean;
  sellerResponseText: string | null;
  createdAt: Date;
  user?: User;
  product?: Product;
}

// ============================================
// WISHLIST TYPES
// ============================================

export interface WishlistItem {
  userId: string;
  productId: string;
  addedAt: Date;
  user?: User;
  product?: Product;
}

// ============================================
// ADDRESS TYPES
// ============================================

export interface Address {
  id: string;
  userId: string;
  street: string;
  city: string;
  governorate: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
  createdAt: Date;
  user?: User;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
  user?: User;
}

// ============================================
// QA TYPES
// ============================================

export interface ProductQA {
  id: string;
  productId: string;
  userId: string;
  question: string;
  answer: string | null;
  answererId: string | null;
  answeredAt: Date | null;
  createdAt: Date;
  product?: Product;
  user?: User;
}

// ============================================
// RETURN TYPES
// ============================================

export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface ReturnRequest {
  id: string;
  orderItemId: string;
  reason: string;
  details: string | null;
  status: ReturnStatus;
  adminNotes: string | null;
  createdAt: Date;
  orderItem?: OrderItem;
}

// ============================================
// PAYOUT TYPES
// ============================================

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED';

export interface Payout {
  id: string;
  sellerId: string;
  amount: number;
  status: PayoutStatus;
  bankDetails: string | null;
  transactionId: string | null;
  processedAt: Date | null;
  createdAt: Date;
  seller?: SellerProfile;
}

// ============================================
// AUDIT TYPES
// ============================================

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetId: string | null;
  details: string | null;
  createdAt: Date;
  admin?: User;
}

// ============================================
// SYSTEM TYPES
// ============================================

export interface SystemSettings {
  key: string;
  value: string;
  description: string | null;
  updatedAt: Date;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

// ============================================
// UTILITY TYPES
// ============================================

export type Maybe<T> = T | null | undefined;

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// ============================================
// SESSION TYPES
// ============================================

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
}

export interface Session {
  user?: SessionUser;
  expires?: string;
}

// ============================================
// CART ITEM INPUT TYPES
// ============================================

export interface CartItemInput {
  variantId: string;
  quantity: number;
}

export interface CartItemWithProduct extends CartItem {
  variant: ProductVariant & {
    product: Product;
  };
}
