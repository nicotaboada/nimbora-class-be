import { ObjectType, Field, Int } from "@nestjs/graphql";
import { FeeType } from "../../fees/enums/fee-type.enum";
import { Charge } from "../entities/charge.entity";

@ObjectType()
export class StudentFeeDetail {
  @Field({ description: "ID del fee" })
  feeId: string;

  @Field({ description: "Descripción del fee" })
  feeDescription: string;

  @Field(() => FeeType, { description: "Tipo de fee" })
  feeType: FeeType;

  @Field(() => Int, {
    description: "Monto total en centavos (suma de todas las cuotas)",
  })
  totalAmount: number;

  @Field(() => Int, {
    description:
      "Monto facturado en centavos (suma de cuotas con status INVOICED o PAID)",
  })
  invoicedAmount: number;

  @Field(() => [Charge], { description: "Cuotas individuales del fee" })
  charges: Charge[];
}
