import { InputType, Field } from "@nestjs/graphql";
import { IsString, IsArray, ArrayMinSize } from "class-validator";

@InputType()
export class SetFamilyStudentsInput {
  @Field()
  @IsString()
  familyId: string;

  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  studentIds: string[];
}
