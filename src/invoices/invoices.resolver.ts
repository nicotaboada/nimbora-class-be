import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { Invoice } from "./entities/invoice.entity";
import { CreateInvoiceInput } from "./dto/create-invoice.input";
import { AddInvoiceLineInput } from "./dto/add-invoice-line.input";
import { UpdateInvoiceLineInput } from "./dto/update-invoice-line.input";
import { InvoicesFilterInput } from "./dto/findAll-filter.input";
import { PaginatedInvoices } from "./dto/paginated-invoices.output";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

@Resolver(() => Invoice)
@UseGuards(SupabaseAuthGuard)
export class InvoicesResolver {
  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * Crea una nueva factura con sus líneas.
   */
  @Mutation(() => Invoice, { description: "Crea una nueva factura" })
  async createInvoice(
    @Args("input") input: CreateInvoiceInput,
    @CurrentUser() user: User,
  ): Promise<Invoice> {
    return this.invoicesService.createInvoice(input, user.academyId);
  }

  /**
   * Agrega una línea a una factura existente.
   */
  @Mutation(() => Invoice, {
    description: "Agrega una línea a una factura existente",
  })
  async addInvoiceLine(
    @Args("input") input: AddInvoiceLineInput,
    @CurrentUser() user: User,
  ): Promise<Invoice> {
    return this.invoicesService.addInvoiceLine(input, user.academyId);
  }

  /**
   * Actualiza el descuento de una línea.
   */
  @Mutation(() => Invoice, {
    description: "Actualiza el descuento de una línea",
  })
  async updateInvoiceLine(
    @Args("input") input: UpdateInvoiceLineInput,
    @CurrentUser() user: User,
  ): Promise<Invoice> {
    return this.invoicesService.updateInvoiceLine(input, user.academyId);
  }

  /**
   * Remueve una línea de una factura (marca como inactiva).
   */
  @Mutation(() => Invoice, { description: "Remueve una línea de una factura" })
  async removeInvoiceLine(
    @Args("lineId", { type: () => ID }) lineId: string,
    @CurrentUser() user: User,
  ): Promise<Invoice> {
    return this.invoicesService.removeInvoiceLine(lineId, user.academyId);
  }

  /**
   * Anula una factura (soft delete).
   */
  @Mutation(() => Invoice, { description: "Anula una factura (soft delete)" })
  async voidInvoice(
    @Args("invoiceId", { type: () => ID }) invoiceId: string,
    @CurrentUser() user: User,
  ): Promise<Invoice> {
    return this.invoicesService.voidInvoice(invoiceId, user.academyId);
  }

  /**
   * Obtiene una factura por ID.
   */
  @Query(() => Invoice, {
    name: "invoice",
    description: "Obtiene una factura por ID",
  })
  async findOne(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ): Promise<Invoice> {
    return this.invoicesService.findById(id, user.academyId);
  }

  /**
   * Lista facturas con filtros opcionales y paginación.
   */
  @Query(() => PaginatedInvoices, {
    name: "invoices",
    description: "Lista facturas paginada",
  })
  async findAll(
    @CurrentUser() user: User,
    @Args("filter", { nullable: true }) filter?: InvoicesFilterInput,
  ): Promise<PaginatedInvoices> {
    return this.invoicesService.findAll(user.academyId, filter);
  }
}
