import { ObjectType, Field, Int } from "@nestjs/graphql";
import { Program } from "../../programs/entities/program.entity";
import { Teacher } from "../../teachers/entities/teacher.entity";

@ObjectType("Class")
export class ClassEntity {
  @Field()
  id: string;

  @Field()
  academyId: string;

  @Field()
  name: string;

  @Field(() => Program)
  program: Program;

  @Field(() => Teacher, { nullable: true })
  teacher?: Teacher;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field(() => Int, { nullable: true })
  capacity?: number;

  @Field({ nullable: true })
  code?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { defaultValue: [] })
  tags: string[];

  @Field(() => Int, { defaultValue: 0 })
  studentCount: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
