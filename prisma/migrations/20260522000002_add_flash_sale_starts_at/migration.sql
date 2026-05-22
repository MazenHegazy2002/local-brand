-- AddColumn: flashSaleStartsAt for scheduled flash sale events
ALTER TABLE "Product" ADD COLUMN "flashSaleStartsAt" TIMESTAMP(3);

-- Index for efficient scheduled-flash-sale queries
CREATE INDEX "Product_flashSaleStartsAt_idx" ON "Product"("flashSaleStartsAt");
