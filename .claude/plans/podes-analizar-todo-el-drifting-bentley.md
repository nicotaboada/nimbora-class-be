# Code Review — Backend reciente (bulk-imports + class module + related)

## Context

El usuario pidió un análisis del código backend nuevo que creó, en particular el módulo `bulk-imports` (con soporte para STUDENT, TEACHER, FAMILY) y el módulo `classes`, para detectar bugs, código duplicado, inconsistencias de diseño y oportunidades de mejora. Este archivo es un reporte + propuesta de refactors priorizados, no una feature nueva.

---

## 🎯 Acción acordada ahora: Fix bug #1 (Opción A)

Tras re-verificación del código, solo el validator de **teacher** tiene el bug. Student y family ya descartan correctamente filas con cualquier error.

**Cambio único a aplicar:**

[src/bulk-imports/validators/teacher-import.validator.ts:132-136](src/bulk-imports/validators/teacher-import.validator.ts#L132-L136)

```ts
// ANTES:
// Filter out rows whose email collided (intra-file or DB) from the normalized set
const invalidatedRows = new Set<number>();
for (const err of errors) {
  if (err.column === "Email") invalidatedRows.add(err.row);
}

// DESPUÉS:
// Drop rows that collected any blocking error
const invalidatedRows = new Set<number>();
for (const err of errors) {
  invalidatedRows.add(err.row);
}
```

Con eso el comportamiento de los 3 validators queda unificado.

### Verificación
- `npm run build` debe compilar sin errores nuevos.
- Probar un import de teachers con un archivo que tenga DNI malformado / teléfono inválido → el teacher con error **no** debe llegar al task de Trigger; debe aparecer en `errors` del resumen de validación.

## Scope analizado
- [src/bulk-imports/](src/bulk-imports/) — módulo completo con registry pattern
- [src/classes/](src/classes/) — módulo nuevo
- [src/students/](src/students/), [src/families/](src/families/), [src/teachers/](src/teachers/) — cambios recientes
- [prisma/schema.prisma](prisma/schema.prisma) + 8 migraciones nuevas
- Utilidades comunes nuevas ([src/common/](src/common/))

---

## 🔴 Bugs críticos

### 1. Inconsistencia en invalidación de filas entre validators
**Files:** [src/bulk-imports/validators/student-import.validator.ts:244](src/bulk-imports/validators/student-import.validator.ts#L244), [src/bulk-imports/validators/teacher-import.validator.ts:135](src/bulk-imports/validators/teacher-import.validator.ts#L135)

- `StudentImportValidator` descarta **cualquier** fila con errores.
- `TeacherImportValidator` descarta **solo** filas con error en columna `Email`.
- `FamilyImportValidator` tiene otra variante.

**Efecto:** Un teacher con DNI malformado, teléfono inválido o género incorrecto pasa validación y llega al insert. Decidir una estrategia única (ej. un set `BLOCKING_ERROR_COLUMNS`) y aplicarla en los 3.

### 2. Guardian que devuelve null tras acumular errores
**File:** [src/bulk-imports/validators/family-import.validator.ts:399-401](src/bulk-imports/validators/family-import.validator.ts#L399-L401)

Si el guardian tiene algunos campos inválidos, se pushean los errores **y además** el bloque se descarta devolviendo `null`. El usuario ve errores "de un guardián que ya no existe" en el resumen de validación. Ordenar: validar todos los campos → decidir si return null o retornar el objeto.

### 3. `assignStudents` bypasea validación de capacidad
**File:** [src/classes/classes.service.ts:183-231](src/classes/classes.service.ts#L183-L231)

El `StudentImportValidator` sí valida capacidad de clases en el bulk import. Pero la mutation directa `assignStudents` no la chequea — permite sobrepoblar clases via GraphQL. Agregar chequeo contra `class.capacity`.

### 4. Parámetro `required` muerto en `normalizeGuardian`
**File:** [src/bulk-imports/validators/family-import.validator.ts:282-286](src/bulk-imports/validators/family-import.validator.ts#L282-L286)

Siempre llamado con `false`. O implementar la lógica cuando es `true`, o eliminar el parámetro.

---

## 🟡 Código duplicado (worth extracting)

Los 3 validators (student/teacher/family) repiten casi exactamente:

| Duplicación | Ubicaciones | Propuesta |
|---|---|---|
| `EMAIL_REGEX`, `PHONE_REGEX` | Línea ~23-24 en los 3 | `src/bulk-imports/constants/validation-patterns.ts` |
| Parseo de phone country code | student:300-314, teacher:192-206, family:347-360 | `normalizePhoneCountryCode(raw, addError)` |
| Parseo de fecha DD/MM/YYYY + `MIN_BIRTH_YEAR` | student:334-356, teacher:225-248 | Helper compartido |
| Validación de DocumentType (DNI 7-8 dígitos, OTHER max 40) | Los 3 | `normalizeDocumentNumber(type, raw, addError)` |
| Lógica de email deduplication (intra-archivo + cross-entity) | Los 3 | Servicio/helper compartido |
| Normalización de número de teléfono (`replaceAll(/[\s()-]/g, "")`) | Los 3 | `normalizePhoneNumber(raw)` |

**Diseño sugerido:** crear un `BaseImportValidator<T>` abstracto con helpers protegidos, o un `ImportValidationHelpers` service inyectable. El registry pattern hoy solo abstrae el **dispatch**, no la **lógica compartida de validación**.

---

## 🟠 Problemas de diseño

### A. Multi-tenancy: falta `assertOwnership` explícito
**File:** [src/students/students.service.ts](src/students/students.service.ts)

- `findOne` sí valida ownership (línea 71).
- `findAll`, `update`, `updateContactInfo` dependen **solo** del WHERE clause con `academyId`. Funcionalmente seguro hoy, pero un refactor futuro podría romperlo sin warning. El módulo de `families` y `classes` sí son explícitos — inconsistencia.

### B. `CreateClassInput` no tiene `description`
**Files:** [src/classes/dto/create-class.input.ts](src/classes/dto/create-class.input.ts), [src/classes/dto/update-class.input.ts:48](src/classes/dto/update-class.input.ts#L48)

El entity lo soporta, el update lo acepta, el create no. Obliga a hacer create + update seguido. Agregar como `@Field({ nullable: true })`.

### C. Tipos de mapper no reflejan nullabilidad
**File:** [src/classes/utils/class-mapper.util.ts:10-16](src/classes/utils/class-mapper.util.ts#L10-L16)

El tipo `PrismaClassWithRelations` declara `teacher: Teacher` (no-null), pero el mapper efectivamente maneja `null` en las líneas 26-28. Tipar como `teacher: PrismaTeacher | null`.

### D. Campos muertos en `mapToEntity` de bulk-imports
**File:** [src/bulk-imports/bulk-imports.service.ts:198-200](src/bulk-imports/bulk-imports.service.ts#L198-L200)

Retorna `afipResults` y `familyResults` que nunca se populan. Eliminar.

### E. Schema inicial de `Class` evolucionó en 3 migraciones consecutivas
Migraciones del mismo día que hacen `teacherId`, `startDate`, `endDate` opcionales después de crearlos requeridos. No es un bug, pero indica que el modelo inicial no tuvo suficiente review. Si todavía no se deployó a prod, considerar squash/reset de migraciones.

---

## 🟢 Code quality (menor pero suma)

### TypeScript `as` casts (preferís no usarlos)
- [src/bulk-imports/bulk-imports.service.ts:191-192](src/bulk-imports/bulk-imports.service.ts#L191-L192): `operation.type as BulkOperationType` sin validar contra el enum.
- `mode: "insensitive" as const` en los 3 validators — innecesario, Prisma infiere el literal.

### Otros
- **`cellToString`** en [src/bulk-imports/services/xlsx-parser.service.ts:114-163](src/bulk-imports/services/xlsx-parser.service.ts#L114-L163): 50 líneas con 6+ edge cases. Partir en 2-3 funciones.
- **Sin límite de tamaño de archivo** en DTO ni service — base64 decodificado podría ser enorme. Agregar `MAX_FILE_SIZE` check.
- **`row: 0` como convención de "warning global"** en student validator (línea 145) — el front va a necesitar saber esto. Comentar o usar un campo explícito `scope: "global" | "row"`.
- **Detección de fila de ejemplo** en xlsx-parser (líneas 188-221) salta filas cuyos valores coinciden con el ejemplo — si un usuario importa "Juan Pérez" (el ejemplo), se descarta silenciosamente.

---

## 📋 Plan de refactor sugerido (en orden)

Si querés arrancar a arreglar, este es el orden que minimiza riesgo:

1. **Unificar estrategia de invalidación de filas** en los 3 validators (bug real).
2. **Extraer constantes/regex compartidos** a `src/bulk-imports/constants/` (refactor trivial, gana mucho).
3. **Extraer helpers compartidos** (`normalizePhone*`, `normalizeDocumentNumber`, `parseDateDDMMYYYY`) a `src/bulk-imports/utils/`.
4. **Crear `BaseImportValidator<T>` abstracto** con los helpers como `protected`, y migrar los 3 validators.
5. **Agregar capacidad check en `assignStudents`** (bug real, afecta prod).
6. **Agregar `description` a `CreateClassInput`** (feature gap chico).
7. **Fix tipos de mappers** para reflejar nullabilidad real.
8. **Reemplazar casts `as`** por type guards / inferencia correcta.
9. **Refactor `cellToString`** y agregar límite de tamaño de archivo.
10. **Fix orden de validación en guardian block** (family validator).

Items 1, 2, 3, 4 van juntos — son el core del refactor de bulk-imports. Items 5, 6 son independientes y pueden ir en paralelo.

---

## Verification

Para cada fix:
- `npm run build` — debe compilar sin errores.
- `npm run lint:fix` — debe pasar sin warnings nuevos.
- Correr el flujo de bulk import end-to-end desde el frontend con un archivo XLSX real de cada tipo (student, teacher, family), incluyendo filas válidas, inválidas y borderline (ej. clases al límite de capacidad).
- Para `assignStudents`: probar via GraphQL playground asignar más alumnos que la capacidad — debe rechazar.
- Para multi-tenancy: opcional, escribir test que intente acceder a student de otra academy.
