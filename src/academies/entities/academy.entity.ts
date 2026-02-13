import { ObjectType, Field } from "@nestjs/graphql";
import { AcademyStatus } from "../enums/academy-status.enum";
import { AcademyFeature } from "../../feature-flags/entities/academy-feature.entity";

@ObjectType()
export class Academy {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field(() => AcademyStatus)
  status: AcademyStatus;

  @Field()
  country: string;

  @Field()
  currency: string;

  @Field()
  timezone: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  address?: string;

  @Field()
  ownerUserId: string;

  @Field(() => [AcademyFeature], {
    nullable: true,
    description: "Feature flags de la academia",
  })
  features?: AcademyFeature[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
