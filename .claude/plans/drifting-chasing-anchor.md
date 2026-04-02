# Plan: Bulk Import de Alumnos — Plan Completo (BE + FE)

## Context
El modelo Student solo tiene campos básicos. Se quiere una feature de importación masiva via Excel, con validación en frontend, preview de datos, procesamiento async con BulkOperation + Trigger.dev, y pantalla de resultados. El backend necesita migraciones + nueva mutation; el frontend necesita una nueva página de import con drag & drop.

---

# BACKEND

## BE-1 — Migración Prisma

**Archivo:** `prisma/schema.prisma`

```prisma
enum Gender {
  MALE
  FEMALE
  OTHER
  PREFER_NOT_TO_SAY
}

enum IdentityDocType {
  DNI
  // extensible: RUT, CPF, CEDULA, CURP con migraciones futuras
}

// Agregar al enum existente:
enum BulkOperationType {
  BULK_INVOICE
  BULK_AFIP
  BULK_STUDENT_IMPORT  // nuevo
}

// Nuevos campos en Student:
model Student {
  // ...campos existentes sin cambios...
  birthDate         DateTime?
  gender            Gender?
  identityDocType   IdentityDocType?
  identityDocNumber String?
  country           String?    // ISO 3166-1 alpha-2: "AR", "CL"... (igual que Academy.country)
  province          String?
  city              String?
  street            String?
  zipCode           String?
}
```

Comando: `npx prisma migrate dev --name add_student_extended_fields`

## BE-2 — Actualizar módulo Students

- **`student.entity.ts`**: exponer nuevos campos con `@Field({ nullable: true })`, registrar enums Gender/IdentityDocType con `registerEnumType`
- **`create-student.input.ts`**: agregar campos opcionales con `@IsOptional()` + decoradores class-validator
- **`update-student.input.ts`**: ídem
- **`student-mapper.util.ts`**: mapear nuevos campos

## BE-3 — Mutation bulkImportStudents

**Nuevo archivo:** `src/students/dto/bulk-import-students.input.ts`
```ts
@InputType() BulkStudentItemInput { firstName*, lastName*, email*, phoneNumber?, birthDate?, gender?, identityDocType?, identityDocNumber?, country?, province?, city?, street?, zipCode? }
@InputType() BulkImportStudentsInput { students: BulkStudentItemInput[] (min 1, ValidateNested) }
```

**`students.service.ts`** — nuevo método `bulkImport()`:
1. Crear `BulkOperation` `{ type: BULK_STUDENT_IMPORT, status: PENDING, totalItems, params: { students } }`
2. Trigger.dev task `"bulk-student-import"`
3. Guardar `triggerRunId`, retornar `BulkOperation`

**`students.resolver.ts`** — nueva mutation:
```ts
@Mutation(() => BulkOperation)
async bulkImportStudents(@Args("input") input: BulkImportStudentsInput, @CurrentUser() user: User)
```

## BE-4 — Trigger.dev Task

**Nuevo archivo:** `src/trigger/bulk-student-import.task.ts`

Por cada alumno:
- `prisma.student.create({ data: { ...alumno, academyId } })`
- `P2002` (email duplicado) → `failedItems++`, `results.push({ email, success: false, error: "Email ya existe" })`
- OK → `completedItems++`, `results.push({ email, success: true, studentId })`

Al finalizar: `status = COMPLETED` (o `FAILED` si todos fallaron)

---

# FRONTEND

## FE-1 — Botón en la página de alumnos

**Archivo:** `app/(authenticated)/students/page.tsx`

Agregar botón "Importar" (icono upload) al lado de "Nuevo alumno" que navega a `/students/bulk-import`.

## FE-2 — Página de importación

**Ruta:** `app/(authenticated)/students/bulk-import/page.tsx`
**Módulo:** `modules/students/components/bulk-import/`

### Flujo en 3 pasos (estado local, sin wizard de múltiples rutas):

```
UPLOAD → PREVIEW → RESULTS
```

---

### Paso UPLOAD — Pantalla inicial

**Layout:**
- Zona de drag & drop (dashed border, ícono upload, texto "Subí un archivo Excel (.xlsx)", botón "Elegir archivo")
- Label inferior izquierdo: "Descargar plantilla de ejemplo" (link que descarga el XLSX template)
- Botón "Previsualizar importación" (disabled hasta que haya archivo cargado)

**Validación de archivo:**
- Solo acepta `.xlsx` (tanto en el `<input accept=".xlsx">` como al droppear)
- Si se dropea un tipo no soportado → toast de error: "No se soporta ese tipo de archivos"

**Una vez cargado el archivo:**
- Reemplazar la zona de drop por una card con: ícono Excel verde + nombre del archivo + peso (ej: "alumnos.xlsx — 7.7 KB") + botón "Reemplazar archivo" + botón X para quitar
- El botón "Previsualizar importación" se activa

**Plantilla Excel (generada en FE con `xlsx` o `exceljs`):**

| Nombre* | Apellido* | Email* | Teléfono | DNI | Fecha Nacimiento | Género | País | Provincia | Ciudad | Dirección | Código Postal |
|---|---|---|---|---|---|---|---|---|---|---|---|

- País = lista desplegable en Excel con los países LATAM (Excel data validation)
- Género = lista desplegable: Masculino / Femenino / Otro / Prefiero no decir
- Columnas obligatorias marcadas con * en el header

---

### Paso PREVIEW — Vista previa

Al clickear "Previsualizar importación":
1. Parsear el XLSX en el browser (lib: `xlsx` / `sheetjs`)
2. Mostrar aviso: "Vista previa liviana: se muestra una muestra de X filas sobre Y registros detectados."
3. Tabla con los primeros registros del archivo (máx. 5-10 filas de muestra)
4. Botón "Importar X alumnos" (activo) + "Volver" (vuelve al paso UPLOAD)
5. Validación básica: si faltan campos requeridos en alguna fila, resaltar en rojo y deshabilitar el botón de importar

---

### Paso RESULTS — Estado de importación

Al hacer click en "Importar":
1. Llamar mutation `bulkImportStudents` con los datos parseados del Excel
2. Pantalla de loading: card con "Importando alumnos..." + barra de progreso indeterminada + "Podés cerrar esta página mientras se importan los datos"
3. Polling con `usePollingQuery` cada 5s sobre `bulkOperation(id)`
4. Al completar → pantalla de resultados:

```
┌─────────────────────────────────────────────┐
│ Estado de Importación          ✓ Completada  │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │    42    │  │    0     │  │    3     │  │
│  │  Creados │  │ Actuali. │  │ Fallidos │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                              │
│  ⚠ La importación se completó pero algunos  │
│    registros tuvieron errores.               │
│  [↓ Descargar archivo de errores]            │
│                                              │
│           [Nueva importación]                │
└─────────────────────────────────────────────┘
```

- "Descargar archivo de errores": genera un XLSX con las filas fallidas + columna "Error" con el motivo
- "Nueva importación": vuelve al paso UPLOAD reseteando el estado
- "Actualizados" siempre muestra 0 (no hay lógica de update en esta feature)

---

## FE-3 — Archivos a crear/modificar (Frontend)

| Archivo | Acción |
|---------|--------|
| `app/(authenticated)/students/page.tsx` | Agregar botón "Importar" |
| `app/(authenticated)/students/bulk-import/page.tsx` | Crear página host |
| `modules/students/components/bulk-import/bulk-import-page.tsx` | Orquestador principal (estado del wizard) |
| `modules/students/components/bulk-import/upload-step.tsx` | Paso 1: drag & drop + template download |
| `modules/students/components/bulk-import/preview-step.tsx` | Paso 2: tabla preview + botón confirmar |
| `modules/students/components/bulk-import/results-step.tsx` | Paso 3: resultados + descarga errores |
| `modules/students/components/bulk-import/use-bulk-import.ts` | Hook: estado del wizard + mutation + polling |
| `modules/students/components/bulk-import/generate-template.ts` | Util: genera el XLSX de plantilla |
| `modules/students/components/bulk-import/parse-excel.ts` | Util: parsea XLSX → array de BulkStudentItemInput |
| `modules/students/graphql/mutations.ts` | Agregar `BULK_IMPORT_STUDENTS` mutation |

## FE-4 — Dependencias nuevas

Ninguna de las dos está instalada. Agregar:
```bash
npm install react-dropzone xlsx
```
- **`react-dropzone`** — drag & drop con validación de tipo/tamaño de archivo
- **`xlsx`** (SheetJS) — parsear Excel en browser + generar plantilla descargable

---

## Reutilización de código existente

| Necesidad | Reutilizar de |
|-----------|---------------|
| Polling async | `hooks/use-polling-query.ts` |
| BulkOperation query | `modules/bulk-operations/graphql/queries.ts` (`GET_BULK_OPERATION`) |
| Toast errors/success | patrón de `use-bulk-create-invoices.ts` |
| Patrón de página bulk | `modules/bulk-invoices/components/bulk-invoices-page.tsx` |

---

## Verificación end-to-end

1. `npx prisma migrate dev` sin errores
2. GraphQL: `bulkImportStudents` con 3 alumnos → devuelve `BulkOperation` PENDING
3. FE: ir a `/students` → ver botón "Importar"
4. Arrastrar un .pdf → toast "No se soporta ese tipo de archivos"
5. Cargar .xlsx válido → ver card con nombre + peso + X
6. "Descargar plantilla" → descarga Excel con headers y dropdowns
7. "Previsualizar" → ver tabla con datos del archivo
8. "Importar" → loading → polling → resultados con creados/fallidos
9. Email duplicado en el Excel → aparece en "Fallidos", descarga de errores lo incluye

---

## Notas de diseño

- Sin "Actualizar existentes": la feature solo crea nuevos alumnos
- Sin "Importar otro tipo": no aplica
- País en Excel = dropdown predefinido (no texto libre) para evitar errores de tipeo
- Género en Excel = dropdown predefinido con las 4 opciones del enum
- "Actualizados" en pantalla de resultados siempre = 0 (se muestra igual para consistencia visual)
