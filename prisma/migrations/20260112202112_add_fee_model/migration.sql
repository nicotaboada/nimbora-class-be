/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('ONE_OFF', 'MONTHLY', 'PERIODIC');

-- CreateEnum
CREATE TYPE "FeePeriod" AS ENUM ('EVERY_WEEK', 'TWICE_A_MONTH', 'EVERY_MONTH', 'EVERY_2_MONTHS', 'EVERY_3_MONTHS', 'EVERY_4_MONTHS', 'EVERY_5_MONTHS', 'EVERY_6_MONTHS');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "Fee" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "FeeType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "cost" INTEGER NOT NULL,
    "occurrences" INTEGER,
    "period" "FeePeriod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fee_pkey" PRIMARY KEY ("id")
);
