import { InputType, Field, Int } from "@nestjs/graphql";
import {
  IsNotEmpty,
  IsString,
  IsDate,
  IsInt,
  Min,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { FeePeriod } from "../enums/fee-period.enum";

@InputType()
export class CreatePeriodicFeeInput {
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

  @Field(() => FeePeriod)
  @IsNotEmpty({ message: "El período es requerido" })
  @IsEnum(FeePeriod, { message: "El período debe ser un valor válido" })
  period: FeePeriod;
}
