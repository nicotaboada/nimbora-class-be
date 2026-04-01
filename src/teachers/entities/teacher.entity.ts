import { ObjectType, Field, registerEnumType, Int } from "@nestjs/graphql";

export enum TeacherStatus {
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
}

export enum TeacherGender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
  NOT_SPECIFIED = "NOT_SPECIFIED",
}

export enum TeacherDocumentType {
  DNI = "DNI",
  PASSPORT = "PASSPORT",
  NIE = "NIE",
  OTHER = "OTHER",
}

registerEnumType(TeacherStatus, {
  name: "TeacherStatus",
  description: "Estado del profesor (activado/desactivado)",
});

registerEnumType(TeacherGender, {
  name: "TeacherGender",
  description: "Género del profesor",
});

registerEnumType(TeacherDocumentType, {
  name: "TeacherDocumentType",
  description: "Tipo de documento de identidad del profesor",
});

@ObjectType()
export class Teacher {
  @Field() id: string;

  @Field() academyId: string;

  @Field() firstName: string;

  @Field() lastName: string;

  @Field({ nullable: true }) email?: string;

  @Field({ nullable: true }) phoneNumber?: string;

  @Field(() => Int, { nullable: true }) birthYear?: number;

  @Field(() => TeacherGender, { nullable: true }) gender?: TeacherGender;

  @Field(() => TeacherDocumentType, { nullable: true })
  documentType?: TeacherDocumentType;

  @Field({ nullable: true }) documentNumber?: string;

  @Field(() => TeacherStatus) status: TeacherStatus;

  @Field() createdAt: Date;

  @Field() updatedAt: Date;
}

@ObjectType()
export class TeacherStats {
  @Field(() => Int) total: number;

  @Field(() => Int) active: number;

  @Field(() => Int) inactive: number;
}
