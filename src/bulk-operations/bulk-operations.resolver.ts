import { Resolver, Mutation, Query, Args, ID, Int } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { BulkOperationsService } from "./bulk-operations.service";
import { BulkOperation } from "./entities/bulk-operation.entity";
import { BulkCreateInvoicesInput } from "./dto/bulk-create-invoices.input";
import { BulkCreateAfipInvoicesInput } from "./dto/bulk-create-afip-invoices.input";
import { BulkCreateFamilyInvoicesInput } from "./dto/bulk-create-family-invoices.input";
import { BulkInvoiceFilterInput } from "./dto/bulk-invoice-filter.input";
import { InvoicesForBulkAfipInput } from "./dto/invoices-for-bulk-afip.input";
import { PaginatedStudentsForBulkInvoice } from "./dto/paginated-students-for-bulk-invoice.output";
import { PaginatedInvoicesForBulkAfip } from "./dto/paginated-invoices-for-bulk-afip.output";
import { PaginatedFamiliesForBulkInvoice } from "./dto/paginated-families-for-bulk-invoice.output";
import { AfipBulkSummary } from "./entities/afip-bulk-summary.entity";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

@Resolver(() => BulkOperation)
@UseGuards(SupabaseAuthGuard)
export class BulkOperationsResolver {
  constructor(private readonly bulkOperationsService: BulkOperationsService) {}

  /**
   * Lista estudiantes con sus charges PENDING agregados para facturación masiva.
   */
  @Query(() => PaginatedStudentsForBulkInvoice, {
    name: "studentsForBulkInvoice",
    description:
      "Estudiantes con charges pendientes para facturación masiva (paginado)",
  })
  async findStudentsForBulkInvoice(
    @CurrentUser() user: User,
    @Args("input") input: BulkInvoiceFilterInput,
    @Args("page", { type: () => Int, nullable: true, defaultValue: 1 })
    page: number,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 10 })
    limit: number,
  ): Promise<PaginatedStudentsForBulkInvoice> {
    return this.bulkOperationsService.findStudentsForBulkInvoice(
      input,
      user.academyId,
      page,
      limit,
    );
  }

  /**
   * Lista familias con sus estudiantes que tengan charges PENDING para facturación masiva.
   */
  @Query(() => PaginatedFamiliesForBulkInvoice, {
    name: "familiesForBulkInvoice",
    description:
      "Familias con charges pendientes para facturación masiva (paginado)",
  })
  async findFamiliesForBulkInvoice(
    @CurrentUser() user: User,
    @Args("input") input: BulkInvoiceFilterInput,
    @Args("page", { type: () => Int, nullable: true, defaultValue: 1 })
    page: number,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 10 })
    limit: number,
  ): Promise<PaginatedFamiliesForBulkInvoice> {
    return this.bulkOperationsService.findFamiliesForBulkInvoice(
      input,
      user.academyId,
      page,
      limit,
    );
  }

  /**
   * Crea facturas en bulk para múltiples estudiantes (procesamiento en background).
   */
  @Mutation(() => BulkOperation, {
    description:
      "Genera facturas en bulk. Retorna el operationId para polling de estado.",
  })
  async bulkCreateInvoices(
    @Args("input") input: BulkCreateInvoicesInput,
    @CurrentUser() user: User,
  ): Promise<BulkOperation> {
    return this.bulkOperationsService.bulkCreateInvoices(input, user.academyId);
  }

  /**
   * Crea facturas familiares en bulk (una factura por familia, procesamiento en background).
   */
  @Mutation(() => BulkOperation, {
    description:
      "Genera facturas familiares en bulk. Una factura por familia con los cargos de todos sus estudiantes.",
  })
  async bulkCreateFamilyInvoices(
    @Args("input") input: BulkCreateFamilyInvoicesInput,
    @CurrentUser() user: User,
  ): Promise<BulkOperation> {
    return this.bulkOperationsService.bulkCreateFamilyInvoices(
      input,
      user.academyId,
    );
  }

  // ─── AFIP Bulk ─────────────────────────────────────────────────────────────

  /**
   * Lista facturas PAID elegibles para emisión AFIP.
   */
  @Query(() => PaginatedInvoicesForBulkAfip, {
    name: "invoicesForBulkAfip",
    description: "Facturas pagadas elegibles para emisión AFIP (paginado)",
  })
  async findInvoicesForBulkAfip(
    @CurrentUser() user: User,
    @Args("input") input: InvoicesForBulkAfipInput,
    @Args("page", { type: () => Int, nullable: true, defaultValue: 1 })
    page: number,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 10 })
    limit: number,
  ): Promise<PaginatedInvoicesForBulkAfip> {
    return this.bulkOperationsService.findInvoicesForBulkAfip(
      input,
      user.academyId,
      page,
      limit,
    );
  }

  /**
   * Resumen de emisión AFIP con desglose por tipo de comprobante.
   */
  @Query(() => AfipBulkSummary, {
    name: "afipBulkSummary",
    description: "Resumen con desglose por tipo de comprobante AFIP",
  })
  async getAfipBulkSummary(
    @Args("invoiceIds", { type: () => [String] }) invoiceIds: string[],
    @CurrentUser() user: User,
  ): Promise<AfipBulkSummary> {
    return this.bulkOperationsService.getAfipBulkSummary(
      invoiceIds,
      user.academyId,
    );
  }

  /**
   * Emite facturas en AFIP en bulk (procesamiento en background).
   */
  @Mutation(() => BulkOperation, {
    description:
      "Emite facturas en AFIP en bulk. Retorna el operationId para polling.",
  })
  async bulkCreateAfipInvoices(
    @Args("input") input: BulkCreateAfipInvoicesInput,
    @CurrentUser() user: User,
  ): Promise<BulkOperation> {
    return this.bulkOperationsService.bulkCreateAfipInvoices(
      input,
      user.academyId,
    );
  }

  // ─── Common ───────────────────────────────────────────────────────────────

  /**
   * Consulta el estado de una operación bulk (para polling).
   */
  @Query(() => BulkOperation, {
    name: "bulkOperation",
    description: "Obtiene el estado actual de una operación bulk",
  })
  async findOne(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ): Promise<BulkOperation> {
    return this.bulkOperationsService.findById(id, user.academyId);
  }
}
