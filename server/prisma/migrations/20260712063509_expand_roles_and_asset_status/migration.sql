/*
  Warnings:

  - You are about to drop the column `head` on the `Department` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetStatus" ADD VALUE 'reserved';
ALTER TYPE "AssetStatus" ADD VALUE 'lost';
ALTER TYPE "AssetStatus" ADD VALUE 'disposed';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'department_head';
ALTER TYPE "Role" ADD VALUE 'asset_manager';

-- AlterTable
ALTER TABLE "Department" DROP COLUMN "head",
ADD COLUMN     "headEmployeeId" TEXT;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_headEmployeeId_fkey" FOREIGN KEY ("headEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
