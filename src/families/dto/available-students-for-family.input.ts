import { InputType, Field, Int } from "@nestjs/graphql";
import { IsOptional, IsString, IsInt, Min, Max } from "class-validator";

@InputType()
export class AvailableStudentsForFamilyInput {
  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  page: number = 1;

  @Field(() => Int, { defaultValue: 10 })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}
