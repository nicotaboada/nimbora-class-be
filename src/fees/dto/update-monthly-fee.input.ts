import { InputType, Field, Int } from "@nestjs/graphql";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDate,
  IsInt,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

@InputType()
export class UpdateMonthlyFeeInput {
  @Field()
  @IsNotEmpty({ message: "El ID es requerido" })
  @IsString()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: "La fecha de inicio debe ser válida" })
  startDate?: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt({ message: "El costo debe ser un número entero" })
  @Min(1, { message: "El costo debe ser mayor a 0" })
  cost?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt({ message: "Las ocurrencias deben ser un número entero" })
  occurrences?: number;
}
