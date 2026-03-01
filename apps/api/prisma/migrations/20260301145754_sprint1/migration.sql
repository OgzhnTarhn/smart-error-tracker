/*
  Warnings:

  - You are about to drop the column `count` on the `ErrorGroup` table. All the data in the column will be lost.
  - You are about to drop the column `firstSeen` on the `ErrorGroup` table. All the data in the column will be lost.
  - You are about to drop the column `lastSeen` on the `ErrorGroup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ErrorGroup" DROP COLUMN "count",
DROP COLUMN "firstSeen",
DROP COLUMN "lastSeen",
ADD COLUMN     "eventCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'open';
