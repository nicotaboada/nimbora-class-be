import { InputType, Field } from "@nestjs/graphql";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsISO8601,
  Allow,
} from "class-validator";
import { Gender, DocumentType } from "../../common/enums";

@InputType()
export class UpdateStudentPersonalInfoInput {
  @IsString({ message: "El ID debe ser texto" })
  @Field()
  id: string;

  @IsOptional()
  @IsString({ message: "El nombre debe ser texto" })
  @Allow()
  @Field({ nullable: true })
  firstName?: string;

  @IsOptional()
  @IsString({ message: "El apellido debe ser texto" })
  @Allow()
  @Field({ nullable: true })
  lastName?: string;

  @IsOptional()
  @IsISO8601(
    {},
    {
      message:
        "La fecha de nacimiento debe ser una fecha válida en formato ISO 8601",
    },
  )
  @Allow()
  @Field({ nullable: true })
  birthDate?: string;

  @IsOptional()
  @IsEnum(Gender, { message: "Género inválido" })
  @Allow()
  @Field(() => Gender, { nullable: true })
  gender?: Gender;

  @IsOptional()
  @IsEnum(DocumentType, { message: "Tipo de documento inválido" })
  @Allow()
  @Field(() => DocumentType, { nullable: true })
  documentType?: DocumentType;

  @IsOptional()
  @IsString({ message: "El número de documento debe ser texto" })
  @Allow()
  @Field({ nullable: true })
  documentNumber?: string;
}
