import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, BadRequestException } from "@nestjs/common";
import { FeesService } from "./fees.service";
import { ChargesService } from "../charges/charges.service";
import { StudentsService } from "../students/students.service";
import { PrismaService } from "../prisma/prisma.service";
import { FeeType, FeePeriod, ChargeStatus } from "@prisma/client";
import {
  TestPrismaService,
  getTestPrismaService,
  disconnectTestPrisma,
} from "../../test/test-database";
import { ChargeStartMonth } from "../charges/enums/charge-start-month.enum";

describe("FeesService (integration)", () => {
  let app: INestApplication;
  let feesService: FeesService;
  let chargesService: ChargesService;
  let prismaService: TestPrismaService;
  let testAcademyId: string;

  beforeAll(async () => {
    prismaService = await getTestPrismaService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        FeesService,
        ChargesService,
        StudentsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    feesService = moduleFixture.get<FeesService>(FeesService);
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

  describe("createOneOffFee", () => {
    it("should create a one-off fee with correct data in DB and return total equal to cost", async () => {
      const inputDescription = "Matrícula 2026";
      const inputStartDate = new Date("2026-01-15");
      const inputCost = 15_000;
      const result = await feesService.createOneOffFee(
        {
          description: inputDescription,
          startDate: inputStartDate,
          cost: inputCost,
        },
        testAcademyId,
      );
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.description).toBe(inputDescription);
      expect(result.startDate).toEqual(inputStartDate);
      expect(result.cost).toBe(inputCost);
      expect(result.type).toBe(FeeType.ONE_OFF);
      expect(result.occurrences).toBe(1);
      expect(result.period).toBeNull();
      expect(result.total).toBe(inputCost);
      const feeInDb = await prismaService.fee.findUnique({
        where: { id: result.id },
      });
      expect(feeInDb).toBeDefined();
      expect(feeInDb?.description).toBe(inputDescription);
      expect(feeInDb?.startDate).toEqual(inputStartDate);
      expect(feeInDb?.cost).toBe(inputCost);
      expect(feeInDb?.type).toBe(FeeType.ONE_OFF);
      expect(feeInDb?.occurrences).toBe(1);
      expect(feeInDb?.period).toBeNull();
    });
  });

  describe("createMonthlyFee", () => {
    it("should create a monthly fee with correct data in DB and return total = cost × occurrences", async () => {
      const inputDescription = "Mensualidad Curso Inglés";
      const inputStartDate = new Date("2026-01-11");
      const inputCost = 20_000;
      const inputOccurrences = 12;
      const expectedTotal = inputCost * inputOccurrences;
      const result = await feesService.createMonthlyFee(
        {
          description: inputDescription,
          startDate: inputStartDate,
          cost: inputCost,
          occurrences: inputOccurrences,
        },
        testAcademyId,
      );
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.description).toBe(inputDescription);
      expect(result.startDate).toEqual(inputStartDate);
      expect(result.cost).toBe(inputCost);
      expect(result.type).toBe(FeeType.MONTHLY);
      expect(result.occurrences).toBe(inputOccurrences);
      expect(result.period).toBeNull();
      expect(result.total).toBe(expectedTotal);
      const feeInDb = await prismaService.fee.findUnique({
        where: { id: result.id },
      });
      expect(feeInDb).toBeDefined();
      expect(feeInDb?.description).toBe(inputDescription);
      expect(feeInDb?.startDate).toEqual(inputStartDate);
      expect(feeInDb?.cost).toBe(inputCost);
      expect(feeInDb?.type).toBe(FeeType.MONTHLY);
      expect(feeInDb?.occurrences).toBe(inputOccurrences);
      expect(feeInDb?.period).toBeNull();
    });
  });

  describe("createPeriodicFee", () => {
    it("should create a periodic fee with correct data in DB and return total = cost × occurrences", async () => {
      const inputDescription = "Cuota Bimestral";
      const inputStartDate = new Date("2026-01-12");
      const inputCost = 50_000;
      const inputOccurrences = 6;
      const inputPeriod = FeePeriod.EVERY_2_MONTHS;
      const expectedTotal = inputCost * inputOccurrences;
      const result = await feesService.createPeriodicFee(
        {
          description: inputDescription,
          startDate: inputStartDate,
          cost: inputCost,
          occurrences: inputOccurrences,
          period: inputPeriod,
        },
        testAcademyId,
      );
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.description).toBe(inputDescription);
      expect(result.startDate).toEqual(inputStartDate);
      expect(result.cost).toBe(inputCost);
      expect(result.type).toBe(FeeType.PERIODIC);
      expect(result.occurrences).toBe(inputOccurrences);
      expect(result.period).toBe(inputPeriod);
      expect(result.total).toBe(expectedTotal);
      const feeInDb = await prismaService.fee.findUnique({
        where: { id: result.id },
      });
      expect(feeInDb).toBeDefined();
      expect(feeInDb?.description).toBe(inputDescription);
      expect(feeInDb?.startDate).toEqual(inputStartDate);
      expect(feeInDb?.cost).toBe(inputCost);
      expect(feeInDb?.type).toBe(FeeType.PERIODIC);
      expect(feeInDb?.occurrences).toBe(inputOccurrences);
      expect(feeInDb?.period).toBe(inputPeriod);
    });
  });

  describe("remove fee with charges", () => {
    it("should delete fee and all PENDING charges when all charges are PENDING", async () => {
      // Crear fee
      const fee = await feesService.createMonthlyFee(
        {
          description: "Fee para borrar",
          startDate: new Date("2026-01-15"),
          cost: 10_000,
          occurrences: 3,
        },
        testAcademyId,
      );

      // Crear estudiantes
      const student1 = await createTestStudent("student1@example.com");
      const student2 = await createTestStudent("student2@example.com");

      // Asignar fee a estudiantes
      await chargesService.assignFeeToStudents(
        {
          feeId: fee.id,
          studentIds: [student1.id, student2.id],
          startMonth: ChargeStartMonth.NEXT_MONTH,
        },
        testAcademyId,
      );

      // Verificar que se crearon 6 cargos (2 estudiantes × 3 cuotas)
      const chargesBeforeDelete = await prismaService.charge.findMany({
        where: { feeId: fee.id },
      });
      expect(chargesBeforeDelete).toHaveLength(6);

      // Borrar el fee
      const deletedFee = await feesService.remove(fee.id, testAcademyId);
      expect(deletedFee.id).toBe(fee.id);

      // Verificar que el fee fue borrado
      const feeInDb = await prismaService.fee.findUnique({
        where: { id: fee.id },
      });
      expect(feeInDb).toBeNull();

      // Verificar que todos los cargos fueron borrados
      const chargesAfterDelete = await prismaService.charge.findMany({
        where: { feeId: fee.id },
      });
      expect(chargesAfterDelete).toHaveLength(0);
    }, 15_000);

    it("should throw BadRequestException when trying to delete fee with INVOICED charges", async () => {
      // Crear fee
      const fee = await feesService.createMonthlyFee(
        {
          description: "Fee con cargos facturados",
          startDate: new Date("2026-01-15"),
          cost: 15_000,
          occurrences: 2,
        },
        testAcademyId,
      );

      // Crear estudiantes
      const student1 = await createTestStudent("student1@example.com");
      const student2 = await createTestStudent("student2@example.com");

      // Asignar fee a estudiantes
      await chargesService.assignFeeToStudents(
        {
          feeId: fee.id,
          studentIds: [student1.id, student2.id],
          startMonth: ChargeStartMonth.NEXT_MONTH,
        },
        testAcademyId,
      );

      // Hardcodear uno de los cargos a INVOICED
      const chargeToInvoice = await prismaService.charge.findFirst({
        where: { feeId: fee.id, studentId: student1.id },
      });
      await prismaService.charge.update({
        where: { id: chargeToInvoice.id },
        data: { status: ChargeStatus.INVOICED },
      });

      // Intentar borrar el fee - debe fallar
      await expect(feesService.remove(fee.id, testAcademyId)).rejects.toThrow(
        BadRequestException,
      );

      // Verificar que el fee sigue existiendo
      const feeInDb = await prismaService.fee.findUnique({
        where: { id: fee.id },
      });
      expect(feeInDb).toBeDefined();

      // Verificar que los cargos siguen existiendo
      const chargesInDb = await prismaService.charge.findMany({
        where: { feeId: fee.id },
      });
      expect(chargesInDb).toHaveLength(4); // 2 estudiantes × 2 cuotas
    }, 15_000);

    it("should update fee template without affecting already created charges", async () => {
      const originalCost = 20_000;
      const updatedCost = 25_000;

      // Crear fee
      const fee = await feesService.createMonthlyFee(
        {
          description: "Fee para editar",
          startDate: new Date("2026-01-15"),
          cost: originalCost,
          occurrences: 2,
        },
        testAcademyId,
      );

      // Crear estudiante y asignar fee
      const student = await createTestStudent();
      await chargesService.assignFeeToStudents(
        {
          feeId: fee.id,
          studentIds: [student.id],
          startMonth: ChargeStartMonth.NEXT_MONTH,
        },
        testAcademyId,
      );

      // Verificar que los cargos tienen el costo original
      const chargesBeforeUpdate = await prismaService.charge.findMany({
        where: { feeId: fee.id },
      });
      expect(chargesBeforeUpdate).toHaveLength(2);
      for (const charge of chargesBeforeUpdate) {
        expect(charge.amount).toBe(originalCost);
      }

      // Editar el fee (template)
      const updatedFee = await feesService.updateMonthlyFee(
        {
          id: fee.id,
          cost: updatedCost,
        },
        testAcademyId,
      );

      // Verificar que el fee template tiene el nuevo valor
      expect(updatedFee.cost).toBe(updatedCost);
      expect(updatedFee.total).toBe(updatedCost * 2); // cost × occurrences

      // Verificar que los cargos MANTIENEN el costo original (snapshot)
      const chargesAfterUpdate = await prismaService.charge.findMany({
        where: { feeId: fee.id },
      });
      expect(chargesAfterUpdate).toHaveLength(2);
      for (const charge of chargesAfterUpdate) {
        expect(charge.amount).toBe(originalCost); // No cambia
      }
    });
  });
});
