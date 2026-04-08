import { ObjectType, Field } from "@nestjs/graphql";
import { ClassSummary } from "./class-summary.entity";

@ObjectType()
export class FamilyStudentSummary {
  @Field()
  id: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => [ClassSummary])
  classes: ClassSummary[];
}
