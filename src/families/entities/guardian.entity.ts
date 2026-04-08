import { ObjectType, Field } from '@nestjs/graphql';
import { GuardianRelationship } from '../enums/guardian-relationship.enum';

@ObjectType()
export class Guardian {
  @Field()
  id: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => GuardianRelationship)
  relationship: GuardianRelationship;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phoneNumber?: string;

  @Field({ nullable: true })
  familyId?: string;

  @Field()
  academyId: string;

  @Field()
  emailNotifications: boolean;

  @Field()
  createdAt: Date;
}
