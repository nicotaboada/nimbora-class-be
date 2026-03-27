import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { ChargesService } from "./charges.service";
import { StudentsService } from "../students/students.service";
import { FeesService } from "../fees/fees.service";
import { PrismaService } from "../prisma/prisma.service";
import { FeeType, FeePeriod, ChargeStatus } from "@prisma/client";
import {
  TestPrismaService,
  getTestPrismaService,
  disconnectTestPrisma,
} from "../../test/test-database";
import { ChargeStartMonth } from "./enums/charge-start-month.enum";
import { CHARGE_DAY_OF_MONTH, GRACE_DAYS } from "./constants/billing.constants";
import { isChargeOverdue } from "./utils/charge-date-calculator";
import { addMonths, format, setDate } from "date-fns";

describe("ChargesService (integration)", () => {
  let app: INestApplication;
  let chargesService: ChargesService;
  let prismaService: TestPrismaService;
  let testAcademyId: string;

  beforeAll(async () => {
    prismaService = await getTestPrismaService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ChargesService,
        StudentsService,
        FeesService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    chargesService = moduleFixture.get<ChargesService>(ChargesService);
  }, 30_000);

  afterAll(async () => {
    await app?.close();
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await prismaService.charge.deleteMany();
    await prismaService.fee.deleteMany();
    await prismaService.student.deleteMany();
    await prismaService.academy.deleteMany();

    // Crear Academy para tests
    const academy = await prismaService.academy.create({
      data: {
        name: "Test Academy",
        slug: "test-academy",
        country: "AR",
        currency: "ARS",
        timezone: "America/Argentina/Buenos_Aires",
        ownerUserId: "test-owner",
      },
    });
    testAcademyId = academy.id;
  });

  /**
   * Helper para crear un estudiante de prueba
   */
  async function createTestStudent(email: string = "test@example.com") {
    return prismaService.student.create({
      data: {
        firstName: "Test",
        lastName: "Student",
        email,
        academyId: testAcademyId,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Helper para crear un fee de prueba
   */
  async function createTestFee(
    overrides: Partial<{
      type: FeeType;
      cost: number;
      occurrences: number;
      period: FeePeriod;
    }> = {},
  ) {
    return prismaService.fee.create({
      data: {
        description: "Test Fee",
        type: overrides.type ?? FeeType.ONE_OFF,
        startDate: new Date("2026-01-15"),
        cost: overrides.cost ?? 10_000,
        occurrences: overrides.occurrences ?? 1,
        period: overrides.period ?? null,
        academyId: testAcademyId,
        updatedAt: new Date(),
      },
    });
  }

  describe("assignFeeToStudents - ONE_OFF", () => {
    it("should create a single charge for ONE_OFF fee with NEXT_MONTH start", async () => {
      const student = await createTestStudent();
      const fee = await createTestFee({ type: FeeType.ONE_OFF, cost: 15_000 });

      const result = await chargesService.assignFeeToStudents(
        {
          feeId: fee.id,
          studentIds: [student.id],
          startMonth: ChargeStartMonth.NEXT_MONTH,
        },
        testAcademyId,
      );

      expect(result.chargesCreated).toBe(1);
      expect(result.charges).toHaveLength(1);

      const charge = result.charges[0];
      expect(charge.feeId).toBe(fee.id);
      expect(charge.studentId).toBe(student.id);
      expect(charge.amount).toBe(15_000);
      expect(charge.installmentNumber).toBe(1);
      expect(charge.status).toBe(ChargeStatus.PENDING);
    });

    it("should create a charge marked as overdue when CURRENT_MONTH and dueDate < today", async () => {
      const student = await createTestStudent();
      const fee = await createTestFee({ type: FeeType.ONE_OFF, cost: 10_000 });

      const result = await chargesService.assignFeeToStudents(
        {
          feeId: fee.id,
          studentIds: [student.id],
          startMonth: ChargeStartMonth.CURRENT_MONTH,
        },
        testAcademyId,
      );

      expect(result.chargesCreated).toBe(1);
      const charge = result.charges[0];
      expect(charge.status).toBe(ChargeStatus.PENDING);
      expect(charge.issueDate).toBeDefined();
      expect(charge.dueDate).toBeDefined();
      const expectedOverdue = isChargeOverdue(
        charge.dueDate,
        charge.status,
        new Date(),
      );
      expect(charge.isOverdue).toBe(expectedOverdue);
    });
  });

  describe("assignFeeToStudents - MONTHLY", () => {
    it("should create N charges for MONTHLY fee (one per month)", async () => {
      const student = await createTestStudent();
      const fee = await createTestFee({
        type: FeeType.MONTHLY,
        cost: 20_000,
        occurrences: 3,
      });

      const result = await chargesService.assignFeeToStudents(
        {
          feeId: fee.id,
          studentIds: [student.id],
          startMonth: ChargeStartMonth.NEXT_MONTH,
        },
        testAcademyId,
      );

      expect(result.chargesCreated).toBe(3);
      expect(result.charges).toHaveLength(3);

      // Verificar que cada cargo tiene el installmentNumber correcto
      const installments = result.charges.map((c) => c.installmentNumber);
      expect(installments).toEqual([1, 2, 3]);

      // Verificar que los montos son correctos (snapshot de Fee.cost)
      for (const charge of result.charges) {
        expect(charge.amount).toBe(20_000);
      }

      // Verificar que las fechas de cobro arrancan desde el próximo mes
      const today = new Date();
      const nextMonthStart = setDate(addMonths(today, 1), CHARGE_DAY_OF_MONTH);
      const expectedPeriodMonths = [
        format(nextMonthStart, "yyyy-MM"),
        format(addMonths(nextMonthStart, 1), "yyyy-MM"),
        format(addMonths(nextMonthStart, 2), "yyyy-MM"),
      ];
      const actualPeriodMonths = result.charges.map((c) => c.periodMonth);
      expect(actualPeriodMonths).toEqual(expectedPeriodMonths);

      // Verificar que el issueDate del primer cargo es el día correcto del próximo mes
      const firstCharge = result.charges[0];
      expect(firstCharge.issueDate.getDate()).toBe(CHARGE_DAY_OF_MONTH);
      expect(firstCharge.issueDate.getMonth()).toBe(nextMonthStart.getMonth());
    });

    it("should create charges for multiple students", async () => {
      const student1 = await createTestStudent("student1@example.com");
      const student2 = await createTestStudent("student2@example.com");
      const fee = await createTestFee({
        type: FeeType.MONTHLY,
        cost: 10_000,
        occurrences: 2,
      });

      const result = await chargesService.assignFeeToStudents(
        {
          feeId: fee.id,
          studentIds: [student1.id, student2.id],
          startMonth: ChargeStartMonth.NEXT_MONTH,
        },
        testAcademyId,
      );

      // 2 estudiantes × 2 cuotas = 4 cargos
      expect(result.chargesCreated).toBe(4);
      expect(result.charges).toHaveLength(4);

      // Verificar que cada estudiante tiene 2 cargos
      const student1Charges = result.charges.filter(
        (c) => c.studentId === student1.id,
      );
      const student2Charges = result.charges.filter(
        (c) => c.studentId === student2.id,
      );
      expect(student1Charges).toHaveLength(2);
      expect(student2Charges).toHaveLength(2);
    });
  });

  describe("assignFeeToStudents - PERIODIC", () => {
    it("should create weekly charges (4 per month) for EVERY_WEEK period", async () => {
      const student = await createTestStudent();
      const fee = await createTestFee({
        type: FeeType.PERIODIC,
        cost: 5000,
        occurrences: 4,
        period: FeePeriod.EVERY_WEEK,
      });

      const result = await chargesService.assignFeeToStudents(
        {
          feeId: fee.id,
          studentIds: [student.id],
          startMonth: ChargeStartMonth.NEXT_MONTH,
        },
        testAcademyId,
      );

      expect(result.chargesCreated).toBe(4);

      // Verificar que los días de los cargos son 1, 8, 15, 22
      const issueDays = result.charges.map((c) => c.issueDate.getDate());
      expect(issueDays).toEqual([1, 8, 15, 22]);

      // Verificar que todos los cargos pertenecen al próximo mes
      const today = new Date();
      const nextMonth = addMonths(today, 1);
      const expectedPeriodMonth = format(nextMonth, "yyyy-MM");
      for (const charge of result.charges) {
        expect(charge.periodMonth).toBe(expectedPeriodMonth);
        expect(charge.issueDate.getMonth()).toBe(nextMonth.getMonth());
      }
    });

    it("should create biweekly charges for TWICE_A_MONTH period", async () => {
      const student = await createTestStudent();
      const fee = await createTestFee({
        type: FeeType.PERIODIC,
        cost: 7500,
        occurrences: 4,
        period: FeePeriod.TWICE_A_MONTH,
      });

      const result = await chargesService.assignFeeToStudents(
        {
          feeId: fee.id,
          studentIds: [student.id],
          startMonth: ChargeStartMonth.NEXT_MONTH,
        },
        testAcademyId,
      );

      expect(result.chargesCreated).toBe(4);

      // Verificar que los días son 1, 15, 1, 15 (alternando en meses consecutivos)
      const issueDays = result.charges.map((c) => c.issueDate.getDate());
      expect(issueDays).toEqual([1, 15, 1, 15]);

      // Verificar que los cargos están en los meses correctos (2 por mes)
      const today = new Date();
      const nextMonth = addMonths(today, 1);
      const monthAfter = addMonths(today, 2);
      const expectedPeriodMonths = [
        format(nextMonth, "yyyy-MM"),
        format(nextMonth, "yyyy-MM"),
        format(monthAfter, "yyyy-MM"),
        format(monthAfter, "yyyy-MM"),
      ];
      const actualPeriodMonths = result.charges.map((c) => c.periodMonth);
      expect(actualPeriodMonths).toEqual(expectedPeriodMonths);
    });

    it("should create charges every 2 months for EVERY_2_MONTHS period", async () => {
      const student = await createTestStudent();
      const fee = await createTestFee({
        type: FeeType.PERIODIC,
        cost: 90_800,
        occurrences: 26,
        period: FeePeriod.EVERY_2_MONTHS,
      });

      const result = await chargesService.assignFeeToStudents(
        {
          feeId: fee.id,
          studentIds: [student.id],
          startMonth: ChargeStartMonth.NEXT_MONTH,
        },
        testAcademyId,
      );

      expect(result.chargesCreated).toBe(26);

      // Verificar que los meses son alternados (cada 2 meses)
      const months = result.charges.map((c) => c.issueDate.getMonth());
      // Los meses deben incrementar de 2 en 2
      for (let i = 1; i < months.length; i++) {
        const diff = (months[i] - months[i - 1] + 12) % 12;
        expect(diff).toBe(2);
      }
    });
  });

  describe("assignFeeToStudents - ChargeStartMonth options", () => {
    it("should start charges from a specific month (JUNE)", async () => {
      const student = await createTestStudent();
      const fee = await createTestFee({
        type: FeeType.MONTHLY,
        cost: 10_000,
        occurrences: 2,
      });

      const result = await chargesService.assignFeeToStudents(
        {
          feeId: fee.id,
          studentIds: [student.id],
          startMonth: ChargeStartMonth.JUNE,
        },
        testAcademyId,
      );

      expect(result.chargesCreated).toBe(2);

      // El primer cargo debe ser en junio (mes 5 en 0-indexed)
      const firstChargeMonth = result.charges[0].issueDate.getMonth();
      expect(firstChargeMonth).toBe(5); // Junio
    });
  });

  describe("assignFeeToStudents - multiple fees per student", () => {
    it("should assign multiple fees of different types to the same student", async () => {
      const student = await createTestStudent();

      // Fee 1: ONE_OFF (inscripción)
      const enrollmentFee = await createTestFee({
        type: FeeType.ONE_OFF,
        cost: 50_000,
      });

      // Fee 2: MONTHLY (cuota mensual)
      const monthlyFee = await createTestFee({
        type: FeeType.MONTHLY,
        cost: 20_000,
        occurrences: 3,
      });

      // Fee 3: PERIODIC semanal (clases particulares)
      const weeklyFee = await createTestFee({
        type: FeeType.PERIODIC,
        cost: 5000,
        occurrences: 4,
        period: FeePeriod.EVERY_WEEK,
      });

      // Asignar los 3 fees al mismo estudiante
      const result1 = await chargesService.assignFeeToStudents(
        {
          feeId: enrollmentFee.id,
          studentIds: [student.id],
          startMonth: ChargeStartMonth.CURRENT_MONTH,
        },
        testAcademyId,
      );

      const result2 = await chargesService.assignFeeToStudents(
        {
          feeId: monthlyFee.id,
          studentIds: [student.id],
          startMonth: ChargeStartMonth.NEXT_MONTH,
        },
        testAcademyId,
      );

      const result3 = await chargesService.assignFeeToStudents(
        {
          feeId: weeklyFee.id,
          studentIds: [student.id],
          startMonth: ChargeStartMonth.NEXT_MONTH,
        },
        testAcademyId,
      );

      // Verificar cantidad de cargos por fee
      expect(result1.chargesCreated).toBe(1); // ONE_OFF
      expect(result2.chargesCreated).toBe(3); // MONTHLY x3
      expect(result3.chargesCreated).toBe(4); // WEEKLY x4

      // Verificar montos
      expect(result1.charges[0].amount).toBe(50_000);
      for (const charge of result2.charges) {
        expect(charge.amount).toBe(20_000);
      }
      for (const charge of result3.charges) {
        expect(charge.amount).toBe(5000);
      }

      // Verificar que todos los cargos pertenecen al estudiante
      const allCharges = await prismaService.charge.findMany({
        where: { studentId: student.id },
      });
      expect(allCharges).toHaveLength(8); // 1 + 3 + 4

      // Verificar que cada fee tiene sus cargos correctos
      const chargesByFee = {
        enrollment: allCharges.filter((c) => c.feeId === enrollmentFee.id),
        monthly: allCharges.filter((c) => c.feeId === monthlyFee.id),
        weekly: allCharges.filter((c) => c.feeId === weeklyFee.id),
      };
      expect(chargesByFee.enrollment).toHaveLength(1);
      expect(chargesByFee.monthly).toHaveLength(3);
      expect(chargesByFee.weekly).toHaveLength(4);
    }, 15_000);
  });

  describe("assignFeeToStudents - dueDate calculation", () => {
    it("should calculate dueDate as issueDate + graceDays", async () => {
      const student = await createTestStudent();
      const fee = await createTestFee({ type: FeeType.ONE_OFF });

      const result = await chargesService.assignFeeToStudents(
        {
          feeId: fee.id,
          studentIds: [student.id],
          startMonth: ChargeStartMonth.NEXT_MONTH,
        },
        testAcademyId,
      );

      const charge = result.charges[0];
      const expectedDueDate = new Date(charge.issueDate);
      expectedDueDate.setDate(expectedDueDate.getDate() + GRACE_DAYS);

      expect(charge.dueDate.getDate()).toBe(expectedDueDate.getDate());
      expect(charge.dueDate.getMonth()).toBe(expectedDueDate.getMonth());
    });
  });

  describe("error handling", () => {
    it("should throw NotFoundException for non-existent fee", async () => {
      const student = await createTestStudent();

      await expect(
        chargesService.assignFeeToStudents(
          {
            feeId: "non-existent-id",
            studentIds: [student.id],
            startMonth: ChargeStartMonth.NEXT_MONTH,
          },
          testAcademyId,
        ),
      ).rejects.toThrow("Fee con ID non-existent-id no encontrado");
    });

    it("should throw NotFoundException for non-existent student", async () => {
      const fee = await createTestFee();

      await expect(
        chargesService.assignFeeToStudents(
          {
            feeId: fee.id,
            studentIds: ["non-existent-id"],
            startMonth: ChargeStartMonth.NEXT_MONTH,
          },
          testAcademyId,
        ),
      ).rejects.toThrow("Estudiantes no encontrados: non-existent-id");
    });
  });
});
