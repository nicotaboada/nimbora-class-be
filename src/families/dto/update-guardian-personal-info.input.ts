import { InputType, Field } from "@nestjs/graphql";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
} from "class-validator";
import { Gender, DocumentType } from "../../common/enums";

@InputType()
export class UpdateGuardianPersonalInfoInput {
  @IsNotEmpty({ message: "El ID del tutor es requerido" })
  @IsString({ message: "El ID debe ser texto" })
  @Field()
  guardianId: string;

  @IsOptional()
  @IsString({ message: "El nombre debe ser texto" })
  @Field({ nullable: true })
  firstName?: string;

  @IsOptional()
  @IsString({ message: "El apellido debe ser texto" })
  @Field({ nullable: true })
  lastName?: string;

  @IsOptional()
  @IsDate({ message: "La fecha de nacimiento debe ser una fecha válida" })
  @Field({ nullable: true })
  birthDate?: Date;

  @IsOptional()
  @IsEnum(Gender, { message: "Género inválido" })
  @Field(() => Gender, { nullable: true })
  gender?: Gender;

  @IsOptional()
  @IsEnum(DocumentType, { message: "Tipo de documento inválido" })
  @Field(() => DocumentType, { nullable: true })
  documentType?: DocumentType;

  @IsOptional()
  @IsString({ message: "El número de documento debe ser texto" })
  @Field({ nullable: true })
  documentNumber?: string;
}
