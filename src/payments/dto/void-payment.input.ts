import { InputType, Field, ID } from "@nestjs/graphql";
import { IsUUID, IsOptional, IsString } from "class-validator";

@InputType({ description: "Input para anular un pago" })
export class VoidPaymentInput {
  @Field(() => ID, { description: "ID del pago a anular" })
  @IsUUID("4")
  paymentId: string;

  @Field({ nullable: true, description: "Razón de la anulación" })
  @IsOptional()
  @IsString()
  reason?: string;
}
