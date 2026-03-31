import { ObjectType, Field, registerEnumType, Int } from '@nestjs/graphql'

export enum TeacherStatus {
	ENABLED = 'ENABLED',
	DISABLED = 'DISABLED',
}

registerEnumType(TeacherStatus, {
	name: 'TeacherStatus',
	description: 'Estado del profesor (activado/desactivado)',
})

@ObjectType()
export class Teacher {
	@Field() id: string

	@Field() academyId: string

	@Field() firstName: string

	@Field() lastName: string

	@Field({ nullable: true }) phoneNumber?: string

	@Field(() => TeacherStatus) status: TeacherStatus

	@Field() createdAt: Date

	@Field() updatedAt: Date
}

@ObjectType()
export class TeacherStats {
	@Field(() => Int) total: number

	@Field(() => Int) active: number

	@Field(() => Int) inactive: number
}
