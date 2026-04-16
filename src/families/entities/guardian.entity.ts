import { ObjectType, Field } from "@nestjs/graphql";
import { GuardianRelationship } from "../enums/guardian-relationship.enum";
import { DocumentType, Gender } from "../../common/enums";
import { FamilyStudentSummary } from "./family-student-summary.entity";

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
  birthDate?: Date;

  @Field(() => Gender, { nullable: true })
  gender?: Gender;

  @Field(() => DocumentType, { nullable: true })
  documentType?: DocumentType;

  @Field({ nullable: true })
  documentNumber?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phoneCountryCode?: string;

  @Field({ nullable: true })
  phoneNumber?: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  state?: string;

  @Field({ nullable: true })
  country?: string;

  @Field({ nullable: true })
  postalCode?: string;

  @Field({ nullable: true })
  familyId?: string;

  @Field()
  academyId: string;

  @Field()
  emailNotifications: boolean;

  @Field()
  isResponsibleForBilling: boolean;

  @Field()
  isActive: boolean;

  @Field(() => [FamilyStudentSummary])
  students: FamilyStudentSummary[];

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field()
  createdAt: Date;
}
