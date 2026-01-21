import { InputType, Field, Int } from "@nestjs/graphql";
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsUUID,
} from "class-validator";
import { DiscountType } from "../enums/discount-type.enum";

@InputType()
export class UpdateInvoiceLineInput {
  @Field({ description: "ID de la línea a actualizar" })
  @IsUUID()
  lineId: string;

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
  @Max(100)
  discountValue?: number;

  @Field({ nullable: true, description: "Razón del descuento" })
  @IsOptional()
  @IsString()
  discountReason?: string;
}
