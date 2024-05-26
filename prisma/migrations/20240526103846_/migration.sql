/*
  Warnings:

  - Added the required column `source` to the `JobApplication` table without a default value. This is not possible if the table is not empty.
  - Made the column `industry` on table `JobApplication` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `JobApplication` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source" TEXT NOT NULL,
ALTER COLUMN "industry" SET NOT NULL,
ALTER COLUMN "name" SET NOT NULL;

