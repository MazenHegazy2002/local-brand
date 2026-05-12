-- Add Order.deliveredAt to gate seller-earnings escrow.
ALTER TABLE "Order" ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- Backfill existing DELIVERED orders with their last update time so the
-- 14-day escrow rule can apply to historical data without lying about
-- delivery dates. New transitions to DELIVERED set this field explicitly
-- in the application layer.
UPDATE "Order"
SET "deliveredAt" = "updatedAt"
WHERE "status" = 'DELIVERED' AND "deliveredAt" IS NULL;
