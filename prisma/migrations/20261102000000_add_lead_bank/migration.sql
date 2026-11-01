CREATE TYPE "LeadStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');

CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeNameAr" TEXT,
    "category" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "socialUrl" TEXT,
    "source" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lead_dedupeKey_key" ON "Lead"("dedupeKey");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
