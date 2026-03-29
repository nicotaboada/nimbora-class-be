import { InputType, Field } from "@nestjs/graphql";
import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDate,
  IsEmail,
  IsBoolean,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { CreateInvoiceLineInput } from "./create-invoice-line.input";

@InputType()
export class CreateInvoiceInput {
  @Field({
    nullable: true,
    description: "ID del estudiante (null si es OTHER)",
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @Field({ description: "Nombre del destinatario" })
  @IsNotEmpty()
  @IsString()
  recipientName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  recipientAddress?: string;

  @Field({ description: "Fecha de emisión" })
  @IsDate()
  @Type(() => Date)
  issueDate: Date;

  @Field({ description: "Fecha de vencimiento" })
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @Field({
    nullable: true,
    description: "Notas públicas (visibles al cliente)",
  })
  @IsOptional()
  @IsString()
  publicNotes?: string;

  @Field({ nullable: true, description: "Notas privadas (internas)" })
  @IsOptional()
  @IsString()
  privateNotes?: string;

  @Field({
    defaultValue: false,
    description: "Enviar notificación por email al destinatario",
  })
  @IsBoolean()
  @IsOptional()
  notify?: boolean = false;

  @Field(() => [CreateInvoiceLineInput], {
    description: "Líneas de la factura",
  })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineInput)
  @ArrayMinSize(1, { message: "La factura debe tener al menos una línea" })
  lines: CreateInvoiceLineInput[];
}
