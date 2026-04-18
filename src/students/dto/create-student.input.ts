import { InputType, Field } from "@nestjs/graphql";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
} from "class-validator";

@InputType()
export class CreateStudentInput {
  @Field()
  @IsNotEmpty({ message: "El nombre es requerido" })
  @IsString()
  firstName: string;

  @Field()
  @IsNotEmpty({ message: "El apellido es requerido" })
  @IsString()
  lastName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail({}, { message: "El email debe tener un formato válido" })
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: "Cada ID de clase debe ser texto" })
  classIds?: string[];
}
