import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient configurado para tests que usa explícitamente
 * la DATABASE_URL del proceso (de .env.test via dotenv-cli)
 * Esto ignora el .env que Prisma carga automáticamente
 */
export class TestPrismaService extends PrismaClient {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Crea los enums y tablas del schema si no existen
   * Agregar aquí nuevas tablas cuando se creen migraciones
   */
  async ensureSchema() {
    await this.createEnums();
    await this.createTables();
    await this.addMissingColumns();
  }

  private async addMissingColumns() {
    // Add paidAmount and balance to Invoice if they don't exist
    try {
      await this.$executeRawUnsafe(`
        ALTER TABLE "Invoice" 
        ADD COLUMN IF NOT EXISTS "paidAmount" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "balance" INTEGER NOT NULL DEFAULT 0;
      `);
    } catch (e) {
      // Columns might already exist
    }
  }

  private async createEnums() {
    // AcademyStatus enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "AcademyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // UserRole enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OWNER', 'STAFF', 'TEACHER', 'STUDENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // StudentStatus enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "StudentStatus" AS ENUM ('ENABLED', 'DISABLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // FeeType enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "FeeType" AS ENUM ('ONE_OFF', 'MONTHLY', 'PERIODIC');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // FeePeriod enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "FeePeriod" AS ENUM ('EVERY_WEEK', 'TWICE_A_MONTH', 'EVERY_MONTH', 'EVERY_2_MONTHS', 'EVERY_3_MONTHS', 'EVERY_4_MONTHS', 'EVERY_5_MONTHS', 'EVERY_6_MONTHS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // ChargeStatus enum (with INVOICED)
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'INVOICED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Ensure INVOICED value exists if enum was created without it
    try {
      await this.$executeRawUnsafe(`
        ALTER TYPE "ChargeStatus" ADD VALUE IF NOT EXISTS 'INVOICED';
      `);
    } catch {
      // Ignore error if value already exists
    }

    // InvoiceStatus enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'PAID', 'PARTIALLY_PAID', 'VOID');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // DiscountType enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED_AMOUNT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // InvoiceLineType enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "InvoiceLineType" AS ENUM ('CHARGE', 'MANUAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // PaymentMethod enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // PaymentStatus enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'VOID');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // PaymentType enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "PaymentType" AS ENUM ('PAYMENT', 'REFUND');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // CreditStatus enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "CreditStatus" AS ENUM ('AVAILABLE', 'USED', 'VOID');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // BulkOperationType enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "BulkOperationType" AS ENUM ('BULK_INVOICE', 'BULK_AFIP');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // BulkOperationStatus enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "BulkOperationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  private async createTables() {
    // Academy table
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Academy" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "status" "AcademyStatus" NOT NULL DEFAULT 'ACTIVE',
        "country" TEXT NOT NULL,
        "currency" TEXT NOT NULL,
        "timezone" TEXT NOT NULL,
        "email" TEXT,
        "phone" TEXT,
        "address" TEXT,
        "ownerUserId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Academy_pkey" PRIMARY KEY ("id")
      );
    `);

    // Academy slug unique index
    await this.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Academy_slug_key" ON "Academy"("slug");
    `);

    // User table
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "supabaseUserId" TEXT NOT NULL,
        "academyId" TEXT NOT NULL,
        "role" "UserRole" NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "User_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    // User indexes
    await this.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseUserId_key" ON "User"("supabaseUserId");
      CREATE INDEX IF NOT EXISTS "User_supabaseUserId_idx" ON "User"("supabaseUserId");
      CREATE INDEX IF NOT EXISTS "User_academyId_idx" ON "User"("academyId");
    `);

    // Student table
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Student" (
        "id" TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phoneNumber" TEXT,
        "status" "StudentStatus" NOT NULL DEFAULT 'ENABLED',
        "academyId" TEXT NOT NULL,
        "userId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Student_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Student_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Student indexes
    await this.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Student_email_key" ON "Student"("email");
      CREATE UNIQUE INDEX IF NOT EXISTS "Student_userId_key" ON "Student"("userId");
      CREATE INDEX IF NOT EXISTS "Student_academyId_idx" ON "Student"("academyId");
    `);

    // Fee table
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Fee" (
        "id" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "type" "FeeType" NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "cost" INTEGER NOT NULL,
        "occurrences" INTEGER,
        "period" "FeePeriod",
        "academyId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Fee_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Fee_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    // Fee indexes
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Fee_academyId_idx" ON "Fee"("academyId");
    `);

    // Charge table
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Charge" (
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
        CONSTRAINT "Charge_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Charge_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "Fee"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Charge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    // Charge unique constraint and indexes
    await this.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Charge_studentId_feeId_installmentNumber_key" 
      ON "Charge"("studentId", "feeId", "installmentNumber");
    `);
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Charge_studentId_idx" ON "Charge"("studentId");
    `);
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Charge_feeId_idx" ON "Charge"("feeId");
    `);
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Charge_periodMonth_idx" ON "Charge"("periodMonth");
    `);

    // Invoice table
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id" TEXT NOT NULL,
        "invoiceNumber" SERIAL NOT NULL,
        "studentId" TEXT,
        "recipientName" TEXT NOT NULL,
        "recipientEmail" TEXT,
        "recipientPhone" TEXT,
        "recipientAddress" TEXT,
        "academyId" TEXT NOT NULL,
        "issueDate" TIMESTAMP(3) NOT NULL,
        "dueDate" TIMESTAMP(3) NOT NULL,
        "publicNotes" TEXT,
        "privateNotes" TEXT,
        "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
        "subtotal" INTEGER NOT NULL,
        "totalDiscount" INTEGER NOT NULL,
        "total" INTEGER NOT NULL,
        "paidAmount" INTEGER NOT NULL DEFAULT 0,
        "balance" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "Invoice_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    // Invoice indexes
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Invoice_studentId_idx" ON "Invoice"("studentId");
      CREATE INDEX IF NOT EXISTS "Invoice_academyId_idx" ON "Invoice"("academyId");
      CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
    `);

    // InvoiceLine table
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InvoiceLine" (
        "id" TEXT NOT NULL,
        "invoiceId" TEXT NOT NULL,
        "type" "InvoiceLineType" NOT NULL DEFAULT 'CHARGE',
        "chargeId" TEXT,
        "description" TEXT NOT NULL,
        "originalAmount" INTEGER NOT NULL,
        "discountType" "DiscountType",
        "discountValue" INTEGER,
        "discountReason" TEXT,
        "finalAmount" INTEGER NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "InvoiceLine_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "Charge"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // InvoiceLine indexes
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");
    `);
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "InvoiceLine_chargeId_idx" ON "InvoiceLine"("chargeId");
    `);

    // Partial unique index for active charge lines
    await this.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_charge_invoiceline" 
      ON "InvoiceLine" ("chargeId") 
      WHERE "chargeId" IS NOT NULL AND "isActive" = true;
    `);

    // Payment table
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Payment" (
        "id" TEXT NOT NULL,
        "invoiceId" TEXT NOT NULL,
        "type" "PaymentType" NOT NULL DEFAULT 'PAYMENT',
        "amount" INTEGER NOT NULL,
        "method" "PaymentMethod" NOT NULL,
        "status" "PaymentStatus" NOT NULL DEFAULT 'APPROVED',
        "paidAt" TIMESTAMP(3) NOT NULL,
        "reference" TEXT,
        "voidReason" TEXT,
        "voidedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Payment indexes
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Payment_invoiceId_idx" ON "Payment"("invoiceId");
    `);
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Payment_paidAt_idx" ON "Payment"("paidAt");
    `);
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
    `);

    // StudentCredit table
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StudentCredit" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "amount" INTEGER NOT NULL,
        "availableAmount" INTEGER NOT NULL,
        "status" "CreditStatus" NOT NULL DEFAULT 'AVAILABLE',
        "sourcePaymentId" TEXT NOT NULL,
        "sourceInvoiceId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "StudentCredit_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "StudentCredit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "StudentCredit_sourcePaymentId_fkey" FOREIGN KEY ("sourcePaymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "StudentCredit_sourceInvoiceId_fkey" FOREIGN KEY ("sourceInvoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    // StudentCredit indexes
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "StudentCredit_studentId_idx" ON "StudentCredit"("studentId");
    `);
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "StudentCredit_status_idx" ON "StudentCredit"("status");
    `);
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "StudentCredit_sourcePaymentId_idx" ON "StudentCredit"("sourcePaymentId");
    `);
    await this.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "StudentCredit_sourcePaymentId_key" ON "StudentCredit"("sourcePaymentId");
    `);

    // BulkOperation table
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BulkOperation" (
        "id" TEXT NOT NULL,
        "type" "BulkOperationType" NOT NULL,
        "status" "BulkOperationStatus" NOT NULL DEFAULT 'PENDING',
        "academyId" TEXT NOT NULL,
        "totalItems" INTEGER NOT NULL,
        "completedItems" INTEGER NOT NULL DEFAULT 0,
        "failedItems" INTEGER NOT NULL DEFAULT 0,
        "skippedItems" INTEGER NOT NULL DEFAULT 0,
        "results" JSONB NOT NULL DEFAULT '[]',
        "params" JSONB NOT NULL,
        "triggerRunId" TEXT,
        "startedAt" TIMESTAMP(3),
        "completedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "BulkOperation_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "BulkOperation_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    // BulkOperation indexes
    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "BulkOperation_academyId_idx" ON "BulkOperation"("academyId");
      CREATE INDEX IF NOT EXISTS "BulkOperation_status_idx" ON "BulkOperation"("status");
    `);
  }

  /**
   * Limpia todas las tablas para tests
   */
  async cleanDatabase() {
    // Use a single TRUNCATE command with CASCADE to avoid deadlocks
    await this.$executeRawUnsafe(`
      TRUNCATE TABLE "BulkOperation", "StudentCredit", "Payment", "InvoiceLine", "Invoice", "Charge", "Fee", "Student", "User", "Academy" CASCADE;
    `);
  }
}

/**
 * Instancia singleton del TestPrismaService para reutilizar entre tests
 */
let testPrismaInstance: TestPrismaService | null = null;

/**
 * Obtiene o crea la instancia de TestPrismaService
 * Asegura el schema en la primera llamada
 */
export async function getTestPrismaService(): Promise<TestPrismaService> {
  if (!testPrismaInstance) {
    testPrismaInstance = new TestPrismaService();
    await testPrismaInstance.onModuleInit();
    await testPrismaInstance.ensureSchema();
  }
  return testPrismaInstance;
}

/**
 * Desconecta el cliente de Prisma de test
 * Llamar en afterAll del test suite principal
 */
export async function disconnectTestPrisma(): Promise<void> {
  if (testPrismaInstance) {
    await testPrismaInstance.$disconnect();
    testPrismaInstance = null;
  }
}
