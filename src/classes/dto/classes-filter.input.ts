import { InputType, Field } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";
import { PaginationInput } from "../../common/dto/pagination.input";

@InputType()
export class ClassesFilterInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  programId?: string;
}
