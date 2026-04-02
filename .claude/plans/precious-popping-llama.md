# Plan: Módulo de Profesores — Lista + Crear (FE + BE)

## Contexto

Actualmente `/app/(authenticated)/teachers/page.tsx` es un placeholder y no existe ningún módulo `modules/teachers/` ni `src/teachers/` en el BE. El `UserRole` ya tiene `TEACHER` como valor, pero no hay entidad `Teacher` separada ni en Prisma ni en el backend.

**Scope:** Crear la entidad Teacher en BE (Prisma + NestJS/GraphQL) y la UI de lista + creación en FE. Sin página de detalle funcional en FE (solo template). Las clases no existen todavía, por lo que el campo `classes` va como `MOCK_CLASSES` en FE y se omite en BE por ahora.

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

## FRONTEND

### FE-1. Types — `modules/teachers/types/teacher.ts`

- `TeacherStatus` enum: `ENABLED | DISABLED`
- `Teacher` interface: `id`, `firstName`, `lastName`, `phoneNumber?`, `status`, `createdAt`, `updatedAt`
- `CreateTeacherInput`: `firstName`, `lastName`, `phoneNumber?`
- `CreateTeacherFormInput`: `firstName`, `lastName`, `phoneNumber?`, `class?`
- `createTeacherSchema`: Zod — firstName y lastName requeridos, phoneNumber y class opcionales
- `MOCK_CLASSES`: `[{ id: '1', name: 'Clase 1' }, ...]` (mismo patrón que `MOCK_COURSES`)
- `getTeacherFullName()`, `getTeacherInitials()` — misma lógica que helpers de estudiante
- `PaginatedTeachersResponse`

### FE-2. Types index — `modules/teachers/types/index.ts`
Barrel re-exports de `teacher.ts`.

### FE-3. GraphQL Queries — `modules/teachers/graphql/queries.ts`

```graphql
GET_TEACHERS: query GetTeachers($page, $limit, $search, $status: TeacherStatus)
  → teachers { data { id firstName lastName phoneNumber status createdAt } meta { ... } }

GET_TEACHER: query Teacher($id: String!)
  → teacher { id firstName lastName phoneNumber status createdAt updatedAt }
```

### FE-4. GraphQL Mutations — `modules/teachers/graphql/mutations.ts`

```graphql
CREATE_TEACHER: mutation CreateTeacher($input: CreateTeacherInput!)
  → createTeacher { id firstName lastName }

UPDATE_TEACHER: mutation UpdateTeacher($input: UpdateTeacherInput!)
  → updateTeacher { id status }
```

### FE-5. Teachers Table — `modules/teachers/components/teachers-table.tsx`

Modelo de `modules/students/components/students-table.tsx`.

**Columnas:**
| Columna | Contenido |
|---|---|
| Profesor | `StudentAvatar` (reusar) + nombre completo como link a `/teachers/[id]` |
| Teléfono | `phoneNumber` con ícono `Phone`, o `—` si vacío |
| Clases | Chips `<Badge>` con ícono `BookOpen` (vacío hasta que exista la entidad) |
| Estado | `<Badge>` verde/gris: `ENABLED` → "Activo", `DISABLED` → "Desactivado" |
| Fecha de creación | `formatDate(createdAt)` de `lib/utils/helpers.ts` |
| Acciones | `<DropdownMenu>` con: Editar / Activar/Desactivar |

**Props:** `teachers`, `paginationMeta`, `onCreateTeacher`, `onNextPage`, `onPreviousPage`, `searchQuery`, `loading`, `filterSlot?`

**Reusar:** `StudentAvatar`, `TableSkeletonRows`, `TableEmptyState`, `TablePagination`.

### FE-6. Create Teacher Sheet — `modules/teachers/components/create-teacher-sheet.tsx`

Modelo de `modules/students/components/create-student-sheet.tsx`.

**Campos:**
1. `firstName` — requerido
2. `lastName` — requerido
3. `phoneNumber` — opcional, placeholder "ej: +54 11 1234-5678"
4. `class` — Select con `MOCK_CLASSES`, opcional

**Props:** `open`, `onOpenChange`, `onTeacherCreated?`

Usa `useMutation(CREATE_TEACHER)` + `useForm` + `zodResolver(createTeacherSchema)`.

### FE-7. Teachers Page — `app/(authenticated)/teachers/page.tsx`

Reemplazar placeholder completo. Mismo patrón que `app/(authenticated)/students/page.tsx`:
- `useSearchInput`, `useTableFilters({ status: null })`, `useBackendPagination` con `GET_TEACHERS`
- Header: "Profesores" + Button "Nuevo Profesor"
- `<TeachersTable filterSlot={<SearchInput + StatusFilter>} />`
- `<CreateTeacherSheet />`

### FE-8. Teacher Detail Template — `app/(authenticated)/teachers/[id]/page.tsx`

```tsx
export default function TeacherDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Detalle de Profesor</h1>
      <p className="text-muted-foreground">Próximamente...</p>
    </div>
  )
}
```

---

## Archivos críticos de referencia

| Archivo | Para qué |
|---|---|
| `modules/students/components/students-table.tsx` | Modelo exacto de teachers-table |
| `modules/students/components/create-student-sheet.tsx` | Modelo exacto de create-teacher-sheet |
| `app/(authenticated)/students/page.tsx` | Modelo exacto de teachers/page.tsx |
| `modules/students/types/student.ts` | Modelo de types/teacher.ts |
| `src/students/` (BE) | Modelo exacto del módulo teachers en NestJS |
| `components/common/student-avatar.tsx` | Reusar directo en teachers-table |
| `components/filters/status-filter.tsx` | Reusar directo en teachers page |
| `lib/utils/helpers.ts` | `formatDate()` para la tabla |
| `src/common/utils/tenant-validation.ts` | `assertOwnership` en teachers.service |

---

## Verificación

### Backend
1. `npx prisma migrate dev` corre sin errores → tabla `Teacher` creada en DB
2. Servidor NestJS arranca sin errores
3. GraphQL Playground: `query { teachers { data { id firstName } meta { total } } }` responde `{ data: [], meta: { total: 0 } }`
4. Mutation `createTeacher` crea un profesor y lo retorna con id

### Frontend
1. `pnpm dev` — `/teachers` muestra tabla con header "Profesores" y botón "Nuevo Profesor"
2. Click "Nuevo Profesor" → Sheet abre con campos: Nombre, Apellido, Teléfono, Clase
3. Submit con campos vacíos → validación en firstName y lastName
4. Submit válido → llama `CREATE_TEACHER`, toast de éxito, tabla se refetch
5. Click en un profesor → navega a `/teachers/[id]` con template "Próximamente"
6. `StatusFilter` filtra por ENABLED/DISABLED, `SearchInput` filtra por nombre
7. `pnpm lint:fix` y `pnpm prettier:fix` sin errores
