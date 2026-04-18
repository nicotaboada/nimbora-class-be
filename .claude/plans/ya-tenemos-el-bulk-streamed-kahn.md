# Plan: Bulk Import de Profesores (Teachers)

## Context

Ya existe el módulo `bulk-imports` con import funcional de Students. El diseño ya es extensible (registry + validator interface + task genérico), así que agregar Teachers es **casi mecánico**: solo hay que crear la config, validator y task específicos, y registrarlos.

El objetivo es habilitar que los administradores importen profesores masivamente desde un XLSX, con validación dry-run previa y procesamiento async transaccional (all-or-nothing), exactamente como ya funciona para Students.

---

## Diferencias clave con Students (qué tener en cuenta)

| Aspecto | Student (ya existe) | Teacher (nuevo) |
|---|---|---|
| **Email** | Requerido en el import | **Opcional** — refleja el modelo Prisma (`email String?` con `@@unique([academyId, email])` que solo aplica si está presente). Filas sin email se aceptan. |
| **`avatarUrl`** | N/A | Existe en modelo pero **no se importa** (no tiene sentido vía XLSX) |
| **`state`** | No existe | Existe en el modelo pero **no se incluye** en el template (decisión: mantener template alineado con Students por simplicidad; se puede sumar después si hace falta) |
| **`classIds`** | N/A | **No se importa** (la asignación a clases se hace aparte, igual que en `createTeacher` manual) |
| **Duplicados email** | Busca cross-entity en Student/Teacher/Guardian | **Mismo chequeo cross-entity**, pero solo aplica a filas con email no vacío |
| **Validación intra-archivo** | Email duplicado en el archivo | Mismo chequeo, **ignorando filas sin email** del mapa de duplicados |

Todo lo demás (parser XLSX, template generator, resolver GraphQL, service orquestador, transacción all-or-nothing en Trigger.dev) **se reusa 100% sin modificaciones**.

---

## Archivos a crear

### 1. [src/bulk-imports/types/teacher-import.types.ts](src/bulk-imports/types/teacher-import.types.ts)

```ts
export interface TeacherImportRow {
  firstName: string;
  lastName: string;
  email: string | null;       // ← null permitido (vs string en Student)
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  birthDate: Date | null;
  gender: Gender | null;
  documentType: DocumentType | null;
  documentNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
}
```

Mismas 14 columnas que Student — la única diferencia funcional es que `email` admite `null`.

### 2. [src/bulk-imports/config/teacher-import.config.ts](src/bulk-imports/config/teacher-import.config.ts)

Clonar la estructura de [student-import.config.ts](src/bulk-imports/config/student-import.config.ts) con:
- `email.required = false` (única diferencia de columnas vs Student)
- `sheetName: "Profesores"`
- `templateFilename: "plantilla-importar-profesores.xlsx"`
- `entityType: ImportEntityType.TEACHER`
- `bulkOperationType: BulkOperationType.BULK_TEACHER_IMPORT`
- `triggerTaskId: "bulk-import-teachers"`

Reutilizar los mismos dropdowns (`COUNTRIES`, `PHONE_CODES`, `GENDER_OPTIONS`, `DOCUMENT_TYPE_OPTIONS`) y las mismas constantes de labels.

### 3. [src/bulk-imports/validators/teacher-import.validator.ts](src/bulk-imports/validators/teacher-import.validator.ts)

Clonar [student-import.validator.ts](src/bulk-imports/validators/student-import.validator.ts) con estos cambios:
- `entityType = ImportEntityType.TEACHER`
- Email: si está vacío, **no es error** (solo normalizar a `null`). Si está presente, validar formato y pasar a lowercase.
- En el check de duplicados intra-archivo y DB: **omitir filas con email nulo** del mapa `emailToRows` (no participan del chequeo de duplicados).
- DB cross-entity check: mismo `Promise.all` sobre `student/teacher/familyGuardian` que ya existe — reusar esa lógica tal cual.
- Reusar `parseDateDDMMYYYY` (conviene moverlo a un util compartido para no duplicar — ver nota abajo).

### 4. [src/trigger/bulk-import-teachers.ts](src/trigger/bulk-import-teachers.ts)

Clonar [bulk-import-students.ts](src/trigger/bulk-import-students.ts):
- `id: "bulk-import-teachers"`
- `TeacherImportPayloadRow`: mismos campos que Student, con `email: string | null`
- `createOne` hace `tx.teacher.create(...)` en vez de `tx.student.create(...)`, con `status: Status.ENABLED`
- Reusa `runBulkImportTransaction` de [run-bulk-import-transaction.util.ts](src/trigger/utils/run-bulk-import-transaction.util.ts) tal cual.

---

## Archivos a modificar

### 1. [src/bulk-imports/enums/import-entity-type.enum.ts](src/bulk-imports/enums/import-entity-type.enum.ts)
Agregar `TEACHER = "TEACHER"` al enum.

### 2. [src/bulk-imports/config/entity-import-registry.ts](src/bulk-imports/config/entity-import-registry.ts)
Registrar `[ImportEntityType.TEACHER]: TEACHER_IMPORT_CONFIG`.

### 3. [src/bulk-imports/bulk-imports.module.ts](src/bulk-imports/bulk-imports.module.ts)
Agregar `TeacherImportValidator` al array del token `IMPORT_VALIDATORS`.

### 4. [src/bulk-operations/enums/bulk-operation-type.enum.ts](src/bulk-operations/enums/bulk-operation-type.enum.ts)
Agregar `BULK_TEACHER_IMPORT = "BULK_TEACHER_IMPORT"`.

### 5. [src/schema.gql](src/schema.gql)
Se regenera automáticamente con la nueva key del enum `ImportEntityType`.

---

## Nota de refactor sugerida (opcional)

Hoy `parseDateDDMMYYYY` vive dentro de [student-import.validator.ts](src/bulk-imports/validators/student-import.validator.ts#L323). Si lo clonamos al validator de Teacher, queda duplicado. Vale la pena extraerlo a [src/bulk-imports/validators/shared-parsers.util.ts](src/bulk-imports/validators/shared-parsers.util.ts) para reusarlo.

Si querés mantener el scope chico, se puede dejar duplicado por ahora y refactorizar cuando aparezca la tercera entidad.

---

## Verificación end-to-end

1. **GraphQL schema**: `npm run start:dev` y verificar que `ImportEntityType` expone `TEACHER`.
2. **Template**: `downloadImportTemplate(entityType: TEACHER)` retorna base64, abrir el XLSX y confirmar:
   - Sheet "Profesores"
   - 13 columnas (2 requeridas: Nombre, Apellido + 11 opcionales incluyendo Email)
   - Dropdowns de país, código teléfono, género, tipo de documento
   - Fila de ejemplo en itálica
3. **Validación dry-run**: `validateBulkImport` con archivo que incluya:
   - Filas válidas con y sin email
   - Múltiples filas sin email (TODAS deben aceptarse, no contar como duplicado)
   - Dos filas con el mismo email (debe reportar duplicado intra-archivo)
   - Fila con email que ya existe en Student/Teacher/Guardian de la misma academy (debe reportar duplicado cross-entity)
   - Fila con fecha futura / formato inválido / enum inválido
4. **Ejecución real**: `executeBulkImport` con archivo válido → verificar que:
   - Se crea `BulkOperation` con `type = BULK_TEACHER_IMPORT`
   - Trigger.dev task corre y marca `COMPLETED`
   - Se crean los teachers en DB con `status = ENABLED` y `academyId` correcto
5. **Rollback**: forzar un fallo mid-import (ej. string en vez de enum en el payload por skip de validación) y verificar que ninguna fila quedó persistida (all-or-nothing).
