import { ObjectType, Field } from "@nestjs/graphql";
import { UserRole } from "../enums/user-role.enum";
import { Academy } from "../../academies/entities/academy.entity";

@ObjectType()
export class User {
  @Field()
  id: string;

  @Field()
  supabaseUserId: string;

  @Field()
  academyId: string;

  @Field(() => Academy, { nullable: true })
  academy?: Academy;

  @Field(() => UserRole)
  role: UserRole;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  phone?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
