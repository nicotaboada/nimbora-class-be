import { ObjectType, Field } from '@nestjs/graphql';
import { AcademyStatus } from '../enums/academy-status.enum';

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

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
