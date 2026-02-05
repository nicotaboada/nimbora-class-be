import { InputType, Field, PartialType } from "@nestjs/graphql";
import { IsNotEmpty, IsString } from "class-validator";
import { CreateUserInput } from "./create-user.input";

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field()
  @IsNotEmpty()
  @IsString()
  id: string;
}
