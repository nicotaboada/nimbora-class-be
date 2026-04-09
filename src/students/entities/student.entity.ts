import { ObjectType, Field } from "@nestjs/graphql";
import { Status } from "../../common/enums";

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

  @Field(() => Status)
  status: Status;

  @Field({ nullable: true })
  familyId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
