import { InputType, Field } from "@nestjs/graphql";
import {
  IsString,
  IsOptional,
  IsDate,
  MinLength,
  MaxLength,
  IsInt,
  Min,
} from "class-validator";

@InputType()
export class CreateClassInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @Field()
  @IsString()
  programId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;
}
