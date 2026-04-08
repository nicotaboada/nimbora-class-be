import { ObjectType, Field, Int } from "@nestjs/graphql";
import { FamilyStudentSummary } from "./family-student-summary.entity";
import { FamilyGuardianSummary } from "./family-guardian-summary.entity";

@ObjectType()
export class Family {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => Int)
  membersCount: number;

  @Field(() => [FamilyStudentSummary])
  students: FamilyStudentSummary[];

  @Field(() => [FamilyGuardianSummary])
  guardians: FamilyGuardianSummary[];

  @Field(() => [String])
  tags: string[];

  @Field()
  createdAt: Date;
}
