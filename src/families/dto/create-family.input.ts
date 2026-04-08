import { InputType, Field } from '@nestjs/graphql';
import { IsString, MinLength, MaxLength } from 'class-validator';

@InputType()
export class CreateFamilyInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;
}
