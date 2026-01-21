import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { InvoicesService } from "./invoices.service";
import { Invoice } from "./entities/invoice.entity";
import { CreateInvoiceInput } from "./dto/create-invoice.input";
import { AddInvoiceLineInput } from "./dto/add-invoice-line.input";
import { UpdateInvoiceLineInput } from "./dto/update-invoice-line.input";
import { InvoiceStatus } from "./enums/invoice-status.enum";

@Resolver(() => Invoice)
export class InvoicesResolver {
  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * Crea una nueva factura con sus líneas.
   */
  @Mutation(() => Invoice, { description: "Crea una nueva factura" })
  async createInvoice(
    @Args("input") input: CreateInvoiceInput,
  ): Promise<Invoice> {
    return this.invoicesService.createInvoice(input);
  }

  /**
   * Agrega una línea a una factura existente.
   */
  @Mutation(() => Invoice, {
    description: "Agrega una línea a una factura existente",
  })
  async addInvoiceLine(
    @Args("input") input: AddInvoiceLineInput,
  ): Promise<Invoice> {
    return this.invoicesService.addInvoiceLine(input);
  }

  /**
   * Actualiza el descuento de una línea.
   */
  @Mutation(() => Invoice, {
    description: "Actualiza el descuento de una línea",
  })
  async updateInvoiceLine(
    @Args("input") input: UpdateInvoiceLineInput,
  ): Promise<Invoice> {
    return this.invoicesService.updateInvoiceLine(input);
  }

  /**
   * Remueve una línea de una factura (marca como inactiva).
   */
  @Mutation(() => Invoice, { description: "Remueve una línea de una factura" })
  async removeInvoiceLine(
    @Args("lineId", { type: () => ID }) lineId: string,
  ): Promise<Invoice> {
    return this.invoicesService.removeInvoiceLine(lineId);
  }

  /**
   * Anula una factura (soft delete).
   */
  @Mutation(() => Invoice, { description: "Anula una factura (soft delete)" })
  async voidInvoice(
    @Args("invoiceId", { type: () => ID }) invoiceId: string,
  ): Promise<Invoice> {
    return this.invoicesService.voidInvoice(invoiceId);
  }

  /**
   * Obtiene una factura por ID.
   */
  @Query(() => Invoice, {
    name: "invoice",
    description: "Obtiene una factura por ID",
  })
  async findOne(@Args("id", { type: () => ID }) id: string): Promise<Invoice> {
    return this.invoicesService.findById(id);
  }

  /**
   * Lista facturas con filtros opcionales.
   */
  @Query(() => [Invoice], { name: "invoices", description: "Lista facturas" })
  async findAll(
    @Args("studentId", { type: () => ID, nullable: true }) studentId?: string,
    @Args("status", { type: () => InvoiceStatus, nullable: true })
    status?: InvoiceStatus,
  ): Promise<Invoice[]> {
    return this.invoicesService.findAll({ studentId, status });
  }
}
