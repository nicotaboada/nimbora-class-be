# Plan — Remover columna de contacto en tablas de Alumnos y Profesores

## Context

Las tablas de listado de alumnos y profesores en el frontend muestran una columna con datos de contacto (email + teléfono en alumnos; teléfono en profesores). El usuario considera que esa información no aporta valor en una vista de listado — la tabla gana espacio horizontal para información más útil (clases, estado, fecha) y se reduce ruido visual. Los datos siguen existiendo en la DB y en el detalle de cada entidad; solo se quitan de la lista.

Cambio puramente de UI en el frontend (`/web`). Sin tocar backend, GraphQL ni queries.

## Files to modify

### 1. [web/modules/students/components/students-table.tsx](../../web/modules/students/components/students-table.tsx)

- **Imports (líneas 11-19):** quitar `Mail` (línea 14) y `Phone` (línea 16) de lucide-react. Ambos íconos solo se usan en la columna de contacto.
- **TableHead (líneas 153-155):** eliminar el `<TableHead>` "Datos de contacto".
- **TableCell de contacto (líneas 196-215):** eliminar el `<TableCell>` completo que renderiza email y `phoneNumber`.
- **Skeleton (líneas 101-106):** eliminar la segunda entrada del array `skeletonTableColumns` (la que tiene `{ width: '150px' }` y `{ width: '120px' }`) para que el skeleton refleje una columna menos.

### 2. [web/modules/teachers/components/teachers-table.tsx](../../web/modules/teachers/components/teachers-table.tsx)

- **Imports (líneas 11-18):** quitar `Phone` (línea 15). Solo se usa en la columna de teléfono.
- **TableHead (líneas 150-152):** eliminar el `<TableHead>` "Teléfono".
- **TableCell de teléfono (líneas 193-206):** eliminar el `<TableCell>` completo con el teléfono y el fallback `—`.
- **Skeleton (líneas 98-102):** eliminar la segunda entrada del array `skeletonTableColumns` (la de dos líneas de 150px/120px).

## Notes

- No tocar `Student` / `Teacher` types ni las queries GraphQL — `email` y `phoneNumber` se siguen necesitando en las páginas de detalle y en los formularios de edición.
- Las columnas están definidas **inline en JSX** (no hay un array de columnas compartido), así que el cambio es puramente local a cada archivo.
- Los `<TableHead>` restantes ya tienen anchos fijos (`w-[280px]`, `w-[120px]`, etc.) — no hace falta ajustar anchos.

## Verification

1. `cd web && npm run dev` y abrir la app.
2. Navegar a la lista de alumnos → verificar que la tabla muestra: Estudiante | Clases Inscriptas | Estado | Fecha de creación | (acciones). Sin "Datos de contacto".
3. Navegar a la lista de profesores → verificar que la tabla muestra: Profesor | Clases | Estado | Fecha de creación | (acciones). Sin "Teléfono".
4. Entrar al detalle de un alumno y de un profesor → confirmar que email/teléfono siguen visibles allí.
5. Estado de carga (skeleton): la cantidad de columnas del skeleton debe coincidir con la cantidad real de columnas (no debe verse un placeholder extra).
6. `cd web && npm run build` para chequear que no quedaron imports sin usar que rompan el type-check/lint.
