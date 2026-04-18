# Frontend — Bulk Import de Profesores

## Context

El backend para bulk import de profesores ya está implementado y expone **las mismas** mutations/queries que alumnos, parametrizadas por `entityType: ImportEntityType` (`STUDENT | TEACHER`):

- Query `downloadImportTemplate(entityType)` → devuelve el XLSX en base64
- Mutation `validateBulkImport({ entityType, fileBase64 })` → dry-run, reporta errores por fila
- Mutation `executeBulkImport({ entityType, fileBase64 })` → dispara Trigger.dev, devuelve `BulkOperation`
- Query `bulkOperation(id)` → polleada por la UI para progreso

El frontend en [web/](../../../web/) **ya tiene el flujo genérico** construido en [modules/bulk-imports/](../../../web/modules/bulk-imports/):

- [bulk-import-wizard.tsx](../../../web/modules/bulk-imports/components/bulk-import-wizard.tsx) — state machine: `upload → errors | progress`
- [bulk-import-uploader.tsx](../../../web/modules/bulk-imports/components/bulk-import-uploader.tsx)
- [bulk-import-errors-step.tsx](../../../web/modules/bulk-imports/components/bulk-import-errors-step.tsx)
- [use-bulk-import.ts](../../../web/modules/bulk-imports/hooks/use-bulk-import.ts) — recibe `entityType`, ya genérico
- [use-download-bulk-template.ts](../../../web/modules/bulk-imports/hooks/use-download-bulk-template.ts) — recibe `entityType`, ya genérico
- [BulkOperationProgress](../../../web/components/common/bulk-operation/bulk-operation-progress.tsx) — polling compartido

El wrapper de alumnos ([import-students-page.tsx](../../../web/modules/students/components/import-students/import-students-page.tsx)) monta el wizard genérico con `entityType="STUDENT"` y labels/rutas. La única razón por la que hoy no funciona para profesores es que [bulk-import.ts](../../../web/modules/bulk-imports/types/bulk-import.ts) tipa `ImportEntityType = 'STUDENT'` (sin `| 'TEACHER'`) y no existe ni la ruta `/teachers/import` ni el wrapper. El botón "Importar profesores" en [teachers/page.tsx:96-98](../../../web/app/(authenticated)/teachers/page.tsx#L96-L98) ya está renderizado pero **sin `onClick` ni `href`**.

El resultado esperado: clickear "Importar profesores" navega a `/teachers/import` y corre exactamente el mismo flujo que alumnos, usando la plantilla de profesores que ya genera el backend.

## Cambios

### 1. Habilitar `TEACHER` en el tipo
[web/modules/bulk-imports/types/bulk-import.ts:8](../../../web/modules/bulk-imports/types/bulk-import.ts#L8)

```ts
export type ImportEntityType = 'STUDENT' | 'TEACHER'
```

Actualizar también el comentario arriba (hoy dice "expected to grow with each new feature (teachers, classes, etc.)" — dejar solo "classes, etc." o quitar).

### 2. Crear el wrapper `ImportTeachersPage`
Archivo nuevo: `web/modules/teachers/components/import-teachers/import-teachers-page.tsx`

Clon 1:1 del wrapper de alumnos, cambiando labels y rutas:

```tsx
'use client'

import { BulkImportWizard } from '@/modules/bulk-imports/components/bulk-import-wizard'

export function ImportTeachersPage() {
	return (
		<BulkImportWizard
			entityType="TEACHER"
			entityLabelPlural="profesores"
			breadcrumbItems={[
				{ label: 'Profesores', href: '/teachers' },
				{ label: 'Importar Profesores' },
			]}
			successRoute="/teachers"
			successButtonLabel="Volver a profesores"
			retryRoute="/teachers/import"
		/>
	)
}
```

### 3. Crear la ruta `/teachers/import`
Archivo nuevo: `web/app/(authenticated)/teachers/import/page.tsx`

```tsx
import { ImportTeachersPage } from '@/modules/teachers/components/import-teachers/import-teachers-page'

export default function ImportTeachersRoute() {
	return <ImportTeachersPage />
}
```

Espejo exacto de [app/(authenticated)/students/import/page.tsx](../../../web/app/(authenticated)/students/import/page.tsx).

### 4. Conectar el botón "Importar profesores"
[web/app/(authenticated)/teachers/page.tsx:96-98](../../../web/app/(authenticated)/teachers/page.tsx#L96-L98)

Cambiar el `Button` sin handler por el patrón `asChild + <Link href="/teachers/import">` que ya usa [students/page.tsx:101-103](../../../web/app/(authenticated)/students/page.tsx#L101-L103), agregando el `import Link from 'next/link'` arriba del archivo si no está.

```tsx
<Button variant="outline" size="sm" asChild>
	<Link href="/teachers/import">Importar profesores</Link>
</Button>
```

## Archivos afectados

- Editar: [web/modules/bulk-imports/types/bulk-import.ts](../../../web/modules/bulk-imports/types/bulk-import.ts)
- Editar: [web/app/(authenticated)/teachers/page.tsx](../../../web/app/(authenticated)/teachers/page.tsx)
- Crear: `web/modules/teachers/components/import-teachers/import-teachers-page.tsx`
- Crear: `web/app/(authenticated)/teachers/import/page.tsx`

## Nada más cambia

- No hay mutations/queries nuevas — todas reciben `entityType` y ya funcionan con `TEACHER`.
- `BulkOperationProgress`, `BulkImportUploader`, `BulkImportErrorsStep`, `useBulkImport`, `useDownloadBulkTemplate` son **entity-agnostic**. No hay que tocarlos.
- La plantilla XLSX la genera el backend (`template-generator.service.ts` + `teacher-import.config.ts`), con columnas, dropdowns y fila-ejemplo específicos de profesores. El frontend solo la descarga.
- `BulkOperationType` del progress (`BULK_TEACHER_IMPORT` vs `BULK_STUDENT_IMPORT`) lo devuelve el backend; la UI de progreso usa el estado/contadores genéricamente.

## Verificación end-to-end

1. `cd web && pnpm dev` (o el script que use el repo — chequear `package.json`).
2. Loguearse, ir a `/teachers`, click "Importar profesores" → debe navegar a `/teachers/import`.
3. En la pantalla de upload, click "Descargar plantilla" → baja `plantilla-importar-profesores.xlsx` (filename viene del backend).
4. Llenar la plantilla con al menos una fila válida y una inválida (ej: email con formato roto, o `documentType=DNI` con 5 dígitos) → subir.
5. Debe aparecer la pantalla de errores con filas rojas mostrando `row`, `column`, `message`. Click "Volver" y corregir.
6. Subir plantilla limpia → debe pasar automáticamente a la pantalla de `BulkOperationProgress`, pollear `bulkOperation(id)` cada 2s y mostrar la barra hasta COMPLETED.
7. Verificar en DB (Prisma Studio) que se crearon los `Teacher` con `academyId` correcto y email único.
8. Probar el caso con errores del trigger (ej. email duplicado contra Students existentes) → debe terminar en `COMPLETED` con `failedItems > 0` y los resultados fallidos visibles, o en `FAILED` según el contrato del task.
9. `cd web && pnpm tsc --noEmit` (o el check de tipos del repo) para confirmar que `ImportEntityType` no rompe usos existentes.
