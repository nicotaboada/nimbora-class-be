import { InputType, Field } from "@nestjs/graphql";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsDate,
} from "class-validator";
import { Status, Gender, DocumentType } from "../../common/enums";

@InputType()
export class UpdateTeacherInput {
  @IsNotEmpty({ message: "El ID es requerido" })
  @IsString({ message: "El ID debe ser texto" })
  @Field()
  id: string;

  @IsOptional()
  @IsString({ message: "El nombre debe ser texto" })
  @Field({ nullable: true })
  firstName?: string;

  @IsOptional()
  @IsString({ message: "El apellido debe ser texto" })
  @Field({ nullable: true })
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: "El email debe ser válido" })
  @Field({ nullable: true })
  email?: string;

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
  @IsString({ message: "La URL del avatar debe ser texto" })
  @Field({ nullable: true })
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(Status, { message: "Estado inválido" })
  @Field(() => Status, { nullable: true })
  status?: Status;
}
