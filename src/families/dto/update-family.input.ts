import { InputType, Field } from "@nestjs/graphql";
import { IsOptional, IsString, MinLength, MaxLength } from "class-validator";

@InputType()
export class UpdateFamilyInput {
  @Field()
  @IsString()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;
}
