-- Add query-pattern indexes to the Product table
-- These cover the most common filter/sort combinations in /api/products

-- Base browse: published + soft-delete guard, sorted by recency (default sort)
CREATE INDEX IF NOT EXISTS "Product_published_deletedAt_createdAt_idx"
  ON "Product"("published", "deletedAt", "createdAt");

-- Category page: narrow by category then apply standard filters
CREATE INDEX IF NOT EXISTS "Product_categoryId_published_deletedAt_idx"
  ON "Product"("categoryId", "published", "deletedAt");

-- Seller hub / store page: all products for a seller
CREATE INDEX IF NOT EXISTS "Product_sellerId_published_deletedAt_idx"
  ON "Product"("sellerId", "published", "deletedAt");

-- Price sort / range filter
CREATE INDEX IF NOT EXISTS "Product_basePrice_idx"
  ON "Product"("basePrice");

-- Featured products section
CREATE INDEX IF NOT EXISTS "Product_isFeatured_published_deletedAt_idx"
  ON "Product"("isFeatured", "published", "deletedAt");

-- Flash-sale filter (flashSaleEndsAt > now())
CREATE INDEX IF NOT EXISTS "Product_flashSaleEndsAt_idx"
  ON "Product"("flashSaleEndsAt");
