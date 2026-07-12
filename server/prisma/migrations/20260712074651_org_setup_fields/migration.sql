-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "customFields" JSONB;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
