
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/wasm.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.2.1
 * Query Engine version: 4123509d24aa4dede1e864b46351bf2790323b69
 */
Prisma.prismaVersion = {
  client: "6.2.1",
  engine: "4123509d24aa4dede1e864b46351bf2790323b69"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  name: 'name',
  role: 'role',
  phone: 'phone',
  avatarUrl: 'avatarUrl',
  defaultAddressId: 'defaultAddressId',
  loyaltyPoints: 'loyaltyPoints',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  emailVerified: 'emailVerified'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.PasswordResetTokenScalarFieldEnum = {
  id: 'id',
  email: 'email',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.AddressScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  street: 'street',
  city: 'city',
  governorate: 'governorate',
  postalCode: 'postalCode',
  country: 'country',
  isDefault: 'isDefault',
  createdAt: 'createdAt'
};

exports.Prisma.SellerProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  storeName: 'storeName',
  description: 'description',
  logoUrl: 'logoUrl',
  commissionRate: 'commissionRate',
  status: 'status',
  bankAccount: 'bankAccount',
  balance: 'balance',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  sellerId: 'sellerId',
  categoryId: 'categoryId',
  title: 'title',
  slug: 'slug',
  description: 'description',
  basePrice: 'basePrice',
  condition: 'condition',
  isFeatured: 'isFeatured',
  weightGrams: 'weightGrams',
  published: 'published',
  flashSalePrice: 'flashSalePrice',
  flashSaleEndsAt: 'flashSaleEndsAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  parentId: 'parentId'
};

exports.Prisma.TagScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug'
};

exports.Prisma.CollectionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  imageUrl: 'imageUrl'
};

exports.Prisma.ProductVariantScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  sku: 'sku',
  title: 'title',
  attributes: 'attributes',
  price: 'price',
  stockCount: 'stockCount'
};

exports.Prisma.ProductImageScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  url: 'url',
  isPrimary: 'isPrimary'
};

exports.Prisma.CartItemScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  variantId: 'variantId',
  quantity: 'quantity',
  savedPrice: 'savedPrice',
  addedAt: 'addedAt'
};

exports.Prisma.CouponScalarFieldEnum = {
  id: 'id',
  code: 'code',
  discountType: 'discountType',
  discountValue: 'discountValue',
  minOrderValue: 'minOrderValue',
  maxDiscount: 'maxDiscount',
  expiryDate: 'expiryDate',
  usageLimit: 'usageLimit',
  usedCount: 'usedCount',
  isActive: 'isActive'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  guestEmail: 'guestEmail',
  couponId: 'couponId',
  totalAmount: 'totalAmount',
  discountAmount: 'discountAmount',
  shippingFee: 'shippingFee',
  status: 'status',
  paymentMethod: 'paymentMethod',
  paymentStatus: 'paymentStatus',
  paymentId: 'paymentId',
  idempotencyKey: 'idempotencyKey',
  shippingAddressSnapshot: 'shippingAddressSnapshot',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  variantId: 'variantId',
  productTitleSnapshot: 'productTitleSnapshot',
  sellerNameSnapshot: 'sellerNameSnapshot',
  priceAtPurchase: 'priceAtPurchase',
  quantity: 'quantity',
  status: 'status'
};

exports.Prisma.ShipmentScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  trackingNumber: 'trackingNumber',
  courier: 'courier',
  shippedAt: 'shippedAt',
  deliveredAt: 'deliveredAt'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  productId: 'productId',
  rating: 'rating',
  comment: 'comment',
  verifiedPurchase: 'verifiedPurchase',
  sellerResponseText: 'sellerResponseText',
  createdAt: 'createdAt'
};

exports.Prisma.WishlistScalarFieldEnum = {
  userId: 'userId',
  productId: 'productId',
  addedAt: 'addedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.Role = exports.$Enums.Role = {
  BUYER: 'BUYER',
  SELLER: 'SELLER',
  ADMIN: 'ADMIN'
};

exports.SellerStatus = exports.$Enums.SellerStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BANNED: 'BANNED'
};

exports.DiscountType = exports.$Enums.DiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED'
};

exports.OrderStatus = exports.$Enums.OrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED'
};

exports.OrderItemStatus = exports.$Enums.OrderItemStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURNED: 'RETURNED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  CREDIT_CARD: 'CREDIT_CARD',
  MOBILE_WALLET: 'MOBILE_WALLET',
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  UNPAID: 'UNPAID',
  AUTHORIZED: 'AUTHORIZED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

exports.Prisma.ModelName = {
  User: 'User',
  VerificationToken: 'VerificationToken',
  PasswordResetToken: 'PasswordResetToken',
  Address: 'Address',
  SellerProfile: 'SellerProfile',
  Product: 'Product',
  Category: 'Category',
  Tag: 'Tag',
  Collection: 'Collection',
  ProductVariant: 'ProductVariant',
  ProductImage: 'ProductImage',
  CartItem: 'CartItem',
  Coupon: 'Coupon',
  Order: 'Order',
  OrderItem: 'OrderItem',
  Shipment: 'Shipment',
  Review: 'Review',
  Wishlist: 'Wishlist'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "C:\\Users\\Mazen\\Desktop\\Apps Store\\Local brand\\src\\generated\\client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "windows",
        "native": true
      }
    ],
    "previewFeatures": [
      "driverAdapters"
    ],
    "sourceFilePath": "C:\\Users\\Mazen\\Desktop\\Apps Store\\Local brand\\prisma\\schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null,
    "schemaEnvPath": "../../../.env"
  },
  "relativePath": "../../../prisma",
  "clientVersion": "6.2.1",
  "engineVersion": "4123509d24aa4dede1e864b46351bf2790323b69",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "generator client {\n  provider        = \"prisma-client-js\"\n  output          = \"../src/generated/client\"\n  previewFeatures = [\"driverAdapters\"]\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\n// ============================================\n// USERS & ROLES\n// ============================================\n\nmodel User {\n  id               String    @id @default(uuid())\n  email            String    @unique\n  passwordHash     String\n  name             String\n  role             Role      @default(BUYER)\n  phone            String?\n  avatarUrl        String?\n  defaultAddressId String?\n  loyaltyPoints    Int       @default(0)\n  createdAt        DateTime  @default(now())\n  updatedAt        DateTime  @updatedAt\n  deletedAt        DateTime?\n\n  // Relations\n  orders              Order[]\n  addresses           Address[]\n  reviews             Review[]\n  wishlist            Wishlist[]\n  emailVerified       DateTime?\n  cart                CartItem[]\n  sellerProfile       SellerProfile?\n  passwordResetTokens PasswordResetToken[]\n}\n\nmodel VerificationToken {\n  identifier String\n  token      String   @unique\n  expires    DateTime\n\n  @@unique([identifier, token])\n}\n\nmodel PasswordResetToken {\n  id      String   @id @default(uuid())\n  email   String\n  token   String   @unique\n  expires DateTime\n  user    User     @relation(fields: [email], references: [email], onDelete: Cascade)\n\n  @@unique([email, token])\n}\n\nenum Role {\n  BUYER\n  SELLER\n  ADMIN\n}\n\nmodel Address {\n  id          String   @id @default(uuid())\n  userId      String\n  street      String\n  city        String\n  governorate String\n  postalCode  String?\n  country     String   @default(\"Egypt\")\n  isDefault   Boolean  @default(false)\n  createdAt   DateTime @default(now())\n\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n}\n\n// ============================================\n// SELLERS & PORTAL\n// ============================================\n\nmodel SellerProfile {\n  id             String       @id @default(uuid())\n  userId         String       @unique\n  storeName      String       @unique\n  description    String?\n  logoUrl        String?\n  commissionRate Float        @default(0.15) // Platform takes 15%\n  status         SellerStatus @default(PENDING_APPROVAL)\n  bankAccount    String?\n  balance        Float        @default(0)\n  createdAt      DateTime     @default(now())\n  updatedAt      DateTime     @updatedAt\n  deletedAt      DateTime?\n\n  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n  products Product[]\n}\n\nenum SellerStatus {\n  PENDING_APPROVAL\n  ACTIVE\n  SUSPENDED\n  BANNED\n}\n\n// ============================================\n// CATALOGUE & INVENTORY\n// ============================================\n\nmodel Product {\n  id          String  @id @default(uuid())\n  sellerId    String\n  categoryId  String\n  title       String\n  slug        String  @unique\n  description String\n  basePrice   Float // In EGP\n  condition   String  @default(\"NEW\")\n  isFeatured  Boolean @default(false)\n  weightGrams Int?\n  published   Boolean @default(true)\n\n  // Flash Sale\n  flashSalePrice  Float?\n  flashSaleEndsAt DateTime?\n\n  createdAt DateTime  @default(now())\n  updatedAt DateTime  @updatedAt\n  deletedAt DateTime?\n\n  seller       SellerProfile    @relation(fields: [sellerId], references: [id])\n  category     Category         @relation(fields: [categoryId], references: [id])\n  variants     ProductVariant[]\n  images       ProductImage[]\n  reviews      Review[]\n  wishlistedBy Wishlist[]\n  tags         Tag[]\n  collections  Collection[]\n}\n\nmodel Category {\n  id       String     @id @default(uuid())\n  name     String     @unique\n  slug     String     @unique\n  parentId String?\n  parent   Category?  @relation(\"Subcategories\", fields: [parentId], references: [id])\n  children Category[] @relation(\"Subcategories\")\n  products Product[]\n}\n\nmodel Tag {\n  id   String @id @default(uuid())\n  name String @unique\n  slug String @unique\n\n  products Product[]\n}\n\nmodel Collection {\n  id          String  @id @default(uuid())\n  name        String  @unique\n  slug        String  @unique\n  description String?\n  imageUrl    String?\n\n  products Product[]\n}\n\nmodel ProductVariant {\n  id         String @id @default(uuid())\n  productId  String\n  sku        String @unique\n  title      String // e.g. \"Red - Medium\"\n  attributes String // JSON string for colors/sizes\n  price      Float // Specific variant price overriding basePrice if needed\n  stockCount Int    @default(0)\n\n  product    Product     @relation(fields: [productId], references: [id], onDelete: Cascade)\n  cartItems  CartItem[]\n  orderItems OrderItem[]\n}\n\nmodel ProductImage {\n  id        String  @id @default(uuid())\n  productId String\n  url       String\n  isPrimary Boolean @default(false)\n\n  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)\n}\n\n// ============================================\n// CART & CHECKOUT\n// ============================================\n\nmodel CartItem {\n  id         String   @id @default(uuid())\n  userId     String\n  variantId  String\n  quantity   Int\n  savedPrice Float\n  addedAt    DateTime @default(now())\n\n  user    User           @relation(fields: [userId], references: [id], onDelete: Cascade)\n  variant ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)\n\n  @@unique([userId, variantId])\n}\n\nmodel Coupon {\n  id            String       @id @default(uuid())\n  code          String       @unique\n  discountType  DiscountType\n  discountValue Float\n  minOrderValue Float?\n  maxDiscount   Float?\n  expiryDate    DateTime\n  usageLimit    Int?\n  usedCount     Int          @default(0)\n  isActive      Boolean      @default(true)\n\n  orders Order[]\n}\n\nenum DiscountType {\n  PERCENTAGE\n  FIXED\n}\n\n// ============================================\n// ORDERS & LIFECYCLE\n// ============================================\n\nmodel Order {\n  id             String        @id @default(uuid())\n  userId         String?\n  guestEmail     String?\n  couponId       String?\n  totalAmount    Float\n  discountAmount Float         @default(0)\n  shippingFee    Float         @default(0)\n  status         OrderStatus   @default(PENDING_PAYMENT)\n  paymentMethod  PaymentMethod\n  paymentStatus  PaymentStatus @default(UNPAID)\n  paymentId      String? // Gateway ID (Stripe/Paymob)\n  idempotencyKey String?       @unique\n\n  // Snapshots for historical integrity\n  shippingAddressSnapshot String // JSON string of address\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  user      User?       @relation(fields: [userId], references: [id])\n  coupon    Coupon?     @relation(fields: [couponId], references: [id])\n  items     OrderItem[]\n  shipments Shipment[]\n}\n\nmodel OrderItem {\n  id        String @id @default(uuid())\n  orderId   String\n  variantId String\n\n  // Snapshots\n  productTitleSnapshot String\n  sellerNameSnapshot   String\n  priceAtPurchase      Float\n  quantity             Int\n\n  status OrderItemStatus @default(PENDING) // Can be refunded/returned individually\n\n  order   Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)\n  variant ProductVariant @relation(fields: [variantId], references: [id])\n}\n\nenum OrderStatus {\n  PENDING_PAYMENT\n  CONFIRMED\n  PROCESSING\n  SHIPPED\n  DELIVERED\n  CANCELLED\n  RETURNED\n}\n\nenum OrderItemStatus {\n  PENDING\n  CONFIRMED\n  SHIPPED\n  DELIVERED\n  RETURN_REQUESTED\n  RETURNED\n  REFUNDED\n  CANCELLED\n}\n\nenum PaymentMethod {\n  CREDIT_CARD\n  MOBILE_WALLET\n  CASH_ON_DELIVERY\n}\n\nenum PaymentStatus {\n  UNPAID\n  AUTHORIZED\n  PAID\n  FAILED\n  REFUNDED\n}\n\n// ============================================\n// SHIPPING & TRANSACTIONS\n// ============================================\n\nmodel Shipment {\n  id             String    @id @default(uuid())\n  orderId        String\n  trackingNumber String?\n  courier        String?\n  shippedAt      DateTime?\n  deliveredAt    DateTime?\n\n  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)\n}\n\n// ============================================\n// TRUST & SOCIAL\n// ============================================\n\nmodel Review {\n  id                 String   @id @default(uuid())\n  userId             String\n  productId          String\n  rating             Int // 1-5\n  comment            String?\n  verifiedPurchase   Boolean  @default(false)\n  sellerResponseText String?\n  createdAt          DateTime @default(now())\n\n  user    User    @relation(fields: [userId], references: [id])\n  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)\n}\n\nmodel Wishlist {\n  userId    String\n  productId String\n  addedAt   DateTime @default(now())\n\n  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)\n  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)\n\n  @@id([userId, productId])\n}\n",
  "inlineSchemaHash": "f5541a233621e590495a0a49185f04ce0d76647c359b111ccde8fa483717bc96",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"passwordHash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"enum\",\"type\":\"Role\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"avatarUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"defaultAddressId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"loyaltyPoints\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deletedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"orders\",\"kind\":\"object\",\"type\":\"Order\",\"relationName\":\"OrderToUser\"},{\"name\":\"addresses\",\"kind\":\"object\",\"type\":\"Address\",\"relationName\":\"AddressToUser\"},{\"name\":\"reviews\",\"kind\":\"object\",\"type\":\"Review\",\"relationName\":\"ReviewToUser\"},{\"name\":\"wishlist\",\"kind\":\"object\",\"type\":\"Wishlist\",\"relationName\":\"UserToWishlist\"},{\"name\":\"emailVerified\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"cart\",\"kind\":\"object\",\"type\":\"CartItem\",\"relationName\":\"CartItemToUser\"},{\"name\":\"sellerProfile\",\"kind\":\"object\",\"type\":\"SellerProfile\",\"relationName\":\"SellerProfileToUser\"},{\"name\":\"passwordResetTokens\",\"kind\":\"object\",\"type\":\"PasswordResetToken\",\"relationName\":\"PasswordResetTokenToUser\"}],\"dbName\":null},\"VerificationToken\":{\"fields\":[{\"name\":\"identifier\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expires\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"PasswordResetToken\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expires\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"PasswordResetTokenToUser\"}],\"dbName\":null},\"Address\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"street\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"city\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"governorate\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"postalCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"country\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isDefault\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"AddressToUser\"}],\"dbName\":null},\"SellerProfile\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"storeName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"logoUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"commissionRate\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"SellerStatus\"},{\"name\":\"bankAccount\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"balance\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deletedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"SellerProfileToUser\"},{\"name\":\"products\",\"kind\":\"object\",\"type\":\"Product\",\"relationName\":\"ProductToSellerProfile\"}],\"dbName\":null},\"Product\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sellerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"categoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"slug\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"basePrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"condition\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isFeatured\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"weightGrams\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"published\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"flashSalePrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"flashSaleEndsAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deletedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"seller\",\"kind\":\"object\",\"type\":\"SellerProfile\",\"relationName\":\"ProductToSellerProfile\"},{\"name\":\"category\",\"kind\":\"object\",\"type\":\"Category\",\"relationName\":\"CategoryToProduct\"},{\"name\":\"variants\",\"kind\":\"object\",\"type\":\"ProductVariant\",\"relationName\":\"ProductToProductVariant\"},{\"name\":\"images\",\"kind\":\"object\",\"type\":\"ProductImage\",\"relationName\":\"ProductToProductImage\"},{\"name\":\"reviews\",\"kind\":\"object\",\"type\":\"Review\",\"relationName\":\"ProductToReview\"},{\"name\":\"wishlistedBy\",\"kind\":\"object\",\"type\":\"Wishlist\",\"relationName\":\"ProductToWishlist\"},{\"name\":\"tags\",\"kind\":\"object\",\"type\":\"Tag\",\"relationName\":\"ProductToTag\"},{\"name\":\"collections\",\"kind\":\"object\",\"type\":\"Collection\",\"relationName\":\"CollectionToProduct\"}],\"dbName\":null},\"Category\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"slug\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"parentId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"parent\",\"kind\":\"object\",\"type\":\"Category\",\"relationName\":\"Subcategories\"},{\"name\":\"children\",\"kind\":\"object\",\"type\":\"Category\",\"relationName\":\"Subcategories\"},{\"name\":\"products\",\"kind\":\"object\",\"type\":\"Product\",\"relationName\":\"CategoryToProduct\"}],\"dbName\":null},\"Tag\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"slug\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"products\",\"kind\":\"object\",\"type\":\"Product\",\"relationName\":\"ProductToTag\"}],\"dbName\":null},\"Collection\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"slug\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"imageUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"products\",\"kind\":\"object\",\"type\":\"Product\",\"relationName\":\"CollectionToProduct\"}],\"dbName\":null},\"ProductVariant\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"attributes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"price\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"stockCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"product\",\"kind\":\"object\",\"type\":\"Product\",\"relationName\":\"ProductToProductVariant\"},{\"name\":\"cartItems\",\"kind\":\"object\",\"type\":\"CartItem\",\"relationName\":\"CartItemToProductVariant\"},{\"name\":\"orderItems\",\"kind\":\"object\",\"type\":\"OrderItem\",\"relationName\":\"OrderItemToProductVariant\"}],\"dbName\":null},\"ProductImage\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"url\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isPrimary\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"product\",\"kind\":\"object\",\"type\":\"Product\",\"relationName\":\"ProductToProductImage\"}],\"dbName\":null},\"CartItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"variantId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quantity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"savedPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"addedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"CartItemToUser\"},{\"name\":\"variant\",\"kind\":\"object\",\"type\":\"ProductVariant\",\"relationName\":\"CartItemToProductVariant\"}],\"dbName\":null},\"Coupon\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"discountType\",\"kind\":\"enum\",\"type\":\"DiscountType\"},{\"name\":\"discountValue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"minOrderValue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"maxDiscount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"expiryDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"usageLimit\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"usedCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"orders\",\"kind\":\"object\",\"type\":\"Order\",\"relationName\":\"CouponToOrder\"}],\"dbName\":null},\"Order\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"guestEmail\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"couponId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"totalAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"discountAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"shippingFee\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"OrderStatus\"},{\"name\":\"paymentMethod\",\"kind\":\"enum\",\"type\":\"PaymentMethod\"},{\"name\":\"paymentStatus\",\"kind\":\"enum\",\"type\":\"PaymentStatus\"},{\"name\":\"paymentId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"idempotencyKey\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingAddressSnapshot\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"OrderToUser\"},{\"name\":\"coupon\",\"kind\":\"object\",\"type\":\"Coupon\",\"relationName\":\"CouponToOrder\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"OrderItem\",\"relationName\":\"OrderToOrderItem\"},{\"name\":\"shipments\",\"kind\":\"object\",\"type\":\"Shipment\",\"relationName\":\"OrderToShipment\"}],\"dbName\":null},\"OrderItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"variantId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productTitleSnapshot\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sellerNameSnapshot\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"priceAtPurchase\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"quantity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"OrderItemStatus\"},{\"name\":\"order\",\"kind\":\"object\",\"type\":\"Order\",\"relationName\":\"OrderToOrderItem\"},{\"name\":\"variant\",\"kind\":\"object\",\"type\":\"ProductVariant\",\"relationName\":\"OrderItemToProductVariant\"}],\"dbName\":null},\"Shipment\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"trackingNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"courier\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deliveredAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"order\",\"kind\":\"object\",\"type\":\"Order\",\"relationName\":\"OrderToShipment\"}],\"dbName\":null},\"Review\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"rating\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"comment\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"verifiedPurchase\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"sellerResponseText\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ReviewToUser\"},{\"name\":\"product\",\"kind\":\"object\",\"type\":\"Product\",\"relationName\":\"ProductToReview\"}],\"dbName\":null},\"Wishlist\":{\"fields\":[{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"addedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToWishlist\"},{\"name\":\"product\",\"kind\":\"object\",\"type\":\"Product\",\"relationName\":\"ProductToWishlist\"}],\"dbName\":null}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine 
  }
}

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

