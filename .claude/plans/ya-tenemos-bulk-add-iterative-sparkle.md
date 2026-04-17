# Email único per-academia + flatten de ContactInfo en Teacher

## Context

El schema tiene dos inconsistencias acopladas:

1. **`Student.email` es `@unique` GLOBAL** ([prisma/schema.prisma:140](prisma/schema.prisma#L140)): cruza academias. Si dos academias quieren matricular al mismo alumno, la segunda falla. Casi seguro no intencional.
2. **`Teacher` es el outlier estructural**: su contact info vive en una tabla separada `ContactInfo` ([prisma/schema.prisma:208-228](prisma/schema.prisma#L208-L228)) 1:1. En cambio `Student` y `FamilyGuardian` tienen `email`, `phoneNumber`, `address`, etc. **flat** en el modelo principal.
3. **Ningún unique** en `Teacher`/`ContactInfo`/`FamilyGuardian` para email.

La inconsistencia (2) se confirmó en el codebase:
- `Student` service/mapper/entity NO usa `contactInfo` — todo plano.
- `FamilyGuardian` idem.
- Solo `Teacher` tiene `contactInfo` anidado en Prisma y en GraphQL (`teacher { contactInfo { email } }`).

**Objetivo de este plan:**
- (a) **Flatten de `ContactInfo` en `Teacher`**: Teacher queda como Student/Guardian (todos los campos planos). Drop de tabla `ContactInfo`.
- (b) **Email único per-academia, per-entidad** en las 3 entidades (`Student`, `Teacher`, `FamilyGuardian`).

Fuera de scope: bulk teacher import (sigue después), refactor a tabla unificada `Contact`, cambios cross-entidad.

---

## Decisiones confirmadas

| Punto | Decisión |
|---|---|
| Scope del unique | Per-academia, per-entidad (cada tabla independiente) |
| Estrategia para `Teacher.contactInfo` | Flatten (drop tabla `ContactInfo`, fields planos en Teacher) |
| Contrato GraphQL | Rompe: `teacher.contactInfo.*` → `teacher.*` (FE hay que actualizar) |
| Deploy | Atómico: BE + FE + migración en un solo PR/branch |

---

## Plan

### 1. Schema — [prisma/schema.prisma](prisma/schema.prisma)

#### 1.1 Student (línea 140)
```diff
-  email       String   @unique
+  email       String
```
Agregar antes del cierre del modelo (línea ~177):
```prisma
@@unique([academyId, email])
```

#### 1.2 Teacher (líneas 185-206) — flatten
Agregar campos planos (mismos que `Student` + los que ya hay):
```prisma
email            String?
phoneCountryCode String?
phoneNumber      String?
address          String?
country          String?
state            String?
city             String?
postalCode       String?
```
Eliminar relación:
```diff
-  contactInfo    ContactInfo?
```
Agregar unique (antes del cierre):
```prisma
@@unique([academyId, email])
```

#### 1.3 ContactInfo (líneas 208-228)
**Eliminar el modelo completo.** Ya no se usa.

#### 1.4 FamilyGuardian (líneas 255-293)
Agregar antes del cierre (línea ~292):
```prisma
@@unique([academyId, email])
```

**Nota sobre NULL**: en Postgres, múltiples `NULL` no colisionan en un unique multi-columna — profes y tutores sin email siguen funcionando.

---

### 2. Pre-chequeo (crítico antes de migrar)

Crear `scripts/find-email-collisions.ts`: solo lee, no modifica. Lista:

- `Student.email` duplicados dentro de misma academia (hoy imposible por unique global, pero verificarlo igual).
- `Student.email` que existen idénticos en distintas academias (OK post-migración, reportar para awareness).
- `ContactInfo.email` cuyos `Teacher.academyId` coinciden (duplicados intra-academia en teachers).
- `FamilyGuardian.email` duplicados intra-academia.

Correr antes de `prisma:migrate`. Si aparece algo, el usuario decide cómo limpiar antes.

---

### 3. Migración manual editada

Prisma genera el esqueleto; editarlo para que el orden sea correcto:

```sql
-- 1. Agregar columnas nuevas a Teacher
ALTER TABLE "Teacher"
  ADD COLUMN "email"            TEXT,
  ADD COLUMN "phoneCountryCode" TEXT,
  ADD COLUMN "phoneNumber"      TEXT,
  ADD COLUMN "address"          TEXT,
  ADD COLUMN "country"          TEXT,
  ADD COLUMN "state"            TEXT,
  ADD COLUMN "city"             TEXT,
  ADD COLUMN "postalCode"       TEXT;

-- 2. Copiar data de ContactInfo a Teacher
UPDATE "Teacher" t
SET email            = c.email,
    "phoneCountryCode" = c."phoneCountryCode",
    "phoneNumber"    = c."phoneNumber",
    address          = c.address,
    country          = c.country,
    state            = c.state,
    city             = c.city,
    "postalCode"     = c."postalCode"
FROM "ContactInfo" c
WHERE c."teacherId" = t.id;

-- 3. Drop tabla ContactInfo
DROP TABLE "ContactInfo";

-- 4. Drop unique global de Student.email y crear per-academia
ALTER TABLE "Student" DROP CONSTRAINT "Student_email_key";
CREATE UNIQUE INDEX "Student_academyId_email_key"
  ON "Student"("academyId", "email");

-- 5. Uniques nuevos
CREATE UNIQUE INDEX "Teacher_academyId_email_key"
  ON "Teacher"("academyId", "email");
CREATE UNIQUE INDEX "FamilyGuardian_academyId_email_key"
  ON "FamilyGuardian"("academyId", "email");
```

---

### 4. Backend — archivos a modificar

#### 4.1 Módulo Teachers
- [src/teachers/teachers.service.ts](src/teachers/teachers.service.ts)
  - `create`: quitar `contactInfo: { create: ... }`, poner `email, phoneNumber, ...` planos en el `data`. Remover `include: { contactInfo: true }`.
  - `findAll`, `findOne`, `update`, `remove`: quitar todos los `include: { contactInfo: true }`.
  - `updateContactInfo`: dejar de usar `prisma.contactInfo.upsert(...)`; hacer `prisma.teacher.update({ data: { ...contactData } })`.
  - En `create` y `update`: catch de `P2002` para devolver "Email ya registrado en la academia" (patrón del student service).
- [src/teachers/utils/teacher-mapper.util.ts](src/teachers/utils/teacher-mapper.util.ts) — eliminar `mapContactInfoToEntity` y el spread anidado; mapear campos planos directo.
- [src/teachers/entities/teacher.entity.ts](src/teachers/entities/teacher.entity.ts) — reemplazar `@Field(() => ContactInfo) contactInfo?` por los 8 campos planos con `@Field({ nullable: true })`.
- [src/teachers/dto/create-teacher.input.ts](src/teachers/dto/create-teacher.input.ts), [src/teachers/dto/update-teacher.input.ts](src/teachers/dto/update-teacher.input.ts) — agregar todos los campos de contact al nivel raíz del input.

#### 4.2 Eliminar módulo contact-info
- Borrar directorio `src/contact-info/` completo (entity, DTO). La mutation `updateTeacherContactInfo` queda recibiendo `UpdateTeacherContactInfoInput` (nuevo DTO en `/src/teachers/dto/` con los mismos 8 campos, sin `teacherId` en ese nombre — reusar `id`).
- [src/teachers/teachers.resolver.ts](src/teachers/teachers.resolver.ts) — actualizar import del DTO.

#### 4.3 Classes (consumidor de Teacher)
- [src/classes/utils/class-mapper.util.ts](src/classes/utils/class-mapper.util.ts) — si mapea `teacher.contactInfo`, actualizar a campos planos.
- [src/classes/classes.service.ts](src/classes/classes.service.ts) — si hace `include: { teacher: { include: { contactInfo: true } } }`, simplificar.

#### 4.4 Schema GQL regenerado
- [src/schema.gql](src/schema.gql) — se regenera solo al arrancar dev server. Verificar diff: `type Teacher` gana 8 campos, `type ContactInfo` desaparece.

---

### 5. Auditoría del cambio de `Student.email` unique

El `@unique` global se va. Grep required:
- `prisma.student.findUnique({ where: { email } })` — falla type-check post-generate. Corregir a `findFirst({ where: { academyId, email } })` o al compound key.
- Lookups de Student por email en auth/login/signup si existen.

Grep targets: [src/students/](src/students/), [src/auth/](src/auth/), [src/common/](src/common/), [src/bulk-imports/validators/student-import.validator.ts](src/bulk-imports/validators/student-import.validator.ts) (ya usa academyId, OK).

---

### 6. Frontend — archivos a actualizar (coordinación)

**Este plan es BE-only, pero el FE rompe sí o sí.** El siguiente es el listado de archivos del `/web` que consumen `teacher.contactInfo.*` para que planifiques el PR hermano:

Queries/types:
- `modules/teachers/graphql/queries.ts`
- `modules/teachers/graphql/mutations.ts`
- `modules/teachers/types/teacher.ts`, `modules/teachers/types/index.ts`
- `modules/classes/types/class.ts`

Componentes Teacher:
- `modules/teachers/components/teacher-contact-info-card.tsx`
- `modules/teachers/components/teacher-contact-info-sheet.tsx`
- `modules/teachers/components/teacher-quick-contact-card.tsx`
- `modules/teachers/components/teacher-about-tab.tsx`
- `modules/teachers/components/teacher-page-header.tsx`
- `modules/teachers/components/teachers-table.tsx`
- `modules/teachers/hooks/use-update-teacher-contact-info.ts`

Componentes Class (que muestran info de Teacher):
- `modules/classes/components/class-teacher-card.tsx`
- `modules/classes/components/edit-teacher-sheet.tsx`
- `modules/classes/components/edit-teacher-form.tsx`

Posiblemente shared:
- `components/common/contact-info-form.tsx` (si hoy es específico de Teacher; revisar).

**Los componentes y queries de Student y Guardian NO cambian** — ya leen campos planos hoy.

---

## Por qué esto no va a "romper todo" (mitigaciones a tu preocupación)

1. **TypeScript es la red**: después de `prisma generate` + Codegen del FE, el build de TS va a fallar en cada call site desactualizado. No podés mergear sin arreglar todos los lugares.
2. **Scope acotado**: ~5 archivos BE + ~14 archivos FE. Todo en `/teachers/` o `/classes/` (donde se referencia Teacher). Student y Guardian no cambian.
3. **Migración reversible hasta el momento de aplicar**: podés hacer DB snapshot (Supabase/pg dump) antes de `prisma migrate deploy`. Si algo sale mal, restore.
4. **Pre-chequeo antes**: el script de colisiones evita el único escenario de fallo runtime (constraint que no se puede aplicar porque ya hay duplicados).
5. **Branch única**: BE + FE + migración mergean juntos. Ningún deploy queda a medias.

---

## Plan de verificación (end-to-end)

1. **Pre-migration**:
   - `npx tsx scripts/find-email-collisions.ts` → 0 colisiones (o limpiar manualmente).
2. **Build-time**:
   - `npm run build` en BE → limpio (Prisma expone nuevos tipos, TS exige usar compound key donde antes usaba `email`).
   - `npm run build` en FE → limpio (Codegen ya refleja el nuevo schema flat).
3. **Migración**:
   - `npm run prisma:migrate`.
   - `\d "Teacher"` en psql: tiene 8 columnas nuevas + índice `Teacher_academyId_email_key`.
   - `\d "ContactInfo"` → no existe.
   - `\d "Student"` → no tiene `Student_email_key`, sí tiene `Student_academyId_email_key`.
   - `\d "FamilyGuardian"` → tiene `FamilyGuardian_academyId_email_key`.
   - `SELECT COUNT(*) FROM "Teacher" WHERE email IS NOT NULL;` coincide con la cuenta pre-migración de `ContactInfo.email IS NOT NULL`.
4. **Smoke test GraphQL Playground**:
   - `query { teachers { data { email phoneNumber address } } }` → retorna flat.
   - `createTeacher` con email nuevo → OK; con email ya usado en la misma academia → `P2002` → "Email ya registrado".
   - `createTeacher` con mismo email en academia distinta → OK.
   - `updateTeacherContactInfo` (renombrado o igual) → updatea los campos planos del Teacher.
5. **Regresiones**:
   - Bulk import de alumnos sigue funcionando (validator ya usa academyId).
   - Flujo de login si depende de `Student.email`: happy path.
   - Listado/edit de clases muestra teacher correctamente.
6. **Frontend**: navegar Teachers list, Teacher detail, Create teacher, Edit teacher contact info, Class con teacher card. Todos deben renderizar los nuevos campos planos.
