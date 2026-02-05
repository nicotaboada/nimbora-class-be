import { ObjectType, Field, registerEnumType } from "@nestjs/graphql";

export enum StudentStatus {
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
}

registerEnumType(StudentStatus, {
  name: "StudentStatus",
  description: "Estado del estudiante (activado/desactivado)",
});

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

  @Field(() => StudentStatus)
  status: StudentStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
