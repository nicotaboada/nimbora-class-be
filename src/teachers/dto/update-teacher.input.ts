import { InputType, Field } from "@nestjs/graphql";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsDate,
} from "class-validator";
import {
  TeacherStatus,
  TeacherGender,
  TeacherDocumentType,
} from "../entities/teacher.entity";

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
  @Field(() => TeacherGender, { nullable: true })
  gender?: TeacherGender;

  @IsOptional()
  @Field(() => TeacherDocumentType, { nullable: true })
  documentType?: TeacherDocumentType;

  @IsOptional()
  @IsString({ message: "El número de documento debe ser texto" })
  @Field({ nullable: true })
  documentNumber?: string;

  @IsOptional()
  @IsEnum(TeacherStatus, { message: "Estado inválido" })
  @Field(() => TeacherStatus, { nullable: true })
  status?: TeacherStatus;
}
