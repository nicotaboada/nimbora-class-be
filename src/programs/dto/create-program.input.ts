import { InputType, Field } from "@nestjs/graphql";
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
} from "class-validator";
import { Language } from "../../common/enums";

@InputType()
export class CreateProgramInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @Field(() => Language)
  @IsEnum(Language)
  language: Language;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
