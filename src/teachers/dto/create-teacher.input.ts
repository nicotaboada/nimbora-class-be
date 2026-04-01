import { InputType, Field, Int } from "@nestjs/graphql";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsInt,
  Matches,
} from "class-validator";
import { TeacherGender, TeacherDocumentType } from "../entities/teacher.entity";

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
  @IsString({ message: "El teléfono debe ser texto" })
  @Field({ nullable: true })
  phoneNumber?: string;

  @IsOptional()
  @IsInt({ message: "El año de nacimiento debe ser un número" })
  @Field(() => Int, { nullable: true })
  birthYear?: number;

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
}
