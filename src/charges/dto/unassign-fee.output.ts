import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType()
export class UnassignFeeOutput {
  @Field(() => Int, { description: "Número de cuotas canceladas" })
  cancelledCount: number;
}
