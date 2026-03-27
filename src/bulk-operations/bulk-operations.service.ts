import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { tasks } from "@trigger.dev/sdk";
import { PrismaService } from "../prisma/prisma.service";
import { BulkCreateInvoicesInput } from "./dto/bulk-create-invoices.input";
import { StudentsForBulkInvoiceInput } from "./dto/students-for-bulk-invoice.input";
import { BulkOperation } from "./entities/bulk-operation.entity";
import { BulkOperationResult } from "./entities/bulk-operation-result.entity";
import { StudentBulkInvoicePreview } from "./entities/student-bulk-invoice-preview.entity";
import { PaginatedStudentsForBulkInvoice } from "./dto/paginated-students-for-bulk-invoice.output";
import { BulkOperationType } from "./enums/bulk-operation-type.enum";
import { BulkOperationStatus } from "./enums/bulk-operation-status.enum";
import { ChargeStatus, Prisma } from "@prisma/client";
import type { bulkCreateInvoicesTask } from "../trigger/bulk-create-invoices";

@Injectable()
export class BulkOperationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Valida el input, crea un BulkOperation en PENDING, y dispara el task en background.
   */
  async bulkCreateInvoices(
    input: BulkCreateInvoicesInput,
    academyId: string,
  ): Promise<BulkOperation> {
    const { items, dueDate } = input;

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
    return {
      id: operation.id,
      type: operation.type as BulkOperationType,
      status: operation.status as BulkOperationStatus,
      totalItems: operation.totalItems,
      completedItems: operation.completedItems,
      failedItems: operation.failedItems,
      skippedItems: operation.skippedItems,
      results: (operation.results as BulkOperationResult[]) ?? [],
      startedAt: operation.startedAt ?? undefined,
      completedAt: operation.completedAt ?? undefined,
      createdAt: operation.createdAt,
    };
  }
}
