import { ObjectType, Field, Int } from "@nestjs/graphql";
import { InvoiceStatus } from "../enums/invoice-status.enum";
import { InvoiceLine } from "./invoice-line.entity";

@ObjectType()
export class Invoice {
  @Field()
  id: string;

  @Field(() => Int, { description: "Número de factura secuencial" })
  invoiceNumber: number;

  @Field({
    nullable: true,
    description: "ID del estudiante (null si es OTHER)",
  })
  studentId?: string;

  @Field({ description: "Nombre del destinatario" })
  recipientName: string;

  @Field({ nullable: true })
  recipientEmail?: string;

  @Field({ nullable: true })
  recipientPhone?: string;

  @Field({ nullable: true })
  recipientAddress?: string;

  @Field({ description: "Fecha de emisión" })
  issueDate: Date;

  @Field({ description: "Fecha de vencimiento" })
  dueDate: Date;

  @Field({
    nullable: true,
    description: "Notas públicas (visibles al cliente)",
  })
  publicNotes?: string;

  @Field({ nullable: true, description: "Notas privadas (internas)" })
  privateNotes?: string;

  @Field(() => InvoiceStatus)
  status: InvoiceStatus;

  @Field(() => Int, {
    description: "Subtotal en centavos (suma de originalAmount)",
  })
  subtotal: number;

  @Field(() => Int, { description: "Total de descuentos en centavos" })
  totalDiscount: number;

  @Field(() => Int, { description: "Total en centavos (suma de finalAmount)" })
  total: number;

  @Field(() => [InvoiceLine], { description: "Líneas de la factura" })
  lines: InvoiceLine[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
