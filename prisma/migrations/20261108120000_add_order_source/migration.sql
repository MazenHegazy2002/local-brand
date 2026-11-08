-- Manual orders: where the order came from, and who entered it.
ALTER TABLE "Order" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'WEBSITE';
ALTER TABLE "Order" ADD COLUMN "createdById" TEXT;
CREATE INDEX "Order_source_idx" ON "Order"("source");
