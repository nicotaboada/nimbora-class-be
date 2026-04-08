import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsEmail, IsOptional, MinLength, MaxLength, IsEnum } from 'class-validator';
import { GuardianRelationship } from '../enums/guardian-relationship.enum';

@InputType()
export class UpdateGuardianInput {
  @Field()
  @IsString()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @Field(() => GuardianRelationship, { nullable: true })
  @IsOptional()
  @IsEnum(GuardianRelationship)
  relationship?: GuardianRelationship;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
