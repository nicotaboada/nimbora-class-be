import { InputType, Field } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";
import { PaginationInput } from "../../common/dto/pagination.input";

@InputType()
export class AvailableStudentsFilterInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}
