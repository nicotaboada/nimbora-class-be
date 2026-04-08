import { ObjectType, Field } from "@nestjs/graphql";
import { GuardianRelationship } from "../enums/guardian-relationship.enum";

@ObjectType()
export class FamilyGuardianSummary {
  @Field()
  id: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => GuardianRelationship)
  relationship: GuardianRelationship;

  @Field()
  emailNotifications: boolean;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phoneNumber?: string;
}
