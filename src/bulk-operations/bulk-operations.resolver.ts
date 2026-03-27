import { Resolver, Mutation, Query, Args, ID, Int } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { BulkOperationsService } from "./bulk-operations.service";
import { BulkOperation } from "./entities/bulk-operation.entity";
import { BulkCreateInvoicesInput } from "./dto/bulk-create-invoices.input";
import { StudentsForBulkInvoiceInput } from "./dto/students-for-bulk-invoice.input";
import { PaginatedStudentsForBulkInvoice } from "./dto/paginated-students-for-bulk-invoice.output";
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
    @Args("input") input: StudentsForBulkInvoiceInput,
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
