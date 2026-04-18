# Verificación de migraciones Prisma — ¿se puede recrear la DB desde cero?

## Context

El usuario sospecha que varios cambios recientes al schema se aplicaron con `prisma db push` en vez de crear migraciones. Quiere saber si hoy alguien puede clonar el repo y correr `prisma migrate deploy` sobre una DB vacía y obtener exactamente el schema que define [schema.prisma](prisma/schema.prisma).

**Respuesta corta: NO. Hay drift significativo — la migración [20260404000000_add_families_module](prisma/migrations/20260404000000_add_families_module/migration.sql) falla inmediatamente contra una DB vacía porque referencia enums que nunca fueron creados por migración.**

---

## Diagnóstico — Drift detectado

### 1. Enums que el schema declara pero NINGUNA migración crea

| Enum | Usado en schema | Creado por migración? |
|---|---|---|
| [`Status`](prisma/schema.prisma#L94-L97) | `Family`, `FamilyGuardian`, `Program`, `Student`, `Teacher` | ❌ No. Existen `StudentStatus` y `TeacherStatus` por separado |
| [`Gender`](prisma/schema.prisma#L99-L104) | `Student`, `Teacher`, `FamilyGuardian` | ❌ No. Existe `TeacherGender` |
| [`DocumentType`](prisma/schema.prisma#L106-L111) | `Student`, `Teacher`, `FamilyGuardian` | ❌ No. Existe `TeacherDocumentType` |
| [`Language`](prisma/schema.prisma#L124-L130) | `Program` | ❌ No existe en ninguna migración |

**Consecuencia concreta**: La migración [20260404000000_add_families_module/migration.sql](prisma/migrations/20260404000000_add_families_module/migration.sql#L10) intenta hacer `status "Status" NOT NULL DEFAULT 'ENABLED'` y `documentType "DocumentType"`. Al correr sobre DB vacía → error `type "Status" does not exist` y se detiene.

### 2. Tablas faltantes

- **`Program`** — definido en [schema.prisma:289](prisma/schema.prisma#L289), referenciado como FK por [Class migration](prisma/migrations/20260402171941_add_class_table/migration.sql#L32), pero NUNCA se crea con `CREATE TABLE "Program"` en ninguna migración.

### 3. Columnas agregadas al schema pero no a migraciones

**`Student`** (schema.prisma:136-180) define estos campos que ninguna migración crea:
- `birthDate`, `gender`, `documentType`, `documentNumber`
- `phoneCountryCode`, `address`, `city`, `state`, `country`, `postalCode`
- `status` (cambió de `StudentStatus` → `Status`, sin migración de rename)

### 4. Tipos divergentes entre migración y schema

- [`FamilyGuardian.gender`](prisma/migrations/20260408120000_add_gender_to_family_guardian/migration.sql#L2): migración lo crea como `TEXT`, schema lo declara como `Gender`.
- `Teacher.status` / `gender` / `documentType`: migraciones originales usan `TeacherStatus` / `TeacherGender` / `TeacherDocumentType`; el schema los renombró a `Status` / `Gender` / `DocumentType` sin migración.

### 5. DROPs de tablas que nunca fueron creadas por migración

- La migración [20260417130941](prisma/migrations/20260417130941_email_unique_per_academy_flatten_teacher/migration.sql#L36) ejecuta `DROP TABLE "ContactInfo"`. **No existe ningún `CREATE TABLE "ContactInfo"` en migraciones.** Sobre DB vacía: error.
- Lo mismo aplica a `PersonalInfo` (los commits recientes hablan de "refactor de contactinfo y personalinfo" pero no hay migraciones).

---

## Cómo arreglarlo — 2 opciones

### Opción A (recomendada) — Baseline reset

Colapsar toda la historia de migraciones en una sola migración `init` que refleje exactamente el schema actual.

**Pasos**:
1. Hacer backup de `prisma/migrations/` (por si algo).
2. Borrar la carpeta `prisma/migrations/` completa.
3. Crear DB vacía local (p.ej. `nimbora_baseline_test`) y apuntar `DATABASE_URL` ahí.
4. Correr `npx prisma migrate dev --name init` → genera UNA migración con todo el schema.
5. Verificar que la DB local quedó idéntica al schema (correr `prisma migrate status`, `prisma studio`).
6. Commit de la nueva carpeta `migrations/`.
7. **Para la DB de producción (que ya tiene el schema)**: correr `npx prisma migrate resolve --applied <init_migration_name>` para marcar la migración como ya aplicada sin re-ejecutarla.
8. Para cualquier otra DB ya existente (staging, dev compartido): mismo `migrate resolve --applied`.

**Ventaja**: garantiza paridad 1:1 entre migraciones y schema. Cualquier dev nuevo puede `prisma migrate deploy` desde cero.

**Desventaja**: se pierde el historial granular de migraciones. No tiene impacto operacional, solo informativo.

### Opción B — Migraciones correctivas manuales

Agregar 1-2 migraciones nuevas al final de la historia que arreglen el drift, y **editar** algunas migraciones existentes que contienen referencias a tipos inexistentes.

Cosas a editar/crear:
- Crear migración `XXXXX_create_unified_enums` ANTES de `20260404000000` (requiere renombrar timestamps) que haga `CREATE TYPE "Status"`, `"Gender"`, `"DocumentType"`, `"Language"`.
- Crear migración `XXXXX_create_program_table`.
- Crear migración `XXXXX_extend_student_fields` con los 10+ campos faltantes de `Student`.
- Editar migración `20260408120000` para que use `"Gender"` en vez de `TEXT`.
- Editar migración `20260331184412` y `20260401013707` para que usen `Status`/`Gender`/`DocumentType` en vez de los Teacher*.
- Crear migración que haga `CREATE TABLE "ContactInfo"` fake + drop, o editar la migración 20260417130941 para que no referencie ContactInfo.

**Ventaja**: mantiene el historial.
**Desventaja**: frágil, mucho más trabajo, y **modificar migraciones ya aplicadas en prod es peligroso** — Prisma compara hashes y puede romper `migrate deploy` en envs que ya corrieron las versiones originales.

---

## Recomendación

**Opción A (baseline reset)**. Es la única que te garantiza reproducibilidad real, y el único costo es el `migrate resolve --applied` por única vez en los envs existentes.

## Archivos críticos a mirar al ejecutar

- [prisma/schema.prisma](prisma/schema.prisma) — fuente de verdad
- [prisma/migrations/](prisma/migrations/) — la carpeta a resetear
- [prisma/migrations/migration_lock.toml](prisma/migrations/migration_lock.toml) — mantener (define el provider)

## Verificación end-to-end

Después de aplicar la Opción A:

1. Crear DB vacía nueva: `createdb nimbora_verify`
2. Apuntar `DATABASE_URL` ahí temporalmente
3. Correr `npx prisma migrate deploy` → debe aplicar sin errores
4. Correr `npx prisma migrate status` → debe decir "Database schema is up to date"
5. Correr `npx prisma db pull --print` y diff contra `schema.prisma` → debe ser idéntico (módulo formato)
6. Opcional: correr `npm run build` para asegurar que el cliente Prisma generado tipa todo bien
