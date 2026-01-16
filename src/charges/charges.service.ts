import { Injectable, NotFoundException } from "@nestjs/common";
import { parse } from "date-fns";
import { PrismaService } from "../prisma/prisma.service";
import { AssignFeeInput } from "./dto/assign-fee.input";
import { ChargesForInvoiceInput } from "./dto/charges-for-invoice.input";
import {
  calculateChargeDates,
  mapChargeToEntity,
} from "./utils/charge-date-calculator";
import { ChargeStatus } from "@prisma/client";
import { Charge } from "./entities/charge.entity";

@Injectable()
export class ChargesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Asigna un fee a múltiples estudiantes, generando todos los cargos correspondientes.
   */
  async assignFeeToStudents(input: AssignFeeInput): Promise<{
    chargesCreated: number;
    charges: Charge[];
  }> {
    const { feeId, studentIds, startMonth } = input;
    const fee = await this.prisma.fee.findUnique({ where: { id: feeId } });
    if (!fee) {
      throw new NotFoundException(`Fee con ID ${feeId} no encontrado`);
    }
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
    });
    if (students.length !== studentIds.length) {
      const foundIds = new Set(students.map((s) => s.id));
      const missingIds = studentIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Estudiantes no encontrados: ${missingIds.join(", ")}`,
      );
    }
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
  async findStudentIdsWithFee(feeId: string): Promise<string[]> {
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
  async findByStudent(studentId: string): Promise<Charge[]> {
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
  ): Promise<{ charges: Charge[] }> {
    const { studentId, invoiceMonth, includePastDue } = input;
    const currentDate = new Date();
    const invoiceMonthStart = parse(invoiceMonth, "yyyy-MM", new Date());
    const currentMonthChargesRaw = await this.prisma.charge.findMany({
      where: {
        studentId,
        periodMonth: invoiceMonth,
        status: ChargeStatus.PENDING,
      },
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
