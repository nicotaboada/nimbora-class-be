-- AlterTable: add taxpayer data columns from ARCA padron
ALTER TABLE "AcademyAfipSettings" ADD COLUMN "razonSocial" TEXT;
ALTER TABLE "AcademyAfipSettings" ADD COLUMN "personeria" TEXT;
ALTER TABLE "AcademyAfipSettings" ADD COLUMN "condicionIva" TEXT;
ALTER TABLE "AcademyAfipSettings" ADD COLUMN "domicilioFiscal" TEXT;
ALTER TABLE "AcademyAfipSettings" ADD COLUMN "actividadPrincipal" TEXT;
