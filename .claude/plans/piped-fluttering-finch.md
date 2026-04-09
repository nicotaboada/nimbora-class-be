# Plan: Query `guardian(id)` — Detalle completo del tutor

## Context
La UI de detalle de un tutor muestra: información personal (nombre, apellido, relación, fecha de nacimiento, tipo/número de documento), contacto (email, teléfono, dirección, ciudad), preferencias de notificación (emailNotifications), estado (isActive), y lista de estudiantes vinculados. La query `guardian(id)` no existe aún y el entity `Guardian` expone sólo un subconjunto de campos que ya están en Prisma.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/families/entities/guardian.entity.ts` | Agregar campos faltantes + `students` |
| `src/families/utils/guardian-mapper.util.ts` | Mapear todos los campos nuevos |
| `src/families/families.service.ts` | Nuevo método `findOneGuardian` |
| `src/families/families.resolver.ts` | Nueva query `guardian` |

---

## 1. `Guardian` entity — campos a agregar

Agregar los siguientes `@Field` faltantes (todos opcionales salvo `isActive`):

```ts
@Field({ nullable: true }) birthDate?: Date;
@Field(() => DocumentType, { nullable: true }) documentType?: DocumentType;
@Field({ nullable: true }) documentNumber?: string;
@Field({ nullable: true }) phoneCountryCode?: string;
@Field({ nullable: true }) address?: string;
@Field({ nullable: true }) city?: string;
@Field() isActive: boolean;                           // derivado de status === 'ENABLED'
@Field(() => [FamilyStudentSummary]) students: FamilyStudentSummary[];
```

Nota: `DocumentType` ya existe en Prisma como enum (`DNI | PASSPORT | NIE | OTHER`). Hay que registrarlo como `registerEnumType` en GraphQL dentro de `guardian.entity.ts` o en un archivo de enums propio.

---

## 2. `guardian-mapper.util.ts` — extender el mapper

```ts
export function mapGuardianToEntity(
  prismaGuardian: FamilyGuardian,
  students: FamilyStudentSummary[] = [],
): Guardian {
  return {
    // campos existentes...
    birthDate: prismaGuardian.birthDate ?? undefined,
    documentType: prismaGuardian.documentType ?? undefined,
    documentNumber: prismaGuardian.documentNumber ?? undefined,
    phoneCountryCode: prismaGuardian.phoneCountryCode ?? undefined,
    address: prismaGuardian.address ?? undefined,
    city: prismaGuardian.city ?? undefined,
    isActive: prismaGuardian.status === 'ENABLED',
    students,
  };
}
```

Signature cambia (agrega parámetro `students`) — actualizar las llamadas existentes pasando `[]`.

---

## 3. `families.service.ts` — nuevo método

```ts
async findOneGuardian(id: string, academyId: string): Promise<Guardian> {
  const guardian = await this.prisma.familyGuardian.findUnique({ where: { id } });
  assertOwnership(guardian?.academyId, academyId);

  const prismaStudents = await this.prisma.student.findMany({
    where: { familyId: guardian.familyId, academyId },
  });

  const students = prismaStudents.map(mapStudentToSummary); // usar mapper existente
  return mapGuardianToEntity(guardian, students);
}
```

Verificar cuál es el mapper de estudiantes a `FamilyStudentSummary` — ya existe en `family-mapper.util.ts`.

---

## 4. `families.resolver.ts` — nueva query

```ts
@Query(() => Guardian)
guardian(
  @Args('id') id: string,
  @CurrentUser() user: User,
): Promise<Guardian> {
  return this.familiesService.findOneGuardian(id, user.academyId);
}
```

---

## Verificación

1. `npm run start:dev` — sin errores de compilación
2. En GraphQL playground, ejecutar:
```graphql
query {
  guardian(id: "...") {
    id
    firstName
    lastName
    relationship
    birthDate
    documentType
    documentNumber
    email
    phoneNumber
    address
    city
    emailNotifications
    isActive
    students {
      id
      firstName
      lastName
      status
    }
  }
}
```
3. Verificar que `isActive` refleja correctamente el campo `status` de Prisma.
4. Verificar que los estudiantes devueltos pertenecen a la familia correcta.
