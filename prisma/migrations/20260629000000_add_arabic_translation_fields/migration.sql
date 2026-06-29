-- AlterTable
ALTER TABLE "Product" ADD COLUMN "titleAr" TEXT;
ALTER TABLE "Product" ADD COLUMN "descriptionAr" TEXT;
ALTER TABLE "Product" ADD COLUMN "loyaltyPointPct" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "nameAr" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN "nameAr" TEXT;

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN "nameAr" TEXT;
ALTER TABLE "Collection" ADD COLUMN "descriptionAr" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN "titleAr" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "orderItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderItemId_key" ON "Review"("orderItemId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
