import { ObjectType, Field, Int } from "@nestjs/graphql";
import { Charge } from "../entities/charge.entity";

@ObjectType()
export class AssignFeeOutput {
  @Field(() => Int, { description: "Número total de cargos creados" })
  chargesCreated: number;

  @Field(() => [Charge], { description: "Lista de cargos creados" })
  charges: Charge[];
}
