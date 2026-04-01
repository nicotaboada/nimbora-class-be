import { InputType, Field } from "@nestjs/graphql";
import { IsOptional, IsEmail, IsString } from "class-validator";

@InputType()
export class UpdateContactInfoInput {
  @Field()
  teacherId: string;

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
  @IsString({ message: "La dirección debe ser texto" })
  @Field({ nullable: true })
  address?: string;

  @IsOptional()
  @IsString({ message: "El país debe ser texto" })
  @Field({ nullable: true })
  country?: string;

  @IsOptional()
  @IsString({ message: "El estado debe ser texto" })
  @Field({ nullable: true })
  state?: string;

  @IsOptional()
  @IsString({ message: "La ciudad debe ser texto" })
  @Field({ nullable: true })
  city?: string;

  @IsOptional()
  @IsString({ message: "El código postal debe ser texto" })
  @Field({ nullable: true })
  postalCode?: string;
}
