-- CreateEnum
CREATE TYPE "AcademyTaxStatus" AS ENUM ('MONOTRIBUTO', 'RESPONSABLE_INSCRIPTO', 'EXENTO');

-- CreateEnum
CREATE TYPE "AfipEnvironment" AS ENUM ('HOMO', 'PROD');

-- CreateEnum
CREATE TYPE "AfipDelegationStatus" AS ENUM ('PENDING', 'OK', 'ERROR');

-- CreateEnum
CREATE TYPE "BillingDocType" AS ENUM ('CONSUMIDOR_FINAL', 'DNI', 'CUIT');

-- CreateEnum
CREATE TYPE "BillingTaxCondition" AS ENUM ('CONSUMIDOR_FINAL', 'MONOTRIBUTO', 'RESPONSABLE_INSCRIPTO', 'EXENTO');

-- CreateEnum
CREATE TYPE "AfipFiscalStatus" AS ENUM ('EMITTING', 'EMITTED', 'ERROR');

-- CreateTable
CREATE TABLE "AcademyFeature" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AcademyFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyAfipSettings" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "taxStatus" "AcademyTaxStatus" NOT NULL,
    "cuit" TEXT NOT NULL,
    "defaultPtoVta" INTEGER NOT NULL,
    "environment" "AfipEnvironment" NOT NULL DEFAULT 'HOMO',
    "vatRatePermil" INTEGER,
    "delegationStatus" "AfipDelegationStatus" NOT NULL DEFAULT 'PENDING',
    "delegatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AcademyAfipSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "studentId" TEXT,
    "displayName" TEXT NOT NULL,
    "docType" "BillingDocType" NOT NULL,
    "docNumber" TEXT,
    "taxCondition" "BillingTaxCondition" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AfipInvoice" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "status" "AfipFiscalStatus" NOT NULL DEFAULT 'EMITTING',
    "recipientName" TEXT NOT NULL,
    "docType" "BillingDocType" NOT NULL,
    "docNumber" TEXT,
    "taxCondition" "BillingTaxCondition" NOT NULL,
    "ptoVta" INTEGER NOT NULL,
    "cbteTipo" INTEGER NOT NULL,
    "concepto" INTEGER NOT NULL,
    "cbteFch" TIMESTAMP(3) NOT NULL,
    "cbteNro" INTEGER,
    "cae" TEXT,
    "caeVto" TIMESTAMP(3),
    "lastError" TEXT,
    "requestJson" JSONB,
    "responseJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AfipInvoice_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "billingProfileId" TEXT;

-- CreateIndex
CREATE INDEX "AcademyFeature_academyId_idx" ON "AcademyFeature"("academyId");
CREATE INDEX "AcademyFeature_key_idx" ON "AcademyFeature"("key");
CREATE UNIQUE INDEX "AcademyFeature_academyId_key_key" ON "AcademyFeature"("academyId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyAfipSettings_academyId_key" ON "AcademyAfipSettings"("academyId");

-- CreateIndex
CREATE INDEX "BillingProfile_academyId_idx" ON "BillingProfile"("academyId");
CREATE INDEX "BillingProfile_studentId_idx" ON "BillingProfile"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AfipInvoice_invoiceId_key" ON "AfipInvoice"("invoiceId");

-- AddForeignKey
ALTER TABLE "AcademyFeature" ADD CONSTRAINT "AcademyFeature_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyAfipSettings" ADD CONSTRAINT "AcademyAfipSettings_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_billingProfileId_fkey" FOREIGN KEY ("billingProfileId") REFERENCES "BillingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AfipInvoice" ADD CONSTRAINT "AfipInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
