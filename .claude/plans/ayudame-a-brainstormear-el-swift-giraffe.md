# Plan: Bulk Import de Alumnos (MVP) + Framework reutilizable

## Contexto

La academia necesita una feature para importar alumnos en masa desde un archivo, que hoy solo se pueden crear uno por uno vía formulario. El screenshot de referencia muestra la UI diseñada: "Importar desde archivo" con descarga de plantilla + drop zone. Fase 1 (este plan) implementa **solo alumnos**. Fases 2+ agregan profesores, clases y familias reutilizando el framework que se construye ahora.

El módulo [src/bulk-operations/](src/bulk-operations/) existente es para operaciones sobre datos ya existentes (facturación masiva, emisión AFIP) y NO sirve para importar datos desde archivos. Se crea un módulo nuevo `bulk-imports` con parser genérico + validators por entidad, reutilizando `BulkOperation` model y el runner de Trigger.dev.

---

## Decisiones tomadas (alineadas con el usuario)

| Decisión | Elegido |
|----------|---------|
| Scope MVP | **Solo alumnos** |
| Formato plantilla | **Solo XLSX** con dropdowns nativos |
| Validación | **Dry-run**: mutation `validateBulkImport` (no escribe) → errores → mutation `executeBulkImport` si clean |
| Errores | **All-or-nothing**: hasta que el archivo esté 100% clean, no se persiste nada |
| Duplicados (email) | **Error** → usuario corrige y re-sube |
| Login Supabase | **No** crear User — solo Student. Login se habilita después manualmente |
| Relaciones familia/clase | **No** en MVP. Fase 2+: el "contenedor" (familia/clase) trae los emails de sus miembros |
| Async | **Siempre Trigger.dev** — reutilizable para futuros imports |
| Arquitectura | **Módulo genérico `bulk-imports`** con parser común + validators por entidad |
| Dropdowns plantilla | País `"Argentina (AR)"`, código telefónico `"Argentina (+54)"`, tipo doc, género |
| Provincia/estado | **Omitido del MVP** (no es crucial, se decide en fase futura) |
| Ciudad | **Texto libre** (ya es Input en el frontend, mantiene consistencia) |

---

## Flujo end-to-end

```
1. Frontend → query downloadStudentImportTemplate → backend genera XLSX con exceljs → base64/URL
2. Usuario rellena XLSX en Excel/Sheets (dropdowns activos) → upload en la UI
3. Frontend → mutation validateBulkImport(entityType: STUDENT, fileBase64)
4. Backend: parsea XLSX → StudentImportValidator.validate(rows, academyId)
   → retorna { totalRows, validRows, errors: [{ row, column, message, suggestion? }] }
   → NO escribe nada en DB
5. Frontend muestra tabla de errores → usuario corrige → repite paso 3
6. Si errors.length === 0 → frontend habilita botón "Importar estudiantes"
7. Frontend → mutation executeBulkImport(entityType: STUDENT, fileBase64)
8. Backend: revalida (seguridad) → crea BulkOperation(PENDING) → dispara Trigger.dev task → retorna { bulkOperationId }
9. Frontend poll de query bulkOperation(id) hasta status === COMPLETED
10. Trigger.dev task: itera filas → prisma.student.create({ ..., academyId }) en transacción global
11. Si cualquier create falla durante execute (race condition con validate) → rollback todo → status FAILED
12. Frontend muestra resultado: "150 alumnos importados"
```

---

## Estructura del módulo

```
src/bulk-imports/
├── bulk-imports.module.ts
├── bulk-imports.resolver.ts               # downloadTemplate (query) + validate/execute (mutations)
├── bulk-imports.service.ts                # Orquesta: parse → delega validator → crea BulkOp → trigger
├── services/
│   ├── xlsx-parser.service.ts             # Genérico: XLSX → rows[] con headers normalizados (exceljs)
│   └── template-generator.service.ts      # Genérico: genera XLSX + dropdowns desde ImportColumnConfig
├── validators/
│   ├── import-validator.interface.ts      # Contrato común
│   └── student-import.validator.ts        # Implementación MVP
├── dto/
│   ├── validate-import.input.ts           # { entityType, fileBase64 }
│   ├── execute-import.input.ts            # { entityType, fileBase64 }
│   └── import-validation-result.output.ts # { totalRows, validRows, errors[] }
├── entities/
│   └── import-error.entity.ts
├── enums/
│   └── import-entity-type.enum.ts         # STUDENT (MVP), TEACHER, CLASS, FAMILY (fase 2+)
└── config/
    └── student-import.config.ts           # Columnas + validaciones + dropdowns
```

### Contrato del framework

```ts
// validators/import-validator.interface.ts
export interface ImportValidator<TRow, TEntityInput> {
  entityType: ImportEntityType;
  columns: ImportColumnConfig[];
  validate(rows: TRow[], academyId: string): Promise<ValidationResult>;
  transformRowToInput(row: TRow): TEntityInput;
}

export interface ImportColumnConfig {
  key: string;                 // 'firstName'
  header: string;              // 'Nombre'
  required: boolean;
  dropdown?: string[];         // Valores válidos (genera data validation en XLSX)
  format?: 'email' | 'date' | 'phone' | 'text' | 'document';
}
```

Agregar entidades en fase 2+ = solo crear nuevo `TeacherImportValidator implements ImportValidator`. Parser, template generator y trigger task son genéricos.

---

## Campos de la plantilla de alumnos (MVP)

Basado en [prisma/schema.prisma:136-179](prisma/schema.prisma#L136-L179):

| Columna XLSX | Required | Tipo/Dropdown | Validación backend | Persiste en DB como |
|--------------|----------|---------------|---------------------|---------------------|
| Nombre | ✓ | texto | 1-100 chars, trim | `firstName` string |
| Apellido | ✓ | texto | 1-100 chars, trim | `lastName` string |
| Email | ✓ | texto | formato email + UNIQUE en academia + UNIQUE en archivo | `email` string |
| Código país tel | | **dropdown** `"Argentina (+54)"`, `"Uruguay (+598)"`, ... | parsea `+54`, valida contra constante `phone-codes` | `phoneCountryCode` string (`"+54"`) |
| Teléfono | | texto | solo dígitos, normalizar | `phoneNumber` string |
| Fecha nacimiento | | texto DD/MM/YYYY | parseable, no futura, no <1900 | `birthDate` Date |
| Género | | **dropdown** MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY | debe estar en constante | `gender` enum |
| Tipo documento | | **dropdown** DNI, CUIT, PASSPORT, OTHER | debe estar en constante | `documentType` string |
| Número documento | | texto | DNI 7-8 dígitos, CUIT 11 dígitos | `documentNumber` string |
| Dirección | | texto | libre | `address` string |
| Ciudad | | texto | libre (sin lista) | `city` string |
| País | | **dropdown** `"Argentina (AR)"`, `"Uruguay (UY)"`, ... | parsea `AR`, valida contra constante `countries` | `country` string (`"AR"`) |
| Código postal | | texto | libre | `postalCode` string |

**Omitidos del MVP:** provincia/estado (decisión diferida).

---

## Constantes (fuente única de verdad)

Nuevas en [src/common/constants/](src/common/constants/):

```
countries.ts        # [{ code: 'AR', name: 'Argentina' }, ...] — paquete 'countries-list'
phone-codes.ts      # [{ code: '+54', country: 'Argentina' }, ...] — paquete 'country-codes-list'
document-types.ts   # ['DNI', 'CUIT', 'PASSPORT', 'OTHER']
genders.ts          # ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']
```

Estas constantes las consume:
- `template-generator.service.ts` → genera los dropdowns del XLSX
- `student-import.validator.ts` → valida los valores del archivo subido

Garantiza que el XLSX y el validador **siempre** estén sincronizados.

---

## Archivos a crear / modificar

**Crear:**
- Todo el módulo `src/bulk-imports/` descrito arriba
- `src/common/constants/{countries,phone-codes,document-types,genders}.ts`
- `src/trigger/bulk-import-students.ts` — task Trigger.dev que ejecuta el import real

**Modificar:**
- [src/app.module.ts](src/app.module.ts) — registrar `BulkImportsModule`
- [src/bulk-operations/enums/bulk-operation-type.enum.ts](src/bulk-operations/enums/bulk-operation-type.enum.ts) — agregar `BULK_STUDENT_IMPORT` al enum (reutiliza `BulkOperation` model para tracking y polling)
- [package.json](package.json) — agregar `exceljs`, `countries-list`, `country-codes-list`

**Reutilizar sin tocar:**
- [src/trigger/utils/run-bulk-operation.util.ts](src/trigger/utils/run-bulk-operation.util.ts) — runner genérico (PROCESSING → loop → COMPLETED)
- `BulkOperation` model de Prisma — ya tiene `results` JSON, `triggerRunId`, counters
- [src/students/students.service.ts:18-53](src/students/students.service.ts#L18-L53) `create()` — invocable desde la task

---

## Seguridad (multi-tenant)

Crítico ([CLAUDE.md](CLAUDE.md) multi-tenant rule):
- Todos los Student creados llevan `academyId` del `@CurrentUser()` — jamás confiar en valor del archivo
- `validateBulkImport` y `executeBulkImport` usan `@UseGuards(SupabaseAuthGuard)` + `@CurrentUser()`
- La query de uniqueness de email se filtra por `academyId` (emails duplicados entre academias están OK)

---

## Verificación end-to-end

1. `npm install exceljs countries-list country-codes-list`
2. `npm run build` — sin errores TS
3. `npm run start:dev`
4. GraphQL playground:
   ```graphql
   query { downloadStudentImportTemplate { fileBase64 filename } }
   ```
   Decodificar base64 → abrir en Excel → verificar: dropdowns de país, código tel, tipo doc, género funcionan
5. Rellenar template con 3 filas válidas + 2 con errores (email duplicado entre filas, país inválido, DNI con letras)
6. `mutation { validateBulkImport(input: { entityType: STUDENT, fileBase64: "..." }) { totalRows validRows errors { row column message } } }` → debe devolver 2 errores específicos
7. Corregir → revalidar → `errors: []`
8. `mutation { executeBulkImport(input: { entityType: STUDENT, fileBase64: "..." }) { bulkOperationId } }`
9. Polling: `query { bulkOperation(id: "...") { status completedItems failedItems } }` → status COMPLETED, completedItems=3
10. Prisma Studio: verificar 3 Student creados con `academyId` correcto, `country="AR"`, `phoneCountryCode="+54"`
11. Re-importar mismo archivo → validate devuelve "email ya existe" → bloquea execute
12. Intentar `executeBulkImport` sin validar (con email duplicado) → backend revalida y aborta antes de escribir

---

## Fuera de scope (fase 2+)

- Importación de profesores (decidir deduplication key — email no es UNIQUE en schema)
- Importación de familias (definir si guardians van en la misma fila o en archivo aparte)
- Importación de clases (FK resolution: programa y profesor por nombre/código)
- **Columna "Clase" en la plantilla de alumnos** (aparece en mockup como opcional, explícitamente descartada: el linkeo alumno↔clase se hará desde el import de clases, siguiendo la regla "el contenedor tiene el link")
- Linkeo alumno↔familia vía el archivo de la entidad contenedora
- Campo provincia/estado (requiere decidir: template por país / cascada INDIRECT / texto + match API)
- Validación de ciudad contra lista
- **Descarga de reporte de errores en formato XLSX/CSV** (aparece en mockup, descartada para MVP — por ahora los errores se muestran solo en la tabla de la UI de validación)
- **Aceptar archivos CSV además de XLSX** (el mockup muestra "CSV, XLSX"; MVP acepta solo XLSX para garantizar dropdowns y validaciones nativas)
- Rollback/undo de una importación ya completada
- Campos custom por academia
- Importación de alumnos con creación simultánea de User de Supabase (para login)

---

## Alineación con mockups del frontend

Los mockups de la UI (screenshots adjuntados en la conversación) muestran:
- **Pantalla 1 — Upload**: Paso 1 "Descargar plantilla" + Paso 2 "Subir archivo" → alineado. La nota "Formatos soportados: CSV, XLSX" del mockup se corrige a solo XLSX.
- **Pantalla 2 — Validación**: Card con archivo subido, contadores "X válidas / Y con errores", banner de alerta, y tabla `Fila | Campo | Error` → alineado con el output del `validateBulkImport` mutation.
- **Botones descartados**: "Descargar reporte de errores" (fuera de scope) y "Subir archivo corregido" (redirige al Paso 2 del flujo, no necesita endpoint separado).
