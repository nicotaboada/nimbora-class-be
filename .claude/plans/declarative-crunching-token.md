# Plan: Query `family` — Detalle de una familia

## Context

El módulo de familias ya existe con una query `families` (lista paginada). Falta la query de detalle `family(id)` que devuelva toda la info necesaria para la pantalla de detalle: nombre, fecha de creación, tutores completos, estudiantes con sus clases inscriptas y (preparado para el futuro) tags.

**Gap adicional encontrado:** `FamilyStudent` no tiene campo `relationship` (Hijo/Hija). Hay que agregarlo con una migración.

---

## Approach: Una sola query `family(id: String!)`

Una sola query es lo correcto acá. GraphQL permite al frontend seleccionar exactamente los campos que necesita, y toda la data es de la misma entidad raíz.

---

## Cambios requeridos

> **Sin migración.** La relación estudiante-clase ya existe en `ClassStudent`. Solo hay que incluirla en el query.

### 1. Entidades GraphQL

**`entities/family.entity.ts`** — agregar `tags`:
```ts
@Field(() => [String])
tags: string[];
```

**`entities/family-guardian-summary.entity.ts`** — expandir con campos de contacto y relación:
```ts
@ObjectType()
export class FamilyGuardianSummary {
  id: string;
  firstName: string;
  lastName: string;
  relationship: GuardianRelationship;   // Padre, Madre, etc.
  emailNotifications: boolean;
  email?: string;          // nullable
  phoneNumber?: string;    // nullable
}
```

**`entities/family-student-summary.entity.ts`** — agregar clases inscriptas:
```ts
@ObjectType()
export class FamilyStudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  classes: ClassSummary[];   // clases del estudiante via ClassStudent → Class
}
```

**Nueva entidad `entities/class-summary.entity.ts`:**
```ts
@ObjectType()
export class ClassSummary {
  @Field()
  id: string;
  @Field()
  name: string;
}
```

---

### 3. Mapper — `utils/family-mapper.util.ts`

Actualizar `mapFamilyToEntity` para incluir:
- `tags` desde el modelo Prisma
- `relationship` en cada guardian
- `relationship` + `classes` en cada student

El query Prisma para `findOne` incluirá:
```ts
include: {
  guardians: true,  // todos los campos de FamilyGuardian
  students: {
    include: {
      student: {
        include: {
          classStudents: {
            include: { class: { select: { id: true, name: true } } },
          },
        },
      },
    },
  },
}
```

---

### 4. Service — `families.service.ts`

Agregar método `findOne`:
```ts
async findOne(id: string, academyId: string): Promise<Family> {
  const family = await this.prisma.family.findUnique({
    where: { id },
    include: { guardians: true, students: { include: { student: { include: { classStudents: { include: { class: { select: { id: true, name: true } } } } } } } } },
  });
  assertOwnership(family?.academyId, academyId);
  return mapFamilyToEntity(family);
}
```

---

### 5. Resolver — `families.resolver.ts`

Agregar query:
```ts
@Query(() => Family, { name: "family" })
async findOne(
  @Args("id") id: string,
  @CurrentUser() user: User,
) {
  return this.familiesService.findOne(id, user.academyId);
}
```

---

## Archivos críticos

| Archivo | Acción |
|---|---|
| `src/families/entities/family.entity.ts` | Agregar `tags` |
| `src/families/entities/family-guardian-summary.entity.ts` | Expandir campos |
| `src/families/entities/family-student-summary.entity.ts` | Agregar `relationship` + `classes` |
| `src/families/entities/class-summary.entity.ts` | Nueva entidad |
| `src/families/utils/family-mapper.util.ts` | Actualizar mapper |
| `src/families/families.service.ts` | Agregar `findOne` |
| `src/families/families.resolver.ts` | Agregar query `family` |

---

## Notas

- **`tags`**: ya está en la DB (`Family.tags TEXT[]`), solo falta exponerlo en la entidad GraphQL. Listo para usar en el futuro.
- **Sin migración**: las clases de un estudiante ya viven en `ClassStudent` → `Class`. Solo hay que incluirlas en el `include` de Prisma al hacer `findOne`.
- **Bug existente en `createGuardian`**: no pasa `relationship` a Prisma (campo requerido). Lo corregimos de paso al tocar el módulo.
- **`findAll` (lista paginada)**: también se beneficia de los campos nuevos en las entidades. El mapper actualizado lo mejora automáticamente.

## Verificación

1. `npm run start:dev` — sin errores de compilación
2. En GraphQL playground:
```graphql
query {
  family(id: "...") {
    id
    name
    createdAt
    tags
    guardians {
      id
      firstName
      lastName
      relationship
      emailNotifications
      email
    }
    students {
      id
      firstName
      lastName
      relationship
      classes { id name }
    }
  }
}
```
3. Verificar que un `academyId` incorrecto lanza `UnauthorizedException` (assertOwnership).
