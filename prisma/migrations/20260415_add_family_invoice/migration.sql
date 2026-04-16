-- Add familyId and family relation to Invoice
ALTER TABLE "Invoice" ADD COLUMN "familyId" TEXT;

-- Create index for familyId
CREATE INDEX "Invoice_familyId_idx" ON "Invoice"("familyId");

-- Add foreign key constraint
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add BULK_FAMILY_INVOICE to BulkOperationType enum
ALTER TYPE "BulkOperationType" ADD VALUE 'BULK_FAMILY_INVOICE';
