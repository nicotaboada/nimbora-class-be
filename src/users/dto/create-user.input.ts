import { InputType, Field } from "@nestjs/graphql";
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
} from "class-validator";
import { UserRole } from "../enums/user-role.enum";

@InputType()
export class CreateUserInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  supabaseUserId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  academyId: string;

  @Field(() => UserRole)
  @IsEnum(UserRole)
  role: UserRole;

  @Field()
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;
}
