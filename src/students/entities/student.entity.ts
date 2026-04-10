import { ObjectType, Field } from "@nestjs/graphql";
import { Status, Gender, DocumentType } from "../../common/enums";
import { ClassEntity } from "../../classes/entities/class.entity";

@ObjectType()
export class Student {
  @Field()
  id: string;

  @Field()
  academyId: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  phoneNumber?: string;

  @Field({ nullable: true })
  birthDate?: Date;

  @Field(() => Gender, { nullable: true })
  gender?: Gender;

  @Field(() => DocumentType, { nullable: true })
  documentType?: DocumentType;

  @Field({ nullable: true })
  documentNumber?: string;

  @Field({ nullable: true })
  phoneCountryCode?: string;

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

  @Field(() => Status)
  status: Status;

  @Field({ nullable: true })
  familyId?: string;

  @Field(() => [ClassEntity], { nullable: true })
  classes?: ClassEntity[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
