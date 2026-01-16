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
  }

  private async createEnums() {
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

    // ChargeStatus enum
    await this.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  private async createTables() {
    // Student table
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Student" (
        "id" TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phoneNumber" TEXT,
        "status" "StudentStatus" NOT NULL DEFAULT 'ENABLED',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
      );
    `);

    // Student email unique index
    await this.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Student_email_key" ON "Student"("email");
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
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Fee_pkey" PRIMARY KEY ("id")
      );
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
