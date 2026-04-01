import { Teacher as PrismaTeacher } from '@prisma/client'
import { Teacher, TeacherStatus } from '../entities/teacher.entity'

export function mapTeacherToEntity(prismaTeacher: PrismaTeacher): Teacher {
	const statusMap: Record<string, TeacherStatus> = {
		ENABLED: TeacherStatus.ENABLED,
		DISABLED: TeacherStatus.DISABLED,
	}

	return {
		...prismaTeacher,
		status: statusMap[prismaTeacher.status] || TeacherStatus.ENABLED,
	}
}
