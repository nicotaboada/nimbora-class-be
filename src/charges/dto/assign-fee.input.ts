import { InputType, Field } from "@nestjs/graphql";
import { IsUUID, IsArray, ArrayMinSize, IsEnum } from "class-validator";
import { ChargeStartMonth } from "../enums/charge-start-month.enum";

@InputType()
export class AssignFeeInput {
  @Field({ description: "ID del fee a asignar" })
  @IsUUID()
  feeId: string;

  @Field(() => [String], { description: "Lista de IDs de estudiantes" })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  studentIds: string[];

  @Field(() => ChargeStartMonth, {
    description: "Mes desde el cual empezar a cobrar",
    defaultValue: ChargeStartMonth.NEXT_MONTH,
  })
  @IsEnum(ChargeStartMonth)
  startMonth: ChargeStartMonth = ChargeStartMonth.NEXT_MONTH;
}
