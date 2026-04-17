import { ObjectType, Field, Int } from "@nestjs/graphql";
import { ClassEntity } from "../../classes/entities/class.entity";
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

  @Field({ nullable: true }) email?: string;

  @Field({ nullable: true }) phoneCountryCode?: string;

  @Field({ nullable: true }) phoneNumber?: string;

  @Field({ nullable: true }) address?: string;

  @Field({ nullable: true }) country?: string;

  @Field({ nullable: true }) state?: string;

  @Field({ nullable: true }) city?: string;

  @Field({ nullable: true }) postalCode?: string;

  @Field(() => [ClassEntity], { nullable: true }) classes?: ClassEntity[];

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
