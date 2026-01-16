import { ObjectType, Field } from "@nestjs/graphql";
import { Charge } from "../entities/charge.entity";

@ObjectType()
export class ChargesForInvoiceOutput {
  @Field(() => [Charge], {
    description:
      "Cargos del mes seleccionado + vencidos si includePastDue=true",
  })
  charges: Charge[];
}
