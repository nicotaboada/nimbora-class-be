import { InputType, Field, Int } from "@nestjs/graphql";
import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

@InputType()
export class CreateAfipSalesPointInput {
  @Field(() => Int, { description: "Número de punto de venta en ARCA" })
  @IsInt()
  @Min(1)
  number: number;

  @Field({ description: "Nombre descriptivo del punto de venta" })
  @IsString()
  @IsNotEmpty()
  name: string;
}
