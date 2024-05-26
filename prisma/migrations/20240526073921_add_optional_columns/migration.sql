/*
  Warnings:

  - You are about to drop the column `hiringManager` on the `JobApplication` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "JobApplication" DROP COLUMN "hiringManager",
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "secondInterview" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "notes" DROP NOT NULL;
