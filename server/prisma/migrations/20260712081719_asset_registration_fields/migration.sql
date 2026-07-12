-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "acquisitionCost" DECIMAL(12,2),
ADD COLUMN     "acquisitionDate" TIMESTAMP(3),
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isBookable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photoUrl" TEXT;
