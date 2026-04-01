import { ObjectType, Field, Int } from "@nestjs/graphql";
import { ContactInfo } from "../../contact-info/entities/contact-info.entity";
import { Status, Gender, DocumentType } from "../../common/enums";

@ObjectType()
export class Teacher {
  @Field() id: string;

  @Field() academyId: string;

  @Field() firstName: string;

  @Field() lastName: string;

  @Field({ nullable: true }) birthDate?: Date;

  @Field(() => Gender, { nullable: true }) gender?: Gender;

  @Field(() => DocumentType, { nullable: true })
  documentType?: DocumentType;

  @Field({ nullable: true }) documentNumber?: string;

  @Field({ nullable: true }) avatarUrl?: string;

  @Field(() => ContactInfo, { nullable: true }) contactInfo?: ContactInfo;

  @Field(() => Status) status: Status;

  @Field() createdAt: Date;

  @Field() updatedAt: Date;
}

@ObjectType()
export class TeacherStats {
  @Field(() => Int) total: number;

  @Field(() => Int) active: number;

  @Field(() => Int) inactive: number;
}
