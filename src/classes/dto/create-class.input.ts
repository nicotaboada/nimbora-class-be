import { InputType, Field } from "@nestjs/graphql";
import { IsString, IsOptional, MinLength, MaxLength, IsInt, Min } from "class-validator";

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

  @Field()
  @IsString()
  teacherId: string;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
