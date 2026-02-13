import { InputType, Field } from "@nestjs/graphql";
import { IsNotEmpty, IsString } from "class-validator";

@InputType()
export class UpdateAfipSalesPointInput {
  @Field({ description: "Nuevo nombre descriptivo del punto de venta" })
  @IsString()
  @IsNotEmpty()
  name: string;
}
