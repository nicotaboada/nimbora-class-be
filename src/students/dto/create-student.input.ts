import { InputType, Field } from "@nestjs/graphql";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

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

  @Field()
  @IsNotEmpty({ message: "El email es requerido" })
  @IsEmail({}, { message: "El email debe tener un formato válido" })
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
