# Plan: Refactor bulk-imports para ser genérico (BE + FE)

## Context

Se implementó el MVP de bulk import de **alumnos**. Próximamente se van a implementar bulk imports de **profesores** y **clases**, así que antes de duplicar código conviene generalizar el framework.

**Hallazgos del análisis:**

### Lo que ya está bien ✅
- **Enums centralizados**: `Gender`, `DocumentType`, `Status` viven en [/src/common/enums/](src/common/enums/) y son reutilizados por `students` y `bulk-imports` sin duplicación.
- **Constants centralizadas**: [/src/common/constants/](src/common/constants/) tiene `countries.ts`, `phone-codes.ts`, `genders.ts`, `document-types.ts` con labels + parsers. Son nuevas pero están bien ubicadas (common, no dentro de bulk-imports) → reutilizables para teachers/classes.
- **Interfaces extensibles**: [validators/import-validator.interface.ts](src/bulk-imports/validators/import-validator.interface.ts) ya es genérica `ImportValidator<T>`.
- **Servicios genéricos**: [xlsx-parser.service.ts](src/bulk-imports/services/xlsx-parser.service.ts) y [template-generator.service.ts](src/bulk-imports/services/template-generator.service.ts) no asumen nada sobre el shape de los datos — listos para reutilizar.
- **`new PrismaClient()` en Trigger tasks**: es el patrón correcto (worker en proceso separado). No cambia.

### Lo que está acoplado a STUDENT ❌
- **Backend**:
  - [bulk-imports.service.ts](src/bulk-imports/bulk-imports.service.ts#L46-L53): `downloadStudentImportTemplate()` hardcoded.
  - [bulk-imports.service.ts:176-182](src/bulk-imports/bulk-imports.service.ts#L176-L182): `assertSupportedEntity` solo acepta STUDENT.
  - [bulk-imports.service.ts:59-69, 86-100](src/bulk-imports/bulk-imports.service.ts#L59-L69): `validate()` y `execute()` usan `STUDENT_IMPORT_COLUMNS` + `studentValidator` directo.
  - [bulk-imports.service.ts:141-151](src/bulk-imports/bulk-imports.service.ts#L141-L151): dispara `"bulk-import-students"` task con ID hardcoded.
  - [bulk-import-students.ts](src/trigger/bulk-import-students.ts): 140 líneas con patrón repetible (update PROCESSING → transaction → update COMPLETED/FAILED).
  - [bulk-imports.resolver.ts](src/bulk-imports/bulk-imports.resolver.ts): `downloadStudentImportTemplate` query específica.

- **Frontend**:
  - Todo el flujo vive en [modules/students/components/import-students/](web/modules/students/components/import-students/) y [modules/students/hooks/use-bulk-import-students.ts](web/modules/students/hooks/use-bulk-import-students.ts) — debería estar en un módulo propio.
  - [upload-step.tsx](web/modules/students/components/import-students/upload-step.tsx): textos hardcoded "Importar alumnos".
  - [use-bulk-import-students.ts](web/modules/students/hooks/use-bulk-import-students.ts): `entityType: 'STUDENT'` hardcoded.
  - [use-download-import-template.ts](web/modules/students/hooks/use-download-import-template.ts): query `DOWNLOAD_STUDENT_IMPORT_TEMPLATE` hardcoded.

### Rarezas a arreglar
- **Label `Gender.NOT_SPECIFIED` inconsistente**: frontend muestra `"No especificado"`, backend `"Prefiero no decirlo"`. El usuario ve texto distinto según pantalla.

### Fuera de scope (tienen plan propio o son tickets aparte)
- `DATABASE_URL` / transaction pooler → ya resuelto en plan [silly-planet](.claude/plans/osea-q-esoty-levantando-silly-planet.md).
- Countries FE (20) vs BE (todo el mundo) — ticket aparte.
- `document-type-select` FE solo muestra DNI — ticket aparte.

**Outcome esperado**: agregar bulk import de teachers o classes debería costar ~2h (solo escribir el validator + config de columnas + entries en el registry), reutilizando 100% del framework.

---

## Approach

### Backend — registry de import configurations

Introducir un **registry** de configuraciones por `ImportEntityType` que resuelva: columnas, sheet name, validator, trigger task id, filename. El service deja de saber sobre `student*` y solo orquesta vía registry.

### Frontend — módulo `bulk-imports` genérico

Mover wizard + hooks + componentes a `/web/modules/bulk-imports/`. Todo parametrizado por `entityType`. Los módulos específicos (`students/import`, `teachers/import`) solo montan el wizard con su config.

---

## Cambios

### 1. Backend

#### 1.1 Crear registry de entity configs

**Nuevo archivo**: `/src/bulk-imports/config/entity-import-registry.ts`

```ts
import type { ImportEntityType } from "../enums/import-entity-type.enum";
import type { ImportValidator } from "../validators/import-validator.interface";
import type { ColumnSpec } from "../services/xlsx-parser.service";

export interface EntityImportConfig<TRow = unknown> {
  entityType: ImportEntityType;
  sheetName: string;
  templateFilename: string;
  columns: readonly ColumnSpec[];
  bulkOperationType: BulkOperationType;
  triggerTaskId: string;
  validatorToken: symbol; // DI token — service resuelve el validator correcto
}

export const ENTITY_IMPORT_REGISTRY: Record<ImportEntityType, EntityImportConfig> = {
  [ImportEntityType.STUDENT]: {
    entityType: ImportEntityType.STUDENT,
    sheetName: STUDENT_IMPORT_SHEET_NAME,
    templateFilename: "plantilla-importar-alumnos.xlsx",
    columns: STUDENT_IMPORT_COLUMNS,
    bulkOperationType: BulkOperationType.BULK_STUDENT_IMPORT,
    triggerTaskId: "bulk-import-students",
    validatorToken: STUDENT_IMPORT_VALIDATOR,
  },
  // Futuro: [ImportEntityType.TEACHER]: { ... }
};
```

#### 1.2 Refactor `BulkImportsService` — genérico

**Archivo**: [src/bulk-imports/bulk-imports.service.ts](src/bulk-imports/bulk-imports.service.ts)

- Reemplazar `downloadStudentImportTemplate()` por `downloadTemplate(entityType)` que lee config del registry y llama a `templateGenerator.generate(config)`.
- `validate(input)` y `execute(input)` leen config por `input.entityType`, resuelven el validator correcto (inyectado vía `ModuleRef` + `validatorToken`), y disparan `tasks.trigger(config.triggerTaskId, payload)`.
- Eliminar `assertSupportedEntity()` — el registry es la fuente de verdad.

#### 1.3 Refactor `TemplateGeneratorService` — recibir config

**Archivo**: [src/bulk-imports/services/template-generator.service.ts](src/bulk-imports/services/template-generator.service.ts)

- Renombrar `generateStudentTemplate()` → `generate(config: EntityImportConfig)`.
- Sheet name, columnas, dropdowns, ejemplo salen del config.

#### 1.4 Helper genérico para transacciones de bulk import

**Nuevo archivo**: `/src/trigger/utils/run-bulk-import.ts`

```ts
export async function runBulkImport<TRow>(
  prisma: PrismaClient,
  operationId: string,
  rows: TRow[],
  createFn: (tx: Prisma.TransactionClient, row: TRow) => Promise<{ id: string }>,
): Promise<ImportResult[]>
```

Extraer el patrón "update PROCESSING → $transaction → update COMPLETED/FAILED" de [bulk-import-students.ts](src/trigger/bulk-import-students.ts). Los tasks específicos (bulk-import-students, futuro bulk-import-teachers) quedan como ~15 líneas: payload typing + llamada a `runBulkImport` con la lambda `(tx, row) => tx.student.create(...)`.

#### 1.5 Refactor `BulkImportsResolver` — mutations únicas

**Archivo**: [src/bulk-imports/bulk-imports.resolver.ts](src/bulk-imports/bulk-imports.resolver.ts)

- `downloadStudentImportTemplate()` → `downloadImportTemplate(entityType: ImportEntityType)` (una sola query parametrizada).
- `validateBulkImport` y `executeBulkImport` ya reciben `entityType` → OK, no cambian.

> **Breaking change GraphQL**: la query `downloadStudentImportTemplate` se renombra. El frontend se actualiza en el mismo refactor (1.8).

### 2. Frontend

#### 2.1 Abstracción en 2 niveles

**Nivel A — `components/bulk-operation/` (GLOBAL, sirve para CUALQUIER bulk op)**

El success/fail/progress no es propio de imports — también lo necesitan bulk-invoices, bulk-afip, bulk-family-invoices. Extraer como componente top-level:

```
/web/components/bulk-operation/
├── bulk-operation-progress.tsx       # ex-progress-step, 100% genérico
│                                     # Props: operationId, totalItems, messages{success,fail,partial}, successRoute
├── bulk-operation-errors-table.tsx   # ex-errors-step, tabla de errores por fila
│                                     # Props: errors[], entityLabel
└── bulk-operation-timeline.tsx       # timeline visual (extraer del progress-step)
```

`bulk-operation-progress.tsx` ya usa `useBulkOperationPolling` que **bulk-invoices también consume hoy** — confirma que este componente es genuinamente global.

**Nivel B — `modules/bulk-imports/` (específico de imports)**

```
modules/bulk-imports/
├── components/
│   ├── bulk-import-wizard.tsx          # orquestador upload→errors→progress
│   └── bulk-uploader.tsx               # upload de archivo XLSX (específico de import)
├── hooks/
│   ├── use-bulk-import.ts              # useBulkImport(entityType)
│   └── use-download-bulk-template.ts   # useDownloadBulkTemplate(entityType)
├── graphql/
│   ├── mutations.ts                    # VALIDATE_BULK_IMPORT, EXECUTE_BULK_IMPORT
│   └── queries.ts                      # DOWNLOAD_IMPORT_TEMPLATE
├── types/
│   └── bulk-import.ts                  # ImportEntityType, ImportValidationResult
└── config/
    └── entity-labels.ts                # Map<ImportEntityType, { title, entityLabel, successRoute }>
```

El wizard usa `<BulkOperationProgress />` y `<BulkOperationErrorsTable />` del nivel A.

#### 2.2 `BulkImportWizard` parametrizado

```tsx
interface BulkImportWizardProps {
  entityType: ImportEntityType;
  breadcrumbItems: { label: string; href?: string }[];
  uploadTitle: string;
  entityLabel: string;       // "alumnos" | "profesores" | "clases"
  successRoute: string;      // "/students" | "/teachers" | "/classes"
}
```

La máquina de estados (upload/errors/progress) queda idéntica a [import-students-page.tsx](web/modules/students/components/import-students/import-students-page.tsx) — solo parametriza strings.

#### 2.3 Wrappers finos por entidad

**Archivo**: `/web/modules/students/components/import-students/import-students-page.tsx`

```tsx
export function ImportStudentsPage() {
  return (
    <BulkImportWizard
      entityType="STUDENT"
      breadcrumbItems={[{ label: "Estudiantes", href: "/students" }, { label: "Importar Alumnos" }]}
      uploadTitle="Importar alumnos"
      entityLabel="alumnos"
      successRoute="/students"
    />
  );
}
```

Queda ~10 líneas. Lo mismo para futuro `ImportTeachersPage`.

#### 2.4 Hooks genéricos

- `useBulkImport(entityType)` reemplaza `useBulkImportStudents()`.
- `useDownloadBulkTemplate(entityType)` reemplaza `useDownloadImportTemplate()`.
- Borrar los hooks específicos de `modules/students/hooks/`.

### 3. Fix label Gender inconsistente

**Archivo FE**: buscar dónde frontend define `"No especificado"` (grep en `/web` por `NOT_SPECIFIED` y `"No especificado"`) y cambiar a `"Prefiero no decirlo"` para igualar al backend ([genders.ts:7](src/common/constants/genders.ts#L7)).

Alternativa (recomendada): crear `/web/lib/constants/genders.ts` con el mismo map `GENDER_LABELS` que backend → fuente única de verdad en el frontend. Eliminar hardcoded labels en selects/forms.

---

## Archivos modificados

### Backend
- [src/bulk-imports/bulk-imports.service.ts](src/bulk-imports/bulk-imports.service.ts) — genérico vía registry.
- [src/bulk-imports/bulk-imports.resolver.ts](src/bulk-imports/bulk-imports.resolver.ts) — `downloadImportTemplate(entityType)` único.
- [src/bulk-imports/bulk-imports.module.ts](src/bulk-imports/bulk-imports.module.ts) — registrar validators con tokens.
- [src/bulk-imports/services/template-generator.service.ts](src/bulk-imports/services/template-generator.service.ts) — recibe `EntityImportConfig`.
- [src/trigger/bulk-import-students.ts](src/trigger/bulk-import-students.ts) — reducir a ~15 líneas usando `runBulkImport` helper.
- [src/schema.gql](src/schema.gql) — regenerar después del cambio de resolver.

### Backend (nuevos)
- `/src/bulk-imports/config/entity-import-registry.ts` — registry.
- `/src/trigger/utils/run-bulk-import.ts` — helper transaccional.

### Frontend (nuevos)
- `/web/components/bulk-operation/` — componentes globales reutilizables por cualquier bulk op (progress, errors-table, timeline).
- `/web/modules/bulk-imports/` — módulo específico de imports (ver 2.1).
- `/web/lib/constants/genders.ts` — labels sincronizados con BE.

### Frontend (refactor oportunístico)
- `/web/modules/bulk-invoices/` — reemplazar su UI de progress con `<BulkOperationProgress />` global (hoy tiene su propia implementación o carece de progress bonito). Verificar qué muestra actualmente y migrar si aplica.

### Frontend (modificados)
- [web/modules/students/components/import-students/import-students-page.tsx](web/modules/students/components/import-students/import-students-page.tsx) — wrapper fino.
- [web/app/(authenticated)/students/import/page.tsx](web/app/(authenticated)/students/import/page.tsx) — no cambia (ya usa `ImportStudentsPage`).

### Frontend (eliminados)
- `/web/modules/students/components/import-students/upload-step.tsx`
- `/web/modules/students/components/import-students/errors-step.tsx`
- `/web/modules/students/components/import-students/progress-step.tsx`
- `/web/modules/students/hooks/use-bulk-import-students.ts`
- `/web/modules/students/hooks/use-download-import-template.ts`
- `/web/modules/students/types/bulk-import.ts` → migrar a `modules/bulk-imports/types/`
- `/web/modules/students/graphql/mutations.ts` (VALIDATE/EXECUTE) → migrar
- Hardcoded `"No especificado"` en componentes FE.

---

## Checklist para próximas features (post-refactor)

Para agregar bulk import de **profesores**:

**Backend** (~1.5h):
- [ ] Agregar `TEACHER` a `ImportEntityType` enum.
- [ ] Crear `/src/bulk-imports/config/teacher-import.config.ts` con columnas.
- [ ] Crear `/src/bulk-imports/validators/teacher-import.validator.ts` implementando `ImportValidator<TeacherImportRow>`.
- [ ] Crear `/src/trigger/bulk-import-teachers.ts` (15 líneas usando `runBulkImport`).
- [ ] Agregar entry a `ENTITY_IMPORT_REGISTRY`.
- [ ] Agregar `BULK_TEACHER_IMPORT` a enum `BulkOperationType` + migration.
- [ ] Registrar validator + task en `BulkImportsModule`.

**Frontend** (~30min):
- [ ] Crear `/web/modules/teachers/components/import-teachers/import-teachers-page.tsx` (~10 líneas wrapper).
- [ ] Crear ruta `/web/app/(authenticated)/teachers/import/page.tsx`.
- [ ] Agregar link en teachers list.

---

## Verificación

1. **Unit**: `npm run test` — no debería romper nada (lógica de validación intacta, solo orquestación cambia).
2. **Build**: `npm run build` en `/be` y `npm run build` en `/web` deben pasar sin errores de tipos.
3. **Smoke test end-to-end** (student import, confirmar que no hubo regresión):
   - `npm run start:dev` en `/be`, `npm run dev` en `/web`.
   - UI → Estudiantes → Importar Alumnos → bajar plantilla → llenar 3 filas → importar.
   - Verificar: validation step aparece si hay errores; progress step pollea; estudiantes creados en DB.
4. **Regenerar schema GraphQL**: asegurar que `src/schema.gql` refleja la query renombrada.
5. **Lint**: `npm run lint:fix` en ambos repos.
6. **Label Gender**: seleccionar `NOT_SPECIFIED` en frontend y verificar que muestra `"Prefiero no decirlo"` en todas las pantallas (form de edición, display en lista, export, etc.).

### No hace falta
- No tocar `new PrismaClient()` en Trigger tasks — es el patrón correcto. El issue de conexiones está resuelto por config de `.env` (ver plan [silly-planet](.claude/plans/osea-q-esoty-levantando-silly-planet.md)).
- No tocar enums `Gender`/`DocumentType` ni constants `countries.ts`, `phone-codes.ts` — ya están bien ubicados.
