-- AlterTable
ALTER TABLE "TrafficLog" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "eventDetails" TEXT,
ADD COLUMN     "eventType" TEXT NOT NULL DEFAULT 'PAGE_VIEW';
