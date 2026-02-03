-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('AVAILABLE', 'USED', 'VOID');

-- CreateTable
CREATE TABLE "StudentCredit" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "availableAmount" INTEGER NOT NULL,
    "status" "CreditStatus" NOT NULL DEFAULT 'AVAILABLE',
    "sourcePaymentId" TEXT NOT NULL,
    "sourceInvoiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentCredit_sourcePaymentId_key" ON "StudentCredit"("sourcePaymentId");

-- CreateIndex
CREATE INDEX "StudentCredit_studentId_idx" ON "StudentCredit"("studentId");

-- CreateIndex
CREATE INDEX "StudentCredit_status_idx" ON "StudentCredit"("status");

-- CreateIndex
CREATE INDEX "StudentCredit_sourcePaymentId_idx" ON "StudentCredit"("sourcePaymentId");

-- AddForeignKey
ALTER TABLE "StudentCredit" ADD CONSTRAINT "StudentCredit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCredit" ADD CONSTRAINT "StudentCredit_sourcePaymentId_fkey" FOREIGN KEY ("sourcePaymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCredit" ADD CONSTRAINT "StudentCredit_sourceInvoiceId_fkey" FOREIGN KEY ("sourceInvoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
