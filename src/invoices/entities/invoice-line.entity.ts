import { ObjectType, Field, Int } from "@nestjs/graphql";
import { InvoiceLineType } from "../enums/invoice-line-type.enum";
import { DiscountType } from "../enums/discount-type.enum";

@ObjectType()
export class InvoiceLine {
  @Field()
  id: string;

  @Field()
  invoiceId: string;

  @Field(() => InvoiceLineType)
  type: InvoiceLineType;

  @Field({ nullable: true, description: "ID del cargo (null si es MANUAL)" })
  chargeId?: string;

  @Field({ description: "Descripción de la línea" })
  description: string;

  @Field(() => Int, { description: "Monto original en centavos" })
  originalAmount: number;

  @Field(() => DiscountType, { nullable: true })
  discountType?: DiscountType;

  @Field(() => Int, {
    nullable: true,
    description: "Valor del descuento (% o centavos según tipo)",
  })
  discountValue?: number;

  @Field({ nullable: true, description: "Razón del descuento" })
  discountReason?: string;

  @Field(() => Int, { description: "Monto final en centavos (con descuento)" })
  finalAmount: number;

  @Field({ description: "Indica si la línea está activa o es histórica" })
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
