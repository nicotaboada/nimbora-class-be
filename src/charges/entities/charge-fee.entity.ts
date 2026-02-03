import { ObjectType, Field } from "@nestjs/graphql";

@ObjectType()
export class ChargeFee {
  @Field({ description: "ID del fee" })
  id: string;

  @Field({ description: "Descripción del fee (Cargo)" })
  description: string;
}
