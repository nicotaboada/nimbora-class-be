import { ObjectType, Field } from "@nestjs/graphql";

@ObjectType()
export class ContactInfo {
  @Field() id: string;

  @Field({ nullable: true }) email?: string;

  @Field({ nullable: true }) phoneCountryCode?: string;

  @Field({ nullable: true }) phoneNumber?: string;

  @Field({ nullable: true }) address?: string;

  @Field({ nullable: true }) country?: string;

  @Field({ nullable: true }) state?: string;

  @Field({ nullable: true }) city?: string;

  @Field({ nullable: true }) postalCode?: string;

  @Field() createdAt: Date;

  @Field() updatedAt: Date;
}
