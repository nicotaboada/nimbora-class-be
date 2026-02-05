import { InputType, Field, PartialType } from "@nestjs/graphql";
import { IsNotEmpty, IsString } from "class-validator";
import { CreateAcademyInput } from "./create-academy.input";

@InputType()
export class UpdateAcademyInput extends PartialType(CreateAcademyInput) {
  @Field()
  @IsNotEmpty()
  @IsString()
  id: string;
}
