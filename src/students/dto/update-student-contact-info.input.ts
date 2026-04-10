import { InputType, Field } from "@nestjs/graphql";
import { IsOptional, IsString, IsEmail, Allow } from "class-validator";

@InputType()
export class UpdateStudentContactInfoInput {
  @IsString({ message: "El ID del estudiante debe ser texto" })
  @Field()
  studentId: string;

  @IsOptional()
  @IsEmail({}, { message: "El email debe ser válido" })
  @Allow()
  @Field({ nullable: true })
  email?: string;

  @IsOptional()
  @IsString({ message: "El código de país debe ser texto" })
  @Allow()
  @Field({ nullable: true })
  phoneCountryCode?: string;

  @IsOptional()
  @IsString({ message: "El teléfono debe ser texto" })
  @Allow()
  @Field({ nullable: true })
  phoneNumber?: string;

  @IsOptional()
  @IsString({ message: "La dirección debe ser texto" })
  @Allow()
  @Field({ nullable: true })
  address?: string;

  @IsOptional()
  @IsString({ message: "El país debe ser texto" })
  @Allow()
  @Field({ nullable: true })
  country?: string;

  @IsOptional()
  @IsString({ message: "El estado debe ser texto" })
  @Allow()
  @Field({ nullable: true })
  state?: string;

  @IsOptional()
  @IsString({ message: "La ciudad debe ser texto" })
  @Allow()
  @Field({ nullable: true })
  city?: string;

  @IsOptional()
  @IsString({ message: "El código postal debe ser texto" })
  @Allow()
  @Field({ nullable: true })
  postalCode?: string;
}
