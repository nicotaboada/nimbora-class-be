import { ObjectType, Field } from "@nestjs/graphql";
import { Status, Language } from "../../common/enums";

@ObjectType()
export class Program {
  @Field()
  id: string;

  @Field()
  academyId: string;

  @Field()
  name: string;

  @Field(() => Language)
  language: Language;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Status)
  status: Status;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
