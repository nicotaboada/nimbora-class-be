import { ObjectType, Field, Int } from "@nestjs/graphql";
import { FeeType } from "../enums/fee-type.enum";
import { FeePeriod } from "../enums/fee-period.enum";

@ObjectType()
export class Fee {
  @Field()
  id: string;

  @Field()
  description: string;

  @Field(() => FeeType)
  type: FeeType;

  @Field()
  startDate: Date;

  @Field(() => Int, { description: "Costo en centavos" })
  cost: number;

  @Field(() => Int, { nullable: true, description: "Número de ocurrencias" })
  occurrences?: number;

  @Field(() => FeePeriod, { nullable: true, description: "Periodicidad" })
  period?: FeePeriod;

  @Field(() => Int, { description: "Total calculado en centavos" })
  total: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
