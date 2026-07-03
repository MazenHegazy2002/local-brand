-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "whatsappConfirmStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
ADD COLUMN     "whatsappLastSentAt" TIMESTAMP(3),
ADD COLUMN     "whatsappMessageId" TEXT;
