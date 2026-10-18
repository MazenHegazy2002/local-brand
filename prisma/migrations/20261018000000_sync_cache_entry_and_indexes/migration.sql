-- Brings the migration history in line with schema.prisma. Production may already have
-- some of these from an earlier `prisma db push`, so every statement is IF NOT EXISTS.

-- AlterTable
ALTER TABLE "SellerProfile" ALTER COLUMN "commissionRate" SET DEFAULT 0.10;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CacheEntry" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CacheEntry_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CacheEntry_expiresAt_idx" ON "CacheEntry"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_adminId_createdAt_idx" ON "AuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Dispute_sellerId_idx" ON "Dispute"("sellerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payout_sellerId_status_idx" ON "Payout"("sellerId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_condition_published_deletedAt_idx" ON "Product"("condition", "published", "deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_countryOfOrigin_idx" ON "Product"("countryOfOrigin");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Review_productId_status_idx" ON "Review"("productId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SellerProfile_status_idx" ON "SellerProfile"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Wishlist_productId_idx" ON "Wishlist"("productId");
