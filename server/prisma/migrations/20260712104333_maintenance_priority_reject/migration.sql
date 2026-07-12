-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high');

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'rejected';

-- AlterTable
ALTER TABLE "MaintenanceTicket" ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "priority" "TicketPriority" NOT NULL DEFAULT 'medium',
ADD COLUMN     "rejectionReason" TEXT;
