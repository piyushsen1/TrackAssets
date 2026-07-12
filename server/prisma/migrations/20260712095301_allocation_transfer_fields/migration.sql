-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'allocation';

-- AlterTable
ALTER TABLE "Allocation" ADD COLUMN     "conditionOnReturn" TEXT,
ADD COLUMN     "expectedReturnDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TransferRequest" ADD COLUMN     "rejectionReason" TEXT;
