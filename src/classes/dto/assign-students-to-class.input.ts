import { InputType, Field } from "@nestjs/graphql";
import { IsArray, IsString, ArrayMinSize } from "class-validator";

@InputType()
export class AssignStudentsToClassInput {
  @Field()
  @IsString()
  classId: string;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  studentIds: string[];
}
