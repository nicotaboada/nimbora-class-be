import { BulkOperationsService } from "./bulk-operations.service";
import {
  getTestPrismaService,
  disconnectTestPrisma,
  TestPrismaService,
} from "../../test/test-database";
import { PrismaService } from "../prisma/prisma.service";
import { AfipSettingsService } from "../afip/afip-settings.service";
import { FeatureFlagsService } from "../feature-flags/feature-flags.service";
import { ChargeStatus } from "@prisma/client";
import { BulkOperationStatus } from "./enums/bulk-operation-status.enum";
import { BulkOperationType } from "./enums/bulk-operation-type.enum";

jest.mock("@trigger.dev/sdk", () => ({
  tasks: {
    trigger: jest.fn().mockResolvedValue({ id: "mock-trigger-run-id" }),
  },
}));

describe("BulkOperationsService (Integration)", () => {
  let service: BulkOperationsService;
  let prisma: TestPrismaService;
  let testAcademyId: string;
  let otherAcademyId: string;
  let student1Id: string;
  let student2Id: string;
  let otherStudentId: string;
  let feeId: string;
  let c1Id: string;
  let c2Id: string;
  let c3Id: string;
  let c4Id: string;

  beforeAll(async () => {
    prisma = await getTestPrismaService();
    service = new BulkOperationsService(
      prisma as unknown as PrismaService,
      {} as unknown as AfipSettingsService,
      {} as unknown as FeatureFlagsService,
    );
  }, 30_000);

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE "BulkOperation", "InvoiceLine", "Invoice", "Charge", "Fee", "Student", "Academy" CASCADE
    `);

    const result = await prisma.$transaction(async (tx) => {
      const academy = await tx.academy.create({
        data: {
          name: "Test Academy",
          slug: "test-academy",
          country: "AR",
          currency: "ARS",
          timezone: "America/Argentina/Buenos_Aires",
          ownerUserId: "test-owner",
        },
      });

      const otherAcademy = await tx.academy.create({
        data: {
          name: "Other Academy",
          slug: "other-academy",
          country: "AR",
          currency: "ARS",
          timezone: "America/Argentina/Buenos_Aires",
          ownerUserId: "other-owner",
        },
      });

      const s1 = await tx.student.create({
        data: {
          firstName: "Juan",
          lastName: "Perez",
          email: `juan-${Date.now()}@test.com`,
          academyId: academy.id,
        },
      });

      const s2 = await tx.student.create({
        data: {
          firstName: "Maria",
          lastName: "Lopez",
          email: `maria-${Date.now()}@test.com`,
          academyId: academy.id,
        },
      });

      const otherS = await tx.student.create({
        data: {
          firstName: "Other",
          lastName: "Student",
          email: `other-${Date.now()}@test.com`,
          academyId: otherAcademy.id,
        },
      });

      const fee = await tx.fee.create({
        data: {
          description: "Cuota Mensual",
          type: "MONTHLY",
          startDate: new Date("2026-01-01"),
          cost: 10_000,
          academyId: academy.id,
        },
      });

      const c1 = await tx.charge.create({
        data: {
          feeId: fee.id,
          studentId: s1.id,
          amount: 10_000,
          periodMonth: "2026-01",
          installmentNumber: 1,
          issueDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-10"),
          status: ChargeStatus.PENDING,
        },
      });

      const c2 = await tx.charge.create({
        data: {
          feeId: fee.id,
          studentId: s1.id,
          amount: 10_000,
          periodMonth: "2026-02",
          installmentNumber: 2,
          issueDate: new Date("2026-02-01"),
          dueDate: new Date("2026-02-10"),
          status: ChargeStatus.PENDING,
        },
      });

      const c3 = await tx.charge.create({
        data: {
          feeId: fee.id,
          studentId: s2.id,
          amount: 10_000,
          periodMonth: "2026-01",
          installmentNumber: 1,
          issueDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-10"),
          status: ChargeStatus.PENDING,
        },
      });

      const c4 = await tx.charge.create({
        data: {
          feeId: fee.id,
          studentId: s2.id,
          amount: 10_000,
          periodMonth: "2026-02",
          installmentNumber: 2,
          issueDate: new Date("2026-02-01"),
          dueDate: new Date("2026-02-10"),
          status: ChargeStatus.INVOICED,
        },
      });

      return {
        academyId: academy.id,
        otherAcademyId: otherAcademy.id,
        student1Id: s1.id,
        student2Id: s2.id,
        otherStudentId: otherS.id,
        feeId: fee.id,
        c1Id: c1.id,
        c2Id: c2.id,
        c3Id: c3.id,
        c4Id: c4.id,
      };
    });

    testAcademyId = result.academyId;
    otherAcademyId = result.otherAcademyId;
    student1Id = result.student1Id;
    student2Id = result.student2Id;
    otherStudentId = result.otherStudentId;
    feeId = result.feeId;
    c1Id = result.c1Id;
    c2Id = result.c2Id;
    c3Id = result.c3Id;
    c4Id = result.c4Id;
  });

  // ========================================================================
  // HAPPY PATH
  // ========================================================================

  it("should create a BulkOperation and trigger the task", async () => {
    const input = {
      items: [
        { studentId: student1Id, chargeIds: [c1Id, c2Id] },
        { studentId: student2Id, chargeIds: [c3Id] },
      ],
      dueDate: new Date("2026-03-01"),
      notify: false,
    };

    const result = await service.bulkCreateInvoices(input, testAcademyId);

    expect(result.id).toBeDefined();
    expect(result.type).toBe(BulkOperationType.BULK_INVOICE);
    expect(result.status).toBe(BulkOperationStatus.PENDING);
    expect(result.totalItems).toBe(2);
    expect(result.completedItems).toBe(0);
    expect(result.failedItems).toBe(0);
    expect(result.skippedItems).toBe(0);

    const dbRecord = await prisma.bulkOperation.findUnique({
      where: { id: result.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord.triggerRunId).toBe("mock-trigger-run-id");
  });

  // ========================================================================
  // findById
  // ========================================================================

  it("should find a BulkOperation by ID", async () => {
    const input = {
      items: [{ studentId: student1Id, chargeIds: [c1Id] }],
      dueDate: new Date("2026-03-01"),
      notify: false,
    };

    const created = await service.bulkCreateInvoices(input, testAcademyId);
    const found = await service.findById(created.id, testAcademyId);

    expect(found.id).toBe(created.id);
    expect(found.totalItems).toBe(1);
  });

  it("should throw NotFoundException for wrong academy", async () => {
    const input = {
      items: [{ studentId: student1Id, chargeIds: [c1Id] }],
      dueDate: new Date("2026-03-01"),
      notify: false,
    };

    const created = await service.bulkCreateInvoices(input, testAcademyId);

    await expect(service.findById(created.id, otherAcademyId)).rejects.toThrow(
      "no encontrada",
    );
  });

  // ========================================================================
  // VALIDATION ERRORS
  // ========================================================================

  it("should reject duplicate student IDs", async () => {
    const input = {
      items: [
        { studentId: student1Id, chargeIds: [c1Id] },
        { studentId: student1Id, chargeIds: [c2Id] },
      ],
      dueDate: new Date("2026-03-01"),
      notify: false,
    };

    await expect(
      service.bulkCreateInvoices(input, testAcademyId),
    ).rejects.toThrow("duplicados");
  });

  it("should reject students from another academy", async () => {
    const input = {
      items: [{ studentId: otherStudentId, chargeIds: [c1Id] }],
      dueDate: new Date("2026-03-01"),
      notify: false,
    };

    await expect(
      service.bulkCreateInvoices(input, testAcademyId),
    ).rejects.toThrow("no pertenecen a la academia");
  });

  it("should reject duplicate charge IDs across items", async () => {
    const input = {
      items: [
        { studentId: student1Id, chargeIds: [c1Id] },
        { studentId: student2Id, chargeIds: [c1Id] },
      ],
      dueDate: new Date("2026-03-01"),
      notify: false,
    };

    await expect(
      service.bulkCreateInvoices(input, testAcademyId),
    ).rejects.toThrow("duplicados");
  });

  it("should reject charges that are not PENDING", async () => {
    const input = {
      items: [{ studentId: student2Id, chargeIds: [c4Id] }],
      dueDate: new Date("2026-03-01"),
      notify: false,
    };

    await expect(
      service.bulkCreateInvoices(input, testAcademyId),
    ).rejects.toThrow("no está disponible");
  });

  it("should reject charges that don't belong to the student", async () => {
    const input = {
      items: [{ studentId: student2Id, chargeIds: [c1Id] }],
      dueDate: new Date("2026-03-01"),
      notify: false,
    };

    await expect(
      service.bulkCreateInvoices(input, testAcademyId),
    ).rejects.toThrow("no pertenece al estudiante");
  });

  it("should reject non-existent charge IDs", async () => {
    const input = {
      items: [
        {
          studentId: student1Id,
          chargeIds: ["00000000-0000-0000-0000-000000000000"],
        },
      ],
      dueDate: new Date("2026-03-01"),
      notify: false,
    };

    await expect(
      service.bulkCreateInvoices(input, testAcademyId),
    ).rejects.toThrow("no encontrados");
  });
});
