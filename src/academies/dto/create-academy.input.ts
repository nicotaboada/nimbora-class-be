import { InputType, Field } from "@nestjs/graphql";
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
} from "class-validator";
import { AcademyStatus } from "../enums/academy-status.enum";

@InputType()
export class CreateAcademyInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  slug: string;

  @Field(() => AcademyStatus, { defaultValue: AcademyStatus.ACTIVE })
  @IsEnum(AcademyStatus)
  status: AcademyStatus;

  @Field()
  @IsNotEmpty()
  @IsString()
  country: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  currency: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  timezone: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  ownerUserId: string;
}
