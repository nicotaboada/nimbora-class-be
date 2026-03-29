import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { tasks } from "@trigger.dev/sdk";
import { PrismaService } from "../prisma/prisma.service";
import { BulkCreateInvoicesInput } from "./dto/bulk-create-invoices.input";
import { BulkCreateAfipInvoicesInput } from "./dto/bulk-create-afip-invoices.input";
import { StudentsForBulkInvoiceInput } from "./dto/students-for-bulk-invoice.input";
import { InvoicesForBulkAfipInput } from "./dto/invoices-for-bulk-afip.input";
import { BulkOperation } from "./entities/bulk-operation.entity";
import { BulkOperationResult } from "./entities/bulk-operation-result.entity";
import { StudentBulkInvoicePreview } from "./entities/student-bulk-invoice-preview.entity";
import { InvoiceBulkAfipPreview } from "./entities/invoice-bulk-afip-preview.entity";
import { AfipBulkSummary, AfipCbteBreakdown } from "./entities/afip-bulk-summary.entity";
import { PaginatedStudentsForBulkInvoice } from "./dto/paginated-students-for-bulk-invoice.output";
import { PaginatedInvoicesForBulkAfip } from "./dto/paginated-invoices-for-bulk-afip.output";
import { BulkOperationType } from "./enums/bulk-operation-type.enum";
import { BulkOperationStatus } from "./enums/bulk-operation-status.enum";
import {
  ChargeStatus,
  InvoiceStatus,
  Prisma,
  BillingTaxCondition,
} from "@prisma/client";
import {
  resolveCbteTipo,
  CBTE_TIPO_LABELS,
} from "../afip/utils/resolve-cbte-tipo";
import { AfipSettingsService } from "../afip/afip-settings.service";
import { FeatureFlagsService } from "../feature-flags/feature-flags.service";
import type { bulkCreateInvoicesTask } from "../trigger/bulk-create-invoices";
import type { bulkCreateAfipInvoicesTask } from "../trigger/bulk-create-afip-invoices";

@Injectable()
export class BulkOperationsService {
  constructor(
    private prisma: PrismaService,
    private afipSettingsService: AfipSettingsService,
    private featureFlagsService: FeatureFlagsService,
  ) {}

  /**
   * Valida el input, crea un BulkOperation en PENDING, y dispara el task en background.
   */
  async bulkCreateInvoices(
    input: BulkCreateInvoicesInput,
    academyId: string,
  ): Promise<BulkOperation> {
    const { items, dueDate, notify } = input;

    const studentIds = items.map((item) => item.studentId);
    const allChargeIds = items.flatMap((item) => item.chargeIds);

    await this.validateStudentsOwnership(studentIds, academyId);
    await this.validateChargesAvailability(allChargeIds, items);

    const operation = await this.prisma.bulkOperation.create({
      data: {
        type: BulkOperationType.BULK_INVOICE,
        status: BulkOperationStatus.PENDING,
        academyId,
        totalItems: items.length,
        params: JSON.parse(
          JSON.stringify({ items, dueDate: dueDate.toISOString() }),
        ),
        results: [],
      },
    });

    const handle = await tasks.trigger<typeof bulkCreateInvoicesTask>(
      "bulk-create-invoices",
      {
        operationId: operation.id,
        items: items.map((item) => ({
          studentId: item.studentId,
          chargeIds: item.chargeIds,
        })),
        dueDate: dueDate.toISOString(),
        academyId,
        notify,
      },
    );

    await this.prisma.bulkOperation.update({
      where: { id: operation.id },
      data: { triggerRunId: handle.id },
    });

    return this.mapToEntity(operation);
  }

  /**
   * Obtiene el estado actual de una operación bulk.
   */
  async findById(
    operationId: string,
    academyId: string,
  ): Promise<BulkOperation> {
    const operation = await this.prisma.bulkOperation.findUnique({
      where: { id: operationId },
    });

    if (!operation) {
      throw new NotFoundException(`Operación ${operationId} no encontrada`);
    }

    if (operation.academyId !== academyId) {
      throw new NotFoundException(`Operación ${operationId} no encontrada`);
    }

    return this.mapToEntity(operation);
  }

  /**
   * Retorna estudiantes paginados con sus charges PENDING agregados para un periodo.
   * Solo incluye estudiantes que tengan al menos 1 charge PENDING que matchee.
   */
  async findStudentsForBulkInvoice(
    input: StudentsForBulkInvoiceInput,
    academyId: string,
    pageInput = 1,
    limitInput = 10,
  ): Promise<PaginatedStudentsForBulkInvoice> {
    const { period, includePastDue, search } = input;
    const page = Math.max(1, pageInput);
    const limit = Math.min(Math.max(1, limitInput), 100);
    const skip = (page - 1) * limit;

    const chargesFilter: Prisma.ChargeWhereInput = {
      status: ChargeStatus.PENDING,
      periodMonth: includePastDue ? { lte: period } : period,
    };

    const studentWhere: Prisma.StudentWhereInput = {
      academyId,
      charges: { some: chargesFilter },
    };

    if (search) {
      studentWhere.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, students] = await Promise.all([
      this.prisma.student.count({ where: studentWhere }),
      this.prisma.student.findMany({
        where: studentWhere,
        include: {
          charges: {
            where: chargesFilter,
            select: { id: true, amount: true },
          },
        },
        orderBy: { firstName: "asc" },
        skip,
        take: limit,
      }),
    ]);

    const data: StudentBulkInvoicePreview[] = students.map((student) => ({
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      chargeCount: student.charges.length,
      totalAmount: student.charges.reduce((sum, c) => sum + c.amount, 0),
      chargeIds: student.charges.map((c) => c.id),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ─── AFIP Bulk Methods ─────────────────────────────────────────────────────

  /**
   * Lista facturas internas PAID elegibles para emisión AFIP.
   * Excluye facturas que ya tienen un AfipInvoice EMITTED.
   * Incluye facturas con AfipInvoice ERROR (para reintentar).
   */
  async findInvoicesForBulkAfip(
    input: InvoicesForBulkAfipInput,
    academyId: string,
    pageInput = 1,
    limitInput = 10,
  ): Promise<PaginatedInvoicesForBulkAfip> {
    const page = Math.max(1, pageInput);
    const limit = Math.min(Math.max(1, limitInput), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      academyId,
      status: InvoiceStatus.PAID,
      OR: [
        { afip: null },
        { afip: { status: { not: "EMITTED" } } },
      ],
    };

    if (input.period) {
      const [year, month] = input.period.split("-").map(Number);
      const to = new Date(year, month, 1); // first day of next month
      if (input.includePastDue) {
        // Accumulated: everything up to and including the selected month
        where.issueDate = { lt: to };
      } else {
        // Exact month only
        const from = new Date(year, month - 1, 1);
        where.issueDate = { gte: from, lt: to };
      }
    }

    if (input.search) {
      where.recipientName = { contains: input.search, mode: "insensitive" };
    }

    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: { billingProfile: true },
        orderBy: { issueDate: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const data: InvoiceBulkAfipPreview[] = invoices.map((inv) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      studentName: inv.recipientName,
      status: inv.status,
      total: inv.total,
      billingDisplayName: inv.billingProfile?.displayName ?? null,
      billingDocType: inv.billingProfile?.docType ?? "CONSUMIDOR_FINAL",
      billingDocNumber: inv.billingProfile?.docNumber ?? null,
      billingTaxCondition:
        inv.billingProfile?.taxCondition ?? "CONSUMIDOR_FINAL",
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Calcula el resumen de emisión AFIP para las facturas seleccionadas.
   * Resuelve cbteTipo por factura y agrupa.
   */
  async getAfipBulkSummary(
    invoiceIds: string[],
    academyId: string,
  ): Promise<AfipBulkSummary> {
    await this.featureFlagsService.assertFeatureEnabled(academyId, "AFIP");

    const settings = await this.afipSettingsService.getSettings(academyId);
    if (!settings) {
      throw new BadRequestException("La academia no tiene configuración AFIP");
    }

    const invoices = await this.prisma.invoice.findMany({
      where: { id: { in: invoiceIds }, academyId },
      include: { billingProfile: true },
    });

    const breakdownMap = new Map<number, { count: number; amount: number }>();

    for (const inv of invoices) {
      const recipientCondition =
        inv.billingProfile?.taxCondition ?? BillingTaxCondition.CONSUMIDOR_FINAL;
      const cbteTipo = resolveCbteTipo(settings.taxStatus, recipientCondition);

      const existing = breakdownMap.get(cbteTipo) ?? { count: 0, amount: 0 };
      existing.count++;
      existing.amount += inv.total;
      breakdownMap.set(cbteTipo, existing);
    }

    const breakdown: AfipCbteBreakdown[] = Array.from(
      breakdownMap.entries(),
    ).map(([cbteTipo, data]) => ({
      cbteTipo,
      label: CBTE_TIPO_LABELS[cbteTipo] ?? `Tipo ${cbteTipo}`,
      count: data.count,
      amount: data.amount,
    }));

    return {
      totalCount: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
      breakdown,
    };
  }

  /**
   * Crea una operación BULK_AFIP y dispara el task de Trigger.dev.
   */
  async bulkCreateAfipInvoices(
    input: BulkCreateAfipInvoicesInput,
    academyId: string,
  ): Promise<BulkOperation> {
    const { invoiceIds, ptoVta, cbteFch } = input;

    await this.featureFlagsService.assertFeatureEnabled(academyId, "AFIP");

    // Validate all invoices belong to academy, are PAID, and not already EMITTED
    const invoices = await this.prisma.invoice.findMany({
      where: { id: { in: invoiceIds }, academyId },
      include: { afip: true },
    });

    if (invoices.length !== invoiceIds.length) {
      throw new BadRequestException(
        "Algunas facturas no existen o no pertenecen a la academia",
      );
    }

    for (const inv of invoices) {
      if (inv.status !== InvoiceStatus.PAID) {
        throw new BadRequestException(
          `La factura #${inv.invoiceNumber} no está pagada (status: ${inv.status})`,
        );
      }
      if (inv.afip?.status === "EMITTED") {
        throw new BadRequestException(
          `La factura #${inv.invoiceNumber} ya fue emitida en AFIP`,
        );
      }
    }

    // Validate sales point
    const salesPoint = await this.prisma.afipSalesPoint.findFirst({
      where: {
        afipSettings: { academyId },
        number: ptoVta,
        isActive: true,
      },
    });

    if (!salesPoint) {
      throw new BadRequestException(
        `El punto de venta ${ptoVta} no está activo`,
      );
    }

    const operation = await this.prisma.bulkOperation.create({
      data: {
        type: BulkOperationType.BULK_AFIP,
        status: BulkOperationStatus.PENDING,
        academyId,
        totalItems: invoiceIds.length,
        params: JSON.parse(
          JSON.stringify({ invoiceIds, ptoVta, cbteFch: cbteFch.toISOString() }),
        ),
        results: [],
      },
    });

    const handle = await tasks.trigger<typeof bulkCreateAfipInvoicesTask>(
      "bulk-create-afip-invoices",
      {
        operationId: operation.id,
        invoiceIds,
        ptoVta,
        cbteFch: cbteFch.toISOString(),
        academyId,
      },
    );

    await this.prisma.bulkOperation.update({
      where: { id: operation.id },
      data: { triggerRunId: handle.id },
    });

    return this.mapToEntity(operation);
  }

  // ─── Validation Helpers ───────────────────────────────────────────────────

  /**
   * Valida que todos los students pertenezcan a la academy.
   */
  private async validateStudentsOwnership(
    studentIds: string[],
    academyId: string,
  ): Promise<void> {
    const uniqueIds = [...new Set(studentIds)];

    if (uniqueIds.length !== studentIds.length) {
      throw new BadRequestException("Hay estudiantes duplicados en la lista");
    }

    const students = await this.prisma.student.findMany({
      where: { id: { in: uniqueIds }, academyId },
      select: { id: true },
    });

    if (students.length !== uniqueIds.length) {
      const foundIds = new Set(students.map((s) => s.id));
      const missing = uniqueIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Estudiantes no encontrados o no pertenecen a la academia: ${missing.join(", ")}`,
      );
    }
  }

  /**
   * Valida que todos los charges existan, esten PENDING, y pertenezcan al student correcto.
   */
  private async validateChargesAvailability(
    allChargeIds: string[],
    items: { studentId: string; chargeIds: string[] }[],
  ): Promise<void> {
    const uniqueChargeIds = [...new Set(allChargeIds)];

    if (uniqueChargeIds.length !== allChargeIds.length) {
      throw new BadRequestException("Hay charges duplicados en la lista");
    }

    const charges = await this.prisma.charge.findMany({
      where: { id: { in: uniqueChargeIds } },
      select: { id: true, studentId: true, status: true },
    });

    if (charges.length !== uniqueChargeIds.length) {
      const foundIds = new Set(charges.map((c) => c.id));
      const missing = uniqueChargeIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Charges no encontrados: ${missing.join(", ")}`,
      );
    }

    const chargeMap = new Map(charges.map((c) => [c.id, c]));

    for (const item of items) {
      for (const chargeId of item.chargeIds) {
        const charge = chargeMap.get(chargeId);

        if (charge.status !== ChargeStatus.PENDING) {
          throw new BadRequestException(
            `Charge ${chargeId} no está disponible (status: ${charge.status})`,
          );
        }

        if (charge.studentId !== item.studentId) {
          throw new BadRequestException(
            `Charge ${chargeId} no pertenece al estudiante ${item.studentId}`,
          );
        }
      }
    }
  }

  private mapToEntity(operation: {
    id: string;
    type: string;
    status: string;
    totalItems: number;
    completedItems: number;
    failedItems: number;
    skippedItems: number;
    results: unknown;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  }): BulkOperation {
    const isAfip = operation.type === BulkOperationType.BULK_AFIP;

    return {
      id: operation.id,
      type: operation.type as BulkOperationType,
      status: operation.status as BulkOperationStatus,
      totalItems: operation.totalItems,
      completedItems: operation.completedItems,
      failedItems: operation.failedItems,
      skippedItems: operation.skippedItems,
      results: isAfip ? [] : ((operation.results as BulkOperationResult[]) ?? []),
      afipResults: isAfip ? ((operation.results as any[]) ?? []) : [],
      startedAt: operation.startedAt ?? undefined,
      completedAt: operation.completedAt ?? undefined,
      createdAt: operation.createdAt,
    };
  }
}
