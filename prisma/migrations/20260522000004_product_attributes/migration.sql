-- AddColumns: extended product attributes (brand, material, gender, ageGroup, warrantyMonths)

ALTER TABLE "Product" ADD COLUMN "brand"          TEXT;
ALTER TABLE "Product" ADD COLUMN "material"       TEXT;
ALTER TABLE "Product" ADD COLUMN "gender"         TEXT;
ALTER TABLE "Product" ADD COLUMN "ageGroup"       TEXT;
ALTER TABLE "Product" ADD COLUMN "warrantyMonths" INTEGER;

-- Indexes for filtering
CREATE INDEX "Product_brand_idx"  ON "Product"("brand");
CREATE INDEX "Product_gender_idx" ON "Product"("gender");
