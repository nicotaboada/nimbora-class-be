import { InputType, Field, Int } from "@nestjs/graphql";
import { IsNotEmpty, IsString, IsDate, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

@InputType()
export class CreateMonthlyFeeInput {
  @Field()
  @IsNotEmpty({ message: "La descripción es requerida" })
  @IsString()
  description: string;

  @Field()
  @IsNotEmpty({ message: "La fecha de inicio es requerida" })
  @Type(() => Date)
  @IsDate({ message: "La fecha de inicio debe ser válida" })
  startDate: Date;

  @Field(() => Int)
  @IsNotEmpty({ message: "El costo es requerido" })
  @IsInt({ message: "El costo debe ser un número entero" })
  @Min(1, { message: "El costo debe ser mayor a 0" })
  cost: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt({ message: "Las ocurrencias deben ser un número entero" })
  occurrences: number;
}
