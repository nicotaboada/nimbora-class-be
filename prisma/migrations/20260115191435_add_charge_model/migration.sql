-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "Charge" (
    "id" TEXT NOT NULL,
    "feeId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Charge_studentId_idx" ON "Charge"("studentId");

-- CreateIndex
CREATE INDEX "Charge_feeId_idx" ON "Charge"("feeId");

-- CreateIndex
CREATE INDEX "Charge_periodMonth_idx" ON "Charge"("periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "Charge_studentId_feeId_installmentNumber_key" ON "Charge"("studentId", "feeId", "installmentNumber");

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "Fee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
