# Plan: `familyStudents` + `availableStudentsForFamily` + `setFamilyStudents`

## Context
Se necesita soportar el modal "Inscribir estudiante" para familias. El approach inicial (una sola query con raw SQL + family-first ordering) se descarta. La UI usa tabs "Inscriptos / No inscriptos" igual que el modal de clases.

**Nuevo enfoque:** seguir exactamente el patrón de `classStudents` + `availableStudentsForClass` + `assignStudentsToClass` del módulo de clases.

**Estado actual del código** (escrito en sesión anterior — hay que REEMPLAZAR):
- `families.service.ts`: `findStudentsForFamily` (raw SQL) y `addStudentsToFamily` (additive) → borrar
- `families.resolver.ts`: query `studentsForFamily` y mutation `addStudentsToFamily` → borrar
- `dto/students-for-family.input.ts` → eliminar
- `dto/add-students-to-family.input.ts` → reutilizar como `set-family-students.input.ts`

---

## 1. Query: `familyStudents` — estudiantes YA en la familia

Espejo exacto de `classStudents`. Queries el join table `FamilyStudent`.

```graphql
familyStudents(
  familyId: String!
  page: Int = 1
  limit: Int = 10
  search: String
): PaginatedStudents
```

**Service** — busca en `FamilyStudent` join table con `include: { student: true }`:
```ts
const where: Prisma.FamilyStudentWhereInput = {
  familyId,
  ...(search && { student: { OR: [
    { firstName: { contains: search, mode: 'insensitive' } },
    { lastName: { contains: search, mode: 'insensitive' } },
  ]}}),
};
const [total, familyStudents] = await Promise.all([
  this.prisma.familyStudent.count({ where }),
  this.prisma.familyStudent.findMany({ where, include: { student: true }, skip, take, orderBy: { createdAt: 'asc' } }),
]);
return { data: familyStudents.map(fs => mapStudentToEntity(fs.student)), meta };
```

---

## 2. Query: `availableStudentsForFamily` — estudiantes NO en la familia

Espejo de `availableStudentsForClass`. Usa `families: { none: { familyId } }`.

```graphql
availableStudentsForFamily(
  familyId: String!
  filter: AvailableStudentsForFamilyInput
): PaginatedStudents
```

**DTO nuevo** `AvailableStudentsForFamilyInput` (igual a `AvailableStudentsFilterInput` de clases):
```ts
@InputType()
export class AvailableStudentsForFamilyInput {
  page?: number;
  limit?: number;
  search?: string;
}
```

**Service**:
```ts
const where: Prisma.StudentWhereInput = {
  academyId,
  families: { none: { familyId } },  // Excluir los ya en la familia
  ...(filter?.search && { OR: [
    { firstName: { contains: filter.search, mode: 'insensitive' } },
    { lastName: { contains: filter.search, mode: 'insensitive' } },
  ]}),
};
const [total, students] = await Promise.all([
  this.prisma.student.count({ where }),
  this.prisma.student.findMany({ where, skip, take, orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }] }),
]);
```

---

## 3. Mutation: `setFamilyStudents` — full sync (reemplaza lista completa)

Espejo de `assignStudentsToClass`. DELETE todas las relaciones + CREATE nuevas.

```graphql
setFamilyStudents(setFamilyStudentsInput: SetFamilyStudentsInput!): Family
```

**DTO** (reutilizar `add-students-to-family.input.ts` renombrando clase a `SetFamilyStudentsInput`):
```ts
@InputType()
export class SetFamilyStudentsInput {
  familyId: string;
  studentIds: string[];
}
```

**Service**:
```ts
// 1. assertOwnership de la familia
// 2. Validate all students belong to academy (findMany + length check)
// 3. deleteMany({ where: { familyId } })
// 4. createMany({ data: studentIds.map(id => ({ familyId, studentId: id, academyId })) })
// 5. return this.findOne(familyId, academyId)
```

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `src/families/families.service.ts` | Reemplazar `findStudentsForFamily` y `addStudentsToFamily` → 3 nuevos métodos |
| `src/families/families.resolver.ts` | Reemplazar `studentsForFamily` query y `addStudentsToFamily` mutation → 3 nuevos |
| `src/families/dto/students-for-family.input.ts` | Eliminar (ya no se necesita) |
| `src/families/dto/add-students-to-family.input.ts` | Renombrar clase a `SetFamilyStudentsInput` |
| `src/families/dto/available-students-for-family.input.ts` | Crear nuevo |

**Reusar sin cambios:**
- `PaginatedStudents` — `src/students/dto/paginated-students.output.ts`
- `mapStudentToEntity` — `src/students/utils/student-mapper.util.ts`
- `assertOwnership` — `src/common/utils/tenant-validation`
- Pagination pattern (validPage, validLimit, meta) idéntico al resto

---

## Verification
1. `npm run build` — sin errores
2. GraphQL schema: `familyStudents`, `availableStudentsForFamily`, `setFamilyStudents` aparecen
3. `familyStudents(familyId: "X")` → solo los que están en la familia
4. `availableStudentsForFamily(familyId: "X")` → solo los que NO están
5. `setFamilyStudents({ familyId: "X", studentIds: ["A","B"] })` → devuelve familia; re-llamar con `["A"]` elimina a B
6. Ownership check: familyId de otra academy → error
