import { InputType, Field, Int } from "@nestjs/graphql";
import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  ValidateIf,
  IsNotEmpty,
  IsUUID,
} from "class-validator";
import { InvoiceLineType } from "../enums/invoice-line-type.enum";
import { DiscountType } from "../enums/discount-type.enum";

@InputType()
export class CreateInvoiceLineInput {
  @Field(() => InvoiceLineType, { defaultValue: "CHARGE" })
  @IsEnum(InvoiceLineType)
  type: InvoiceLineType;

  @Field({
    nullable: true,
    description: "ID del cargo (requerido si type = CHARGE)",
  })
  @ValidateIf((o: CreateInvoiceLineInput) => o.type === "CHARGE")
  @IsNotEmpty({ message: "chargeId es requerido para líneas tipo CHARGE" })
  @IsUUID()
  chargeId?: string;

  @Field({
    nullable: true,
    description: "Descripción (requerido si type = MANUAL)",
  })
  @ValidateIf((o: CreateInvoiceLineInput) => o.type === "MANUAL")
  @IsNotEmpty({ message: "description es requerido para líneas tipo MANUAL" })
  @IsString()
  description?: string;

  @Field(() => Int, {
    nullable: true,
    description: "Monto original en centavos (requerido si type = MANUAL)",
  })
  @ValidateIf((o: CreateInvoiceLineInput) => o.type === "MANUAL")
  @IsNotEmpty({
    message: "originalAmount es requerido para líneas tipo MANUAL",
  })
  @IsInt()
  @Min(0)
  originalAmount?: number;

  @Field(() => DiscountType, { nullable: true })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @Field(() => Int, {
    nullable: true,
    description:
      "Valor del descuento (0-100 si PERCENT, centavos si FIXED_AMOUNT)",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100, { message: "El porcentaje no puede superar 100" })
  @ValidateIf((o: CreateInvoiceLineInput) => o.discountType === "PERCENT")
  discountValue?: number;

  @Field(() => Int, {
    nullable: true,
    description: "Valor del descuento en centavos (solo para FIXED_AMOUNT)",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @ValidateIf((o: CreateInvoiceLineInput) => o.discountType === "FIXED_AMOUNT")
  discountValueFixed?: number;

  @Field({ nullable: true, description: "Razón del descuento" })
  @IsOptional()
  @IsString()
  discountReason?: string;
}
