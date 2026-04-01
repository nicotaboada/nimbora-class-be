import { Resolver, Query, Mutation, Args } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { CurrentUser } from 'src/auth/decorators/current-user.decorator'
import { SupabaseAuthGuard } from 'src/auth/guards/supabase-auth.guard'
import { User } from 'src/users/entities/user.entity'
import { TeachersService } from './teachers.service'
import { Teacher, TeacherStats } from './entities/teacher.entity'
import { PaginatedTeachers } from './dto/paginated-teachers.output'
import { CreateTeacherInput } from './dto/create-teacher.input'
import { UpdateTeacherInput } from './dto/update-teacher.input'
import { TeacherStatus } from './entities/teacher.entity'

@Resolver(() => Teacher)
@UseGuards(SupabaseAuthGuard)
export class TeachersResolver {
	constructor(private readonly teachersService: TeachersService) {}

	@Mutation(() => Teacher)
	async createTeacher(
		@Args('createTeacherInput') createTeacherInput: CreateTeacherInput,
		@CurrentUser() user: User,
	): Promise<Teacher> {
		return this.teachersService.create(createTeacherInput, user.academyId)
	}

	@Query(() => Teacher, { name: 'teacher' })
	async findOne(
		@Args('id', { type: () => String }) id: string,
		@CurrentUser() user: User,
	): Promise<Teacher> {
		return this.teachersService.findOne(id, user.academyId)
	}

	@Query(() => PaginatedTeachers, { name: 'teachers' })
	async findAll(
		@Args('page', { type: () => Number, defaultValue: 1 }) page: number,
		@Args('limit', { type: () => Number, defaultValue: 25 }) limit: number,
		@Args('search', { type: () => String, nullable: true }) search?: string,
		@Args('status', { type: () => TeacherStatus, nullable: true })
		status?: TeacherStatus,
		@CurrentUser() user: User,
	): Promise<any> {
		return this.teachersService.findAll(page, limit, search, status, user.academyId)
	}

	@Mutation(() => Teacher)
	async updateTeacher(
		@Args('updateTeacherInput') updateTeacherInput: UpdateTeacherInput,
		@CurrentUser() user: User,
	): Promise<Teacher> {
		return this.teachersService.update(updateTeacherInput, user.academyId)
	}

	@Mutation(() => Teacher)
	async removeTeacher(
		@Args('id', { type: () => String }) id: string,
		@CurrentUser() user: User,
	): Promise<Teacher> {
		return this.teachersService.remove(id, user.academyId)
	}

	@Query(() => TeacherStats, { name: 'teacherStats' })
	async getStats(@CurrentUser() user: User): Promise<TeacherStats> {
		return this.teachersService.getStats(user.academyId)
	}
}
