-- CreateTable
CREATE TABLE "ProductImportRequest" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedRole" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImportRequest_status_createdAt_idx" ON "ProductImportRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductImportRequest_sellerId_createdAt_idx" ON "ProductImportRequest"("sellerId", "createdAt");
