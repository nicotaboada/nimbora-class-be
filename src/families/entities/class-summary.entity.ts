import { ObjectType, Field } from "@nestjs/graphql";

@ObjectType()
export class ClassSummary {
  @Field()
  id: string;

  @Field()
  name: string;
}
