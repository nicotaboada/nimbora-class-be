import { Injectable, BadRequestException } from "@nestjs/common";
import { parse } from "date-fns";
import { PrismaService } from "../prisma/prisma.service";
import { StudentsService } from "../students/students.service";
import { FeesService } from "../fees/fees.service";
import { AssignFeeInput } from "./dto/assign-fee.input";
import { ChargesForInvoiceInput } from "./dto/charges-for-invoice.input";
import {
  calculateChargeDates,
  mapChargeToEntity,
} from "./utils/charge-date-calculator";
import { ChargeStatus } from "@prisma/client";
import { Charge } from "./entities/charge.entity";
import { mapStudentToEntity } from "../students/utils/student-mapper.util";

@Injectable()
export class ChargesService {
  constructor(
    private prisma: PrismaService,
    private studentsService: StudentsService,
    private feesService: FeesService,
  ) {}

  /**
   * Asigna un fee a múltiples estudiantes, generando todos los cargos correspondientes.
   */
  async assignFeeToStudents(
    input: AssignFeeInput,
    academyId: string,
  ): Promise<{
    chargesCreated: number;
    charges: Charge[];
  }> {
    const { feeId, studentIds, startMonth } = input;

    // Ownership: validar que fee pertenece a la academy
    const fee = await this.feesService.findOne(feeId, academyId);

    // Integrity: validar que TODOS los students pertenecen a la academy con un solo query
    const prismaStudents = await this.prisma.student.findMany({
      where: {
        id: { in: studentIds },
        academyId,
      },
    });

    if (prismaStudents.length !== studentIds.length) {
      throw new BadRequestException(
        "Algunos estudiantes no pertenecen a esta academia",
      );
    }

    const students = prismaStudents.map((s) => mapStudentToEntity(s));

    const currentDate = new Date();
    const chargeDates = calculateChargeDates(fee, startMonth, currentDate);
    const chargesData = students.flatMap((student) =>
      chargeDates.map((chargeDate) => ({
        feeId: fee.id,
        studentId: student.id,
        amount: fee.cost,
        periodMonth: chargeDate.periodMonth,
        installmentNumber: chargeDate.installmentNumber,
        issueDate: chargeDate.issueDate,
        dueDate: chargeDate.dueDate,
        status: ChargeStatus.PENDING,
      })),
    );
    await this.prisma.charge.createMany({
      data: chargesData,
      skipDuplicates: true,
    });
    const createdCharges = await this.prisma.charge.findMany({
      where: {
        feeId: fee.id,
        studentId: { in: studentIds },
      },
      orderBy: [{ studentId: "asc" }, { installmentNumber: "asc" }],
    });
    return {
      chargesCreated: createdCharges.length,
      charges: createdCharges.map((charge) =>
        mapChargeToEntity(charge, currentDate),
      ),
    };
  }

  /**
   * Obtiene los IDs de estudiantes que ya tienen un fee asignado.
   */
  async findStudentIdsWithFee(
    feeId: string,
    academyId: string,
  ): Promise<string[]> {
    // Ownership: validar que fee pertenece a la academy
    await this.feesService.findOne(feeId, academyId);

    const charges = await this.prisma.charge.findMany({
      where: { feeId },
      select: { studentId: true },
      distinct: ["studentId"],
    });
    return charges.map((c) => c.studentId);
  }

  /**
   * Obtiene todos los cargos de un estudiante.
   */
  async findByStudent(studentId: string, academyId: string): Promise<Charge[]> {
    // Ownership: validar que student pertenece a la academy
    await this.studentsService.findOne(studentId, academyId);

    const charges = await this.prisma.charge.findMany({
      where: { studentId },
      orderBy: { issueDate: "asc" },
    });
    const currentDate = new Date();
    return charges.map((charge) => mapChargeToEntity(charge, currentDate));
  }

  /**
   * Obtiene los cargos de un estudiante para un mes de invoice.
   * Opcionalmente incluye cargos vencidos de meses anteriores.
   */
  async findChargesForInvoice(
    input: ChargesForInvoiceInput,
    academyId: string,
  ): Promise<{ charges: Charge[] }> {
    const { studentId, invoiceMonth, includePastDue } = input;

    // Ownership: validar que student pertenece a la academy
    await this.studentsService.findOne(studentId, academyId);

    const currentDate = new Date();
    const invoiceMonthStart = parse(invoiceMonth, "yyyy-MM", new Date());
    const currentMonthChargesRaw = await this.prisma.charge.findMany({
      where: {
        studentId,
        periodMonth: invoiceMonth,
        status: ChargeStatus.PENDING,
      },
      include: { fee: true },
      orderBy: { issueDate: "asc" },
    });
    const charges = currentMonthChargesRaw.map((charge) =>
      mapChargeToEntity(charge, currentDate),
    );
    if (includePastDue) {
      const pastDueChargesRaw = await this.prisma.charge.findMany({
        where: {
          studentId,
          status: ChargeStatus.PENDING,
          dueDate: { lt: invoiceMonthStart },
        },
        include: { fee: true },
        orderBy: { dueDate: "asc" },
      });
      const pastDueCharges = pastDueChargesRaw.map((charge) =>
        mapChargeToEntity(charge, currentDate),
      );
      charges.push(...pastDueCharges);
    }
    return { charges };
  }
}
