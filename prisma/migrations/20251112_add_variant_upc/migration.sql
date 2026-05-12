-- Add ProductVariant.upc (Universal Product Code / EAN / GTIN). Optional:
-- only sellers who carry branded goods or rent numbers from GS1 will fill
-- it. Indexed so the buyer-facing /api/search-by-barcode endpoint can
-- look up scanned codes quickly.
ALTER TABLE "ProductVariant" ADD COLUMN "upc" TEXT;

CREATE INDEX "ProductVariant_upc_idx" ON "ProductVariant" ("upc");
