-- CreateTable
CREATE TABLE "TrafficLog" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "loadTimeMs" INTEGER,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrafficLog_createdAt_idx" ON "TrafficLog"("createdAt");

-- CreateIndex
CREATE INDEX "TrafficLog_sessionToken_idx" ON "TrafficLog"("sessionToken");
