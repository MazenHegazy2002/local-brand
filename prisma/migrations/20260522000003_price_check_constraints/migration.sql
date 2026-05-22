-- Price integrity constraints on the Product table.
-- These are advisory CHECK constraints — Prisma ignores them in its own
-- query layer, but Postgres enforces them as a hard DB-level safety net.

-- 1. Base price must be positive
ALTER TABLE "Product"
  ADD CONSTRAINT "product_base_price_positive"
  CHECK ("basePrice" > 0);

-- 2. Flash sale price, when set, must be strictly less than base price
--    (only enforced when the field is non-NULL)
ALTER TABLE "Product"
  ADD CONSTRAINT "product_flash_sale_price_below_base"
  CHECK ("flashSalePrice" IS NULL OR "flashSalePrice" < "basePrice");

-- 3. Flash sale discount cap: max 90% off
--    (a hard guard against accidental free / near-free products)
ALTER TABLE "Product"
  ADD CONSTRAINT "product_flash_sale_max_discount"
  CHECK ("flashSalePrice" IS NULL OR "flashSalePrice" >= "basePrice" * 0.10);

-- 4. Flash sale window: start must precede end when both are set
ALTER TABLE "Product"
  ADD CONSTRAINT "product_flash_sale_window_valid"
  CHECK (
    "flashSaleStartsAt" IS NULL
    OR "flashSaleEndsAt" IS NULL
    OR "flashSaleStartsAt" < "flashSaleEndsAt"
  );

-- 5. ProductVariant: sale price must be positive
ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "variant_price_positive"
  CHECK ("price" > 0);

-- 6. ProductVariant: stock count cannot go negative
ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "variant_stock_non_negative"
  CHECK ("stockCount" >= 0);
