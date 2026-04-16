import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType()
export class StudentBulkInvoiceInFamily {
  @Field()
  studentId: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => Int)
  chargeCount: number;

  @Field()
  totalAmount: number;

  @Field(() => [String])
  chargeIds: string[];
}

@ObjectType()
export class FamilyBulkInvoicePreview {
  @Field()
  familyId: string;

  @Field()
  familyName: string;

  @Field(() => Int)
  studentCount: number;

  @Field()
  totalAmount: number;

  @Field(() => [StudentBulkInvoiceInFamily])
  students: StudentBulkInvoiceInFamily[];
}
