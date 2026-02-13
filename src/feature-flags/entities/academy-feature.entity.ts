import { ObjectType, Field } from "@nestjs/graphql";

@ObjectType()
export class AcademyFeature {
  @Field()
  id: string;

  @Field()
  academyId: string;

  @Field({ description: "Feature key (e.g. AFIP, PAYMENTS, WHATSAPP)" })
  key: string;

  @Field({ description: "Whether the feature is enabled for this academy" })
  enabled: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
