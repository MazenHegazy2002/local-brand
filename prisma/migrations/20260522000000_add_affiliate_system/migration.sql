-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'BANNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AffiliateTier" AS ENUM ('STARTER', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AffiliateBonusType" AS ENUM ('REFERRER_SIGNUP', 'JOINER_SIGNUP');

-- CreateEnum
CREATE TYPE "AffiliateBonusStatus" AS ENUM ('PENDING', 'ACTIVE', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AffiliatePayoutStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "AffiliatePayoutMethod" AS ENUM ('VODAFONE_CASH', 'ORANGE_MONEY', 'ETISALAT_CASH', 'INSTAPAY', 'BANK_TRANSFER');

-- AlterTable: add referredBySlug to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredBySlug" TEXT;

-- CreateTable: Affiliate
CREATE TABLE IF NOT EXISTS "Affiliate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promoCode" TEXT NOT NULL,
    "referralSlug" TEXT NOT NULL,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'PENDING',
    "tier" "AffiliateTier" NOT NULL DEFAULT 'STARTER',
    "customCommissionPct" DECIMAL(5,2),
    "customDiscountPct" DECIMAL(5,2),
    "platform" TEXT,
    "platformFollowers" INTEGER,
    "categoryFocus" TEXT,
    "applicationNote" TEXT,
    "adminNote" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "payoutMethod" "AffiliatePayoutMethod",
    "payoutDetails" TEXT,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "totalEarnedEgp" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingEarningsEgp" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AffiliateTierConfig
CREATE TABLE IF NOT EXISTS "AffiliateTierConfig" (
    "id" TEXT NOT NULL,
    "tier" "AffiliateTier" NOT NULL,
    "name" TEXT NOT NULL,
    "minConversions" INTEGER NOT NULL,
    "commissionPct" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateTierConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AffiliateGlobalSettings
CREATE TABLE IF NOT EXISTS "AffiliateGlobalSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "defaultDiscountPct" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "maxDiscountPct" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "referrerBonusEgp" DECIMAL(10,2) NOT NULL DEFAULT 50,
    "joinerBonusEgp" DECIMAL(10,2) NOT NULL DEFAULT 30,
    "bonusExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "bonusesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "programEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "AffiliateGlobalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PromoCodeUsage
CREATE TABLE IF NOT EXISTS "PromoCodeUsage" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL,
    "discountAmountEgp" DECIMAL(10,2) NOT NULL,
    "orderTotalBeforeDiscount" DECIMAL(10,2) NOT NULL,
    "orderTotalAfterDiscount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCodeUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Commission
CREATE TABLE IF NOT EXISTS "Commission" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderTotalEgp" DECIMAL(10,2) NOT NULL,
    "commissionPct" DECIMAL(5,2) NOT NULL,
    "commissionEgp" DECIMAL(10,2) NOT NULL,
    "status" "AffiliateCommissionStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AffiliateBonus
CREATE TABLE IF NOT EXISTS "AffiliateBonus" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "type" "AffiliateBonusType" NOT NULL,
    "amountEgp" DECIMAL(10,2) NOT NULL,
    "status" "AffiliateBonusStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "usedOnOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateBonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AffiliateReferral
CREATE TABLE IF NOT EXISTS "AffiliateReferral" (
    "id" TEXT NOT NULL,
    "referrerAffiliateId" TEXT NOT NULL,
    "newAffiliateId" TEXT NOT NULL,
    "referrerBonusId" TEXT,
    "joinerBonusId" TEXT,
    "firstOrderTriggered" BOOLEAN NOT NULL DEFAULT false,
    "firstOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AffiliatePayout
CREATE TABLE IF NOT EXISTS "AffiliatePayout" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "amountEgp" DECIMAL(10,2) NOT NULL,
    "method" "AffiliatePayoutMethod" NOT NULL,
    "payoutDetails" TEXT NOT NULL,
    "status" "AffiliatePayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "adminNote" TEXT,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliatePayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Affiliate_userId_key" ON "Affiliate"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Affiliate_promoCode_key" ON "Affiliate"("promoCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Affiliate_referralSlug_key" ON "Affiliate"("referralSlug");
CREATE INDEX IF NOT EXISTS "Affiliate_status_idx" ON "Affiliate"("status");
CREATE INDEX IF NOT EXISTS "Affiliate_tier_idx" ON "Affiliate"("tier");
CREATE INDEX IF NOT EXISTS "Affiliate_promoCode_idx" ON "Affiliate"("promoCode");

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateTierConfig_tier_key" ON "AffiliateTierConfig"("tier");

CREATE UNIQUE INDEX IF NOT EXISTS "PromoCodeUsage_orderId_key" ON "PromoCodeUsage"("orderId");
CREATE INDEX IF NOT EXISTS "PromoCodeUsage_affiliateId_idx" ON "PromoCodeUsage"("affiliateId");
CREATE INDEX IF NOT EXISTS "PromoCodeUsage_buyerId_idx" ON "PromoCodeUsage"("buyerId");

CREATE INDEX IF NOT EXISTS "Commission_affiliateId_status_idx" ON "Commission"("affiliateId", "status");
CREATE INDEX IF NOT EXISTS "Commission_orderId_idx" ON "Commission"("orderId");

CREATE INDEX IF NOT EXISTS "AffiliateBonus_affiliateId_status_idx" ON "AffiliateBonus"("affiliateId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateReferral_newAffiliateId_key" ON "AffiliateReferral"("newAffiliateId");
CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateReferral_referrerBonusId_key" ON "AffiliateReferral"("referrerBonusId");
CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateReferral_joinerBonusId_key" ON "AffiliateReferral"("joinerBonusId");
CREATE INDEX IF NOT EXISTS "AffiliateReferral_referrerAffiliateId_idx" ON "AffiliateReferral"("referrerAffiliateId");

CREATE INDEX IF NOT EXISTS "AffiliatePayout_affiliateId_status_idx" ON "AffiliatePayout"("affiliateId", "status");

-- AddForeignKey
ALTER TABLE "Affiliate" ADD CONSTRAINT "Affiliate_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_affiliateId_fkey"
    FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Commission" ADD CONSTRAINT "Commission_affiliateId_fkey"
    FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Commission" ADD CONSTRAINT "Commission_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Commission" ADD CONSTRAINT "Commission_payoutId_fkey"
    FOREIGN KEY ("payoutId") REFERENCES "AffiliatePayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AffiliateBonus" ADD CONSTRAINT "AffiliateBonus_affiliateId_fkey"
    FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AffiliateReferral" ADD CONSTRAINT "AffiliateReferral_referrerAffiliateId_fkey"
    FOREIGN KEY ("referrerAffiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AffiliateReferral" ADD CONSTRAINT "AffiliateReferral_newAffiliateId_fkey"
    FOREIGN KEY ("newAffiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AffiliateReferral" ADD CONSTRAINT "AffiliateReferral_referrerBonusId_fkey"
    FOREIGN KEY ("referrerBonusId") REFERENCES "AffiliateBonus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AffiliateReferral" ADD CONSTRAINT "AffiliateReferral_joinerBonusId_fkey"
    FOREIGN KEY ("joinerBonusId") REFERENCES "AffiliateBonus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AffiliatePayout" ADD CONSTRAINT "AffiliatePayout_affiliateId_fkey"
    FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default tier config so getGlobalSettings() never returns empty
INSERT INTO "AffiliateGlobalSettings" ("id", "updatedAt") VALUES ('global', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "AffiliateTierConfig" ("id", "tier", "name", "minConversions", "commissionPct", "updatedAt") VALUES
  (gen_random_uuid()::text, 'STARTER',  'Starter',  0,   5.00, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SILVER',   'Silver',   10,  7.00, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'GOLD',     'Gold',     50,  10.00, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'PLATINUM', 'Platinum', 200, 12.00, CURRENT_TIMESTAMP)
ON CONFLICT ("tier") DO NOTHING;
