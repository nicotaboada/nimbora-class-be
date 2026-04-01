import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateTeacherInput } from './dto/create-teacher.input'
import { UpdateTeacherInput } from './dto/update-teacher.input'
import { mapTeacherToEntity } from './utils/teacher-mapper.util'
import { Teacher, TeacherStats } from './entities/teacher.entity'
import { assertOwnership } from 'src/common/utils/tenant-validation'

@Injectable()
export class TeachersService {
	constructor(private readonly prisma: PrismaService) {}

	async create(input: CreateTeacherInput, academyId: string): Promise<Teacher> {
		const teacher = await this.prisma.teacher.create({
			data: {
				...input,
				academyId,
			},
		})

		return mapTeacherToEntity(teacher)
	}

	async findAll(
		page: number,
		limit: number,
		search?: string,
		status?: string,
		academyId?: string,
	): Promise<{ data: Teacher[]; meta: any }> {
		const skip = (page - 1) * limit

		const where: any = {
			academyId,
		}

		if (search) {
			where.OR = [
				{ firstName: { contains: search, mode: 'insensitive' } },
				{ lastName: { contains: search, mode: 'insensitive' } },
			]
		}

		if (status) {
			where.status = status
		}

		const [teachers, total] = await Promise.all([
			this.prisma.teacher.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.teacher.count({ where }),
		])

		return {
			data: teachers.map(mapTeacherToEntity),
			meta: {
				page,
				limit,
				total,
				hasNextPage: skip + limit < total,
				hasPreviousPage: page > 1,
			},
		}
	}

	async findOne(id: string, academyId: string): Promise<Teacher> {
		const teacher = await this.prisma.teacher.findUnique({
			where: { id },
		})

		assertOwnership(teacher, academyId, 'Teacher')

		return mapTeacherToEntity(teacher)
	}

	async update(input: UpdateTeacherInput, academyId: string): Promise<Teacher> {
		const { id, ...updateData } = input

		const teacher = await this.prisma.teacher.findUnique({
			where: { id },
		})

		assertOwnership(teacher, academyId, 'Teacher')

		const updated = await this.prisma.teacher.update({
			where: { id },
			data: updateData,
		})

		return mapTeacherToEntity(updated)
	}

	async remove(id: string, academyId: string): Promise<Teacher> {
		const teacher = await this.prisma.teacher.findUnique({
			where: { id },
		})

		assertOwnership(teacher, academyId, 'Teacher')

		const deleted = await this.prisma.teacher.delete({
			where: { id },
		})

		return mapTeacherToEntity(deleted)
	}

	async getStats(academyId: string): Promise<TeacherStats> {
		const [total, active, inactive] = await Promise.all([
			this.prisma.teacher.count({ where: { academyId } }),
			this.prisma.teacher.count({
				where: { academyId, status: 'ENABLED' },
			}),
			this.prisma.teacher.count({
				where: { academyId, status: 'DISABLED' },
			}),
		])

		return { total, active, inactive }
	}
}
