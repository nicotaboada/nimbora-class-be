import { InputType, Field } from "@nestjs/graphql";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsDate,
  IsArray,
} from "class-validator";
import { Gender, DocumentType } from "../../common/enums";

@InputType()
export class CreateTeacherInput {
  @IsNotEmpty({ message: "El nombre es requerido" })
  @IsString({ message: "El nombre debe ser texto" })
  @Field()
  firstName: string;

  @IsNotEmpty({ message: "El apellido es requerido" })
  @IsString({ message: "El apellido debe ser texto" })
  @Field()
  lastName: string;

  @IsOptional()
  @IsEmail({}, { message: "El email debe ser válido" })
  @Field({ nullable: true })
  email?: string;

  @IsOptional()
  @IsString({ message: "El código de país debe ser texto" })
  @Field({ nullable: true })
  phoneCountryCode?: string;

  @IsOptional()
  @IsString({ message: "El teléfono debe ser texto" })
  @Field({ nullable: true })
  phoneNumber?: string;

  @IsOptional()
  @IsDate({ message: "La fecha de nacimiento debe ser una fecha válida" })
  @Field({ nullable: true })
  birthDate?: Date;

  @IsOptional()
  @Field(() => Gender, { nullable: true })
  gender?: Gender;

  @IsOptional()
  @Field(() => DocumentType, { nullable: true })
  documentType?: DocumentType;

  @IsOptional()
  @IsString({ message: "El número de documento debe ser texto" })
  @Field({ nullable: true })
  documentNumber?: string;

  @IsOptional()
  @IsString({ message: "La dirección debe ser texto" })
  @Field({ nullable: true })
  address?: string;

  @IsOptional()
  @IsString({ message: "La ciudad debe ser texto" })
  @Field({ nullable: true })
  city?: string;

  @IsOptional()
  @IsString({ message: "El estado debe ser texto" })
  @Field({ nullable: true })
  state?: string;

  @IsOptional()
  @IsString({ message: "El país debe ser texto" })
  @Field({ nullable: true })
  country?: string;

  @IsOptional()
  @IsString({ message: "El código postal debe ser texto" })
  @Field({ nullable: true })
  postalCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: "Cada ID de clase debe ser texto" })
  @Field(() => [String], { nullable: true })
  classIds?: string[];
}
