import { InputType, Field } from '@nestjs/graphql'
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator'
import { TeacherStatus } from '../entities/teacher.entity'

@InputType()
export class UpdateTeacherInput {
	@IsNotEmpty({ message: 'El ID es requerido' })
	@IsString({ message: 'El ID debe ser texto' })
	@Field()
	id: string

	@IsOptional()
	@IsString({ message: 'El nombre debe ser texto' })
	@Field({ nullable: true })
	firstName?: string

	@IsOptional()
	@IsString({ message: 'El apellido debe ser texto' })
	@Field({ nullable: true })
	lastName?: string

	@IsOptional()
	@IsString({ message: 'El teléfono debe ser texto' })
	@Field({ nullable: true })
	phoneNumber?: string

	@IsOptional()
	@IsEnum(TeacherStatus, { message: 'Estado inválido' })
	@Field(() => TeacherStatus, { nullable: true })
	status?: TeacherStatus
}
