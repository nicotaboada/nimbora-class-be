# Plan: Módulo Familias — Backend + Frontend

## Context

Se necesita una nueva sección "Familias" que liste las familias registradas en la academia. El backend tiene los modelos Prisma (`Family`, `FamilyGuardian`, `FamilyStudent`) pero no hay ningún módulo NestJS ni página frontend. La query debe retornar nombre, conteo de miembros, estudiantes (para avatares) y tutores/guardianes (con indicador de notificaciones email). En el front se renderiza una tabla con 4 columnas + acciones, con toggle list/grid (solo list implementado por ahora).

---

## Backend — NestJS GraphQL Module

### Archivos a crear: `be/src/families/`

**1. `entities/family-guardian-summary.entity.ts`**
```ts
@ObjectType()
export class FamilyGuardianSummary {
  @Field() id: string
  @Field() firstName: string
  @Field() lastName: string
  @Field() emailNotifications: boolean
}
```

**2. `entities/family-student-summary.entity.ts`**
```ts
@ObjectType()
export class FamilyStudentSummary {
  @Field() id: string       // studentId
  @Field() firstName: string
  @Field() lastName: string
}
```

**3. `entities/family.entity.ts`**
```ts
@ObjectType()
export class Family {
  @Field() id: string
  @Field() name: string
  @Field(() => Int) membersCount: number
  @Field(() => [FamilyStudentSummary]) students: FamilyStudentSummary[]
  @Field(() => [FamilyGuardianSummary]) guardians: FamilyGuardianSummary[]
  @Field() createdAt: Date
}
```

**4. `dto/paginated-families.output.ts`**  
Sigue el mismo patrón que `paginated-students.output.ts` — wraps `Family[]` + `PaginationMeta`.

**5. `utils/family-mapper.util.ts`**
- Input: resultado de `prisma.family.findMany({ include: { students: { include: { student: true } }, guardians: true } })`
- `membersCount = family.students.length + family.guardians.length`
- Mapea `family.students[].student` → `FamilyStudentSummary`
- Mapea `family.guardians[]` → `FamilyGuardianSummary`

**6. `families.service.ts`**
```ts
async findAll(academyId, page, limit, search?) {
  const where: Prisma.FamilyWhereInput = { academyId }
  if (search) where.name = { contains: search, mode: 'insensitive' }

  const [total, data] = await Promise.all([
    prisma.family.count({ where }),
    prisma.family.findMany({
      where,
      skip, take,
      orderBy: { createdAt: 'desc' },
      include: {
        students: { include: { student: { select: { id, firstName, lastName } } } },
        guardians: { select: { id, firstName, lastName, emailNotifications } },
      },
    }),
  ])
  // build meta + map data
}
```

**7. `families.resolver.ts`**
- `@Query(() => PaginatedFamilies, { name: 'families' })`
- Args: `page: Int (default 1)`, `limit: Int (default 10)`, `search?: String`
- Auth: `@UseGuards(SupabaseAuthGuard)` en la clase
- `academyId` desde `@CurrentUser()`

**8. `families.module.ts`** — providers: `[FamiliesResolver, FamiliesService]`

### Archivo a modificar

**`be/src/app.module.ts`** — importar y registrar `FamiliesModule`

---

## Frontend — Next.js

### Archivos a crear: `web/modules/families/`

**`graphql/queries.ts`**
```graphql
query GetFamilies($page: Int, $limit: Int, $search: String) {
  families(page: $page, limit: $limit, search: $search) {
    data {
      id name membersCount
      students { id firstName lastName }
      guardians { id firstName lastName emailNotifications }
    }
    meta { total page limit totalPages hasNextPage hasPreviousPage }
  }
}
```

**`types/index.ts`** — tipos TypeScript `Family`, `FamilyStudentSummary`, `FamilyGuardianSummary` alineados con la respuesta GraphQL.

**`components/families-table.tsx`**  
Sigue el patrón exacto de `students-table.tsx`:
- Props: `families`, `paginationMeta`, `onNextPage`, `onPreviousPage`, `loading`, `filterSlot`, `viewMode: 'list' | 'grid'`
- Columnas:
  1. **Nombre de Familia** — texto plano bold
  2. **Miembros** — ícono `Users` + número (`membersCount`)
  3. **Estudiantes** — grupo de `<PersonAvatar size="sm">` con overlap (`-ml-2` en los no-primeros, máx 3 visible + "+N")
  4. **Tutores** — igual que estudiantes pero con badge de `<Mail size={10}>` superpuesto, verde si `emailNotifications=true`, gris si false
  5. **Acciones** — `<DropdownMenu>` con `MoreHorizontal`
- View toggle UI (list/grid icons) en el header de la Card, solo list implementado

**`web/app/(authenticated)/families/page.tsx`**
- `'use client'`
- Usa `useBackendPagination(GET_FAMILIES, 'families', 10, { search })`
- Usa `useSearchInput` para el filtro de nombre
- `viewMode` state: `useState<'list' | 'grid'>('list')`
- Header con título "Familias", botón "+ Nueva Familia" (no funcional aún)
- Botón "Importar Familia" (no funcional aún)

### Archivos a modificar

**`web/lib/config/routes.ts`**
```ts
FAMILIES: '/families',
FAMILY_DETAIL: (id: string) => `/families/${id}`,
// + agregar '/families' a PROTECTED_ROUTE_PREFIXES
```

**`web/lib/config/sidebar-nav.ts`**
```ts
// Agregar entre 'teachers' y 'classes':
{ id: 'families', label: 'Familias', href: ROUTES.FAMILIES, icon: Users }
```

---

## Verification

1. `cd be && npm run start:dev` — servidor arranca sin errores
2. Abrir GraphQL playground en `localhost:3000/graphql`
3. Ejecutar query `families(page: 1, limit: 10)` con JWT válido → responde con `data[]` y `meta`
4. Ejecutar con `search: "Garcia"` → filtra por nombre
5. En el frontend: navegar a `/families` → carga la tabla con las familias
6. Verificar que avatares de estudiantes y tutores renderizan con iniciales
7. Verificar que ícono de email es verde/gris según `emailNotifications`
8. Toggle list/grid cambia el estado visualmente (grid muestra la misma tabla por ahora)
