# Plan: Módulo de Profesores — Backend (BE-1 a BE-8)

## Contexto

Backend del módulo de Profesores en NestJS + GraphQL. Implementa CRUD completo con multi-tenancy por academy.

**Scope (Backend):** Schema Prisma, entidades GraphQL, DTOs, servicio con validaciones y paginación, resolver con guards, module e integración en AppModule.

---

## BACKEND

### BE-1. Prisma Schema — `prisma/schema.prisma`

Agregar debajo de la sección `STUDENTS MODULE`:

```prisma
// ============================================================================
// TEACHERS MODULE
// ============================================================================

enum TeacherStatus {
  ENABLED
  DISABLED
}

model Teacher {
  id          String        @id @default(uuid())
  firstName   String
  lastName    String
  phoneNumber String?
  status      TeacherStatus @default(ENABLED)

  academyId   String
  academy     Academy       @relation(fields: [academyId], references: [id])

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([academyId])
}
```

También agregar `teachers Teacher[]` al model `Academy`.

Luego correr:
```bash
npx prisma migrate dev --name add-teachers-module
npx prisma generate
```

---

### BE-2. Entity — `src/teachers/entities/teacher.entity.ts`

```typescript
export enum TeacherStatus { ENABLED = "ENABLED", DISABLED = "DISABLED" }
registerEnumType(TeacherStatus, { name: "TeacherStatus", description: "Estado del profesor" })

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
```

### BE-3. Stats Entity — `src/teachers/entities/teacher-stats.entity.ts`

```typescript
@ObjectType()
export class TeacherStats {
  @Field(() => Int) total: number
  @Field(() => Int) active: number
  @Field(() => Int) inactive: number
}
```

### BE-4. DTOs

**`src/teachers/dto/create-teacher.input.ts`**
```typescript
@InputType()
export class CreateTeacherInput {
  @IsNotEmpty() @IsString() @Field() firstName: string
  @IsNotEmpty() @IsString() @Field() lastName: string
  @IsOptional() @IsString() @Field({ nullable: true }) phoneNumber?: string
}
```

**`src/teachers/dto/update-teacher.input.ts`**
```typescript
@InputType()
export class UpdateTeacherInput {
  @IsNotEmpty() @IsString() @Field() id: string
  @IsOptional() @IsString() @Field({ nullable: true }) firstName?: string
  @IsOptional() @IsString() @Field({ nullable: true }) lastName?: string
  @IsOptional() @IsString() @Field({ nullable: true }) phoneNumber?: string
  @IsOptional() @IsEnum(TeacherStatus) @Field(() => TeacherStatus, { nullable: true }) status?: TeacherStatus
}
```

**`src/teachers/dto/paginated-teachers.output.ts`**
```typescript
@ObjectType()
export class PaginatedTeachers {
  @Field(() => [Teacher]) data: Teacher[]
  @Field(() => PaginationMeta) meta: PaginationMeta
}
```

### BE-5. Mapper — `src/teachers/utils/teacher-mapper.util.ts`

Mismo patrón que `student-mapper.util.ts`:
```typescript
export function mapTeacherToEntity(prismaTeacher: PrismaTeacher): Teacher {
  const statusMap = { ENABLED: TeacherStatus.ENABLED, DISABLED: TeacherStatus.DISABLED }
  return { ...prismaTeacher, status: statusMap[prismaTeacher.status] }
}
```

### BE-6. Service — `src/teachers/teachers.service.ts`

Inyecta `PrismaService`. Métodos:
- `create(input, academyId)` → `prisma.teacher.create`
- `findAll(page, limit, search?, status?, academyId)` → paginado con `skip/take`, filtro opcional por `firstName/lastName` con `contains` (case insensitive), retorna `{ data, meta }`
- `findOne(id, academyId)` → `assertOwnership`
- `update(input, academyId)` → `assertOwnership` + `prisma.teacher.update`
- `remove(id, academyId)` → `assertOwnership` + `prisma.teacher.delete`
- `getStats(academyId)` → 3 counts en paralelo con `Promise.all`

Reusar: `assertOwnership` de `src/common/utils/tenant-validation.ts`, `PaginationMeta` de `src/common/dto/`.

### BE-7. Resolver — `src/teachers/teachers.resolver.ts`

```typescript
@Resolver(() => Teacher)
@UseGuards(SupabaseAuthGuard)
export class TeachersResolver {
  @Mutation(() => Teacher) createTeacher(...)
  @Mutation(() => Teacher) updateTeacher(...)
  @Mutation(() => Teacher) removeTeacher(...)
  @Query(() => Teacher, { name: 'teacher' }) findOne(...)
  @Query(() => PaginatedTeachers, { name: 'teachers' }) findAll(... @Args('status', { nullable: true }) status?: TeacherStatus)
  @Query(() => TeacherStats, { name: 'teacherStats' }) getStats(...)
}
```

### BE-8. Module + AppModule

**`src/teachers/teachers.module.ts`**
```typescript
@Module({
  imports: [AuthModule],
  providers: [TeachersResolver, TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
```

**`src/app.module.ts`** — agregar `TeachersModule` en imports (junto a `StudentsModule`).

---

## Verificación Backend

1. `npx prisma migrate dev` corre sin errores → tabla `Teacher` creada en DB
2. Servidor NestJS arranca sin errores
3. GraphQL Playground: `query { teachers { data { id firstName } meta { total } } }` responde `{ data: [], meta: { total: 0 } }`
4. Mutation `createTeacher` crea un profesor y lo retorna con id
