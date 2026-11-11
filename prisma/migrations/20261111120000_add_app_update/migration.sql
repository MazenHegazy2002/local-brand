-- Over-the-air app updates.
CREATE TABLE "AppUpdate" (
    "id" TEXT NOT NULL,
    "runtimeVersion" TEXT NOT NULL,
    "message" TEXT,
    "gitCommit" TEXT,
    "platforms" TEXT NOT NULL DEFAULT 'android,ios',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "AppUpdate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AppUpdate_runtimeVersion_active_createdAt_idx" ON "AppUpdate"("runtimeVersion", "active", "createdAt");
