# Plan: Query `availableStudentsForClass`

## Context

Se necesita una nueva query GraphQL para el slideout de "Agregar estudiantes a clase". El slideout necesita listar los estudiantes que **no pertenecen** a la clase seleccionada, con soporte de búsqueda por nombre y paginación. No existe ninguna query similar actualmente.

## Archivos a modificar

- `src/classes/classes.resolver.ts` — agregar el nuevo `@Query`
- `src/classes/classes.service.ts` — agregar el método de servicio

## Archivos a crear

- `src/classes/dto/available-students-filter.input.ts` — DTO de filtro para la query

## Plan

### 1. Crear DTO `AvailableStudentsFilterInput`

**Archivo nuevo:** `src/classes/dto/available-students-filter.input.ts`

```ts
@InputType()
export class AvailableStudentsFilterInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}
```

Extiende `PaginationInput` (de `src/common/dto/pagination.input.ts`) que ya tiene `page` (default 1) y `limit` (default 10, max 100).

### 2. Agregar método al servicio

**Archivo:** `src/classes/classes.service.ts`

Nuevo método `findAvailableStudentsForClass`:

```ts
async findAvailableStudentsForClass(
  classId: string,
  academyId: string,
  filter: AvailableStudentsFilterInput,
): Promise<PaginatedClassStudents> {
  // Validar ownership de la clase
  const cls = await this.prisma.class.findUnique({ where: { id: classId } });
  assertOwnership(cls, academyId, "Clase");

  const validPage = Math.max(1, filter.page ?? 1);
  const validLimit = Math.min(Math.max(1, filter.limit ?? 10), 100);
  const skip = (validPage - 1) * validLimit;

  const where: Prisma.StudentWhereInput = {
    academyId,
    classStudents: { none: { classId } },  // excluye estudiantes ya en la clase
    ...(filter.search && {
      OR: [
        { firstName: { contains: filter.search, mode: "insensitive" } },
        { lastName: { contains: filter.search, mode: "insensitive" } },
      ],
    }),
  };

  const [total, students] = await Promise.all([
    this.prisma.student.count({ where }),
    this.prisma.student.findMany({
      where,
      skip,
      take: validLimit,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  const totalPages = Math.ceil(total / validLimit);

  return {
    data: students.map(mapStudentToEntity),
    meta: {
      total,
      page: validPage,
      limit: validLimit,
      totalPages,
      hasNextPage: validPage < totalPages,
      hasPreviousPage: validPage > 1,
    },
  };
}
```

**Reutiliza:**
- `assertOwnership` (`src/common/utils/`)
- `mapStudentToEntity` (`src/students/utils/student-mapper.util.ts`)
- `PaginatedClassStudents` (`src/classes/dto/paginated-class-students.output.ts`) — misma shape, no crear nuevo DTO
- `Prisma.StudentWhereInput` para tipado seguro

### 3. Agregar query al resolver

**Archivo:** `src/classes/classes.resolver.ts`

```ts
@Query(() => PaginatedClassStudents)
availableStudentsForClass(
  @Args("classId") classId: string,
  @Args("filter", { nullable: true }) filter: AvailableStudentsFilterInput = {},
  @CurrentUser() user: User,
): Promise<PaginatedClassStudents> {
  return this.classesService.findAvailableStudentsForClass(classId, user.academyId, filter ?? {});
}
```

## Output de la query

Retorna `PaginatedClassStudents` (reutilizado):
```
{
  data: Student[]   // estudiantes NO en la clase
  meta: {
    total, page, limit, totalPages, hasNextPage, hasPreviousPage
  }
}
```

## Query GraphQL resultante

```graphql
query AvailableStudentsForClass($classId: String!, $filter: AvailableStudentsFilterInput) {
  availableStudentsForClass(classId: $classId, filter: $filter) {
    data {
      id
      firstName
      lastName
      email
      status
    }
    meta {
      total
      page
      limit
      totalPages
      hasNextPage
      hasPreviousPage
    }
  }
}
```

## Verificación

1. `npm run start:dev` — compilación sin errores
2. Abrir `schema.gql` generado y verificar que aparece `availableStudentsForClass`
3. Probar en playground con una clase que tiene estudiantes asignados → verificar que no aparecen en el resultado
4. Probar `search: "Juan"` → solo devuelve estudiantes con ese nombre que no están en la clase
5. Probar paginación con `page: 2, limit: 5`
