import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StudentStatus } from '../entities/student.entity';

@InputType()
export class UpdateStudentInput {
  @Field()
  @IsNotEmpty({ message: 'El ID es requerido' })
  @IsString()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @Field(() => StudentStatus, { nullable: true })
  @IsOptional()
  @IsEnum(StudentStatus, { message: 'El status debe ser ENABLED o DISABLED' })
  status?: StudentStatus;
}
