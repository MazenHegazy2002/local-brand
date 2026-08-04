-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "pickupStreet" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "pickupBuilding" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "pickupPhone" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "pickupContactName" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "pickupGeo" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "pickupZone" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "pickupSubzone" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "logisticsHub" TEXT;
