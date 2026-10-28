-- A seller's requested store name, applied when an admin approves it.
ALTER TABLE "SellerProfile" ADD COLUMN "pendingStoreName" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN "pendingStoreNameAt" TIMESTAMP(3);
