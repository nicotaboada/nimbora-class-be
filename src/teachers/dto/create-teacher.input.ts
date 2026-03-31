import { InputType, Field } from '@nestjs/graphql'
import { IsNotEmpty, IsString, IsOptional } from 'class-validator'

@InputType()
export class CreateTeacherInput {
	@IsNotEmpty({ message: 'El nombre es requerido' })
	@IsString({ message: 'El nombre debe ser texto' })
	@Field()
	firstName: string

	@IsNotEmpty({ message: 'El apellido es requerido' })
	@IsString({ message: 'El apellido debe ser texto' })
	@Field()
	lastName: string

	@IsOptional()
	@IsString({ message: 'El teléfono debe ser texto' })
	@Field({ nullable: true })
	phoneNumber?: string
}
