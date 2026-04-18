import { Injectable, BadRequestException } from "@nestjs/common";
import { isBefore, parse } from "date-fns";
import { PrismaService } from "../prisma/prisma.service";
import { StudentsService } from "../students/students.service";
import { FeesService } from "../fees/fees.service";
import { AssignFeeInput } from "./dto/assign-fee.input";
import { ChargesForInvoiceInput } from "./dto/charges-for-invoice.input";
import { StudentFeeOverview } from "./dto/student-fee-overview.output";
import { StudentFeeOverviewFilter } from "./dto/student-fee-overview-filter.input";
import { StudentFeeDetail } from "./dto/student-fee-detail.output";
import { StudentChargesOverview } from "./dto/student-charges-overview.output";
import { UnassignFeeInput } from "./dto/unassign-fee.input";
import { UnassignFeeOutput } from "./dto/unassign-fee.output";
import { FeeInvoicingStatus } from "./enums/fee-invoicing-status.enum";
import {
  calculateChargeDates,
  mapChargeToEntity,
} from "./utils/charge-date-calculator";
import { ChargeStatus } from "@prisma/client";
import { FeeType } from "../fees/enums/fee-type.enum";
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

  /**
   * Obtiene los cargos de un estudiante agrupados por fee, con estados de facturación.
   * Excluye charges con status CANCELLED.
   *
   * Estados de cada cuota:
   * - Pendiente: PENDING con issueDate > hoy (futura, no requiere acción)
   * - A facturar: PENDING con issueDate <= hoy (requiere facturación)
   * - Facturado: INVOICED (o PAID)
   */
  async getStudentFeeOverviews(
    studentId: string,
    academyId: string,
    filter?: StudentFeeOverviewFilter,
  ): Promise<StudentFeeOverview[]> {
    await this.studentsService.findOne(studentId, academyId);
    const charges = await this.prisma.charge.findMany({
      where: {
        studentId,
        status: { not: ChargeStatus.CANCELLED },
      },
      include: { fee: true },
      orderBy: { installmentNumber: "asc" },
    });
    const currentDate = new Date();
    const grouped = new Map<
      string,
      {
        feeId: string;
        feeDescription: string;
        feeType: FeeType;
        totalAmount: number;
        chargeCount: number;
        pendingChargeCount: number;
        actionRequiredChargeCount: number;
        invoicedChargeCount: number;
        nextIssueDate: Date | undefined;
      }
    >();
    for (const charge of charges) {
      const existing = grouped.get(charge.feeId);
      const isInvoiced =
        charge.status === ChargeStatus.INVOICED ||
        charge.status === ChargeStatus.PAID;
      const isActionRequired =
        charge.status === ChargeStatus.PENDING &&
        !isBefore(currentDate, charge.issueDate);
      const isPending =
        charge.status === ChargeStatus.PENDING &&
        isBefore(currentDate, charge.issueDate);
      const pendingIssueDate = isPending ? charge.issueDate : undefined;
      if (existing) {
        existing.totalAmount += charge.amount;
        existing.chargeCount += 1;
        existing.pendingChargeCount += isPending ? 1 : 0;
        existing.actionRequiredChargeCount += isActionRequired ? 1 : 0;
        existing.invoicedChargeCount += isInvoiced ? 1 : 0;
        if (
          pendingIssueDate &&
          (!existing.nextIssueDate ||
            isBefore(pendingIssueDate, existing.nextIssueDate))
        ) {
          existing.nextIssueDate = pendingIssueDate;
        }
      } else {
        grouped.set(charge.feeId, {
          feeId: charge.feeId,
          feeDescription: charge.fee.description,
          feeType: charge.fee.type as FeeType,
          totalAmount: charge.amount,
          chargeCount: 1,
          pendingChargeCount: isPending ? 1 : 0,
          actionRequiredChargeCount: isActionRequired ? 1 : 0,
          invoicedChargeCount: isInvoiced ? 1 : 0,
          nextIssueDate: pendingIssueDate,
        });
      }
    }
    let overviews: StudentFeeOverview[] = [...grouped.values()].map(
      (group) => ({
        ...group,
        invoicingStatus: this.computeInvoicingStatus(
          group.invoicedChargeCount,
          group.chargeCount,
        ),
        hasChargesRequiringAction: group.actionRequiredChargeCount > 0,
      }),
    );
    if (filter) {
      overviews = this.applyOverviewFilter(overviews, filter);
    }
    return overviews;
  }

  /**
   * Obtiene el detalle de cuotas de un fee para un estudiante (slideout).
   */
  async getStudentFeeDetail(
    studentId: string,
    feeId: string,
    academyId: string,
  ): Promise<StudentFeeDetail> {
    await this.studentsService.findOne(studentId, academyId);
    await this.feesService.findOne(feeId, academyId);
    const chargesRaw = await this.prisma.charge.findMany({
      where: {
        studentId,
        feeId,
        status: { not: ChargeStatus.CANCELLED },
      },
      include: {
        fee: true,
        invoiceLines: {
          where: { isActive: true },
          select: { invoiceId: true },
          take: 1,
        },
      },
      orderBy: { installmentNumber: "asc" },
    });
    if (chargesRaw.length === 0) {
      throw new BadRequestException(
        "No se encontraron cuotas para este cargo y estudiante",
      );
    }
    const currentDate = new Date();
    const charges = chargesRaw.map((c) => mapChargeToEntity(c, currentDate));
    const fee = chargesRaw[0].fee;
    const totalAmount = chargesRaw.reduce((sum, c) => sum + c.amount, 0);
    const isInvoicedStatus = (status: ChargeStatus): boolean =>
      status === ChargeStatus.INVOICED || status === ChargeStatus.PAID;
    const invoicedAmount = chargesRaw
      .filter((c) => isInvoicedStatus(c.status))
      .reduce((sum, c) => sum + c.amount, 0);
    return {
      feeId: fee.id,
      feeDescription: fee.description,
      feeType: fee.type as StudentFeeDetail["feeType"],
      totalAmount,
      invoicedAmount,
      charges,
    };
  }

  /**
   * Obtiene el resumen financiero de un estudiante para la vista overview.
   * Retorna totales y los 3 cargos más relevantes de cada categoría.
   */
  async getStudentChargesOverview(
    studentId: string,
    academyId: string,
  ): Promise<StudentChargesOverview> {
    await this.studentsService.findOne(studentId, academyId);
    const chargesRaw = await this.prisma.charge.findMany({
      where: {
        studentId,
        status: { not: ChargeStatus.CANCELLED },
      },
      include: {
        fee: true,
        invoiceLines: {
          where: { isActive: true },
          select: { invoiceId: true },
          take: 1,
        },
      },
      orderBy: { dueDate: "asc" },
    });
    const currentDate = new Date();
    const requiresInvoicingRaw: typeof chargesRaw = [];
    const invoicedRaw: typeof chargesRaw = [];
    let requiresInvoicingTotal = 0;
    let invoicedTotal = 0;
    for (const charge of chargesRaw) {
      const isInvoiced =
        charge.status === ChargeStatus.INVOICED ||
        charge.status === ChargeStatus.PAID;
      const isRequiresInvoicing =
        charge.status === ChargeStatus.PENDING &&
        !isBefore(currentDate, charge.issueDate);
      if (isInvoiced) {
        invoicedTotal += charge.amount;
        invoicedRaw.push(charge);
      } else if (isRequiresInvoicing) {
        requiresInvoicingTotal += charge.amount;
        requiresInvoicingRaw.push(charge);
      }
    }
    const requiresInvoicingCharges = requiresInvoicingRaw
      .slice(0, 3)
      .map((c) => mapChargeToEntity(c, currentDate));
    const invoicedCharges: ReturnType<typeof mapChargeToEntity>[] = [];
    for (
      let i = invoicedRaw.length - 1;
      i >= 0 && invoicedCharges.length < 3;
      i--
    ) {
      invoicedCharges.push(mapChargeToEntity(invoicedRaw[i], currentDate));
    }
    return {
      requiresInvoicingTotal,
      invoicedTotal,
      totalAmount: requiresInvoicingTotal + invoicedTotal,
      requiresInvoicingCharges,
      invoicedCharges,
    };
  }

  /**
   * Desasigna un fee de un estudiante cancelando todas sus cuotas PENDING.
   * Rechaza si alguna cuota ya fue facturada o pagada.
   */
  async unassignFeeFromStudent(
    input: UnassignFeeInput,
    academyId: string,
  ): Promise<UnassignFeeOutput> {
    const { studentId, feeId } = input;
    await this.studentsService.findOne(studentId, academyId);
    await this.feesService.findOne(feeId, academyId);
    const charges = await this.prisma.charge.findMany({
      where: {
        studentId,
        feeId,
        status: { not: ChargeStatus.CANCELLED },
      },
      select: { id: true, status: true },
    });
    if (charges.length === 0) {
      throw new BadRequestException(
        "No se encontraron cuotas activas para este fee y estudiante",
      );
    }
    const hasInvoicedOrPaid = charges.some(
      (c) =>
        c.status === ChargeStatus.INVOICED || c.status === ChargeStatus.PAID,
    );
    if (hasInvoicedOrPaid) {
      throw new BadRequestException(
        "No se puede desasignar un fee que tiene cuotas facturadas o pagadas",
      );
    }
    const result = await this.prisma.charge.updateMany({
      where: {
        studentId,
        feeId,
        status: ChargeStatus.PENDING,
      },
      data: { status: ChargeStatus.CANCELLED },
    });
    return { cancelledCount: result.count };
  }

  /**
   * Calcula el estado de facturación basado en cantidad de cuotas facturadas vs total.
   */
  private computeInvoicingStatus(
    invoicedCount: number,
    totalCount: number,
  ): FeeInvoicingStatus {
    if (invoicedCount === 0) return FeeInvoicingStatus.NOT_INVOICED;
    if (invoicedCount >= totalCount) return FeeInvoicingStatus.FULLY_INVOICED;
    return FeeInvoicingStatus.PARTIALLY_INVOICED;
  }

  /**
   * Aplica filtros sobre los overviews ya computados.
   */
  private applyOverviewFilter(
    overviews: StudentFeeOverview[],
    filter: StudentFeeOverviewFilter,
  ): StudentFeeOverview[] {
    let result = overviews;
    if (filter.invoicingStatus !== undefined) {
      result = result.filter(
        (o) => o.invoicingStatus === filter.invoicingStatus,
      );
    }
    if (filter.hasChargesRequiringAction !== undefined) {
      result = result.filter(
        (o) => o.hasChargesRequiringAction === filter.hasChargesRequiringAction,
      );
    }
    return result;
  }
}
