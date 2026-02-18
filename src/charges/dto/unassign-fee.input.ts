import { InputType, Field } from "@nestjs/graphql";
import { IsUUID } from "class-validator";

@InputType()
export class UnassignFeeInput {
  @Field({ description: "ID del estudiante" })
  @IsUUID("4")
  studentId: string;

  @Field({ description: "ID del fee a desasignar" })
  @IsUUID("4")
  feeId: string;
}
