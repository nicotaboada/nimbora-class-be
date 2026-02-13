-- CreateTable
CREATE TABLE "AfipSalesPoint" (
    "id" TEXT NOT NULL,
    "afipSettingsId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEnabledForArca" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AfipSalesPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AfipSalesPoint_afipSettingsId_idx" ON "AfipSalesPoint"("afipSettingsId");

-- CreateIndex
CREATE UNIQUE INDEX "AfipSalesPoint_afipSettingsId_number_key" ON "AfipSalesPoint"("afipSettingsId", "number");

-- AddForeignKey
ALTER TABLE "AfipSalesPoint" ADD CONSTRAINT "AfipSalesPoint_afipSettingsId_fkey" FOREIGN KEY ("afipSettingsId") REFERENCES "AcademyAfipSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
