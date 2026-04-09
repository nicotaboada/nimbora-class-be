# Plan: Remove duplicate PaginationMeta in families module

## Context
`PaginationMeta` ya existe como tipo canónico en `types/pagination.ts`. Se crearon dos definiciones duplicadas en el módulo de familias que deben eliminarse e importarse desde la fuente correcta.

## Archivos a modificar

### 1. `web/modules/families/types/index.ts`
- **Eliminar** el bloque `export interface PaginationMeta` (líneas 94-101)
- **Agregar** al inicio del archivo: `import type { PaginationMeta } from 'types/pagination'`
- `PaginatedStudentsResponse` (línea ~103) que usa `meta: PaginationMeta` seguirá compilando

### 2. `web/modules/families/hooks/use-families.ts`
- **Eliminar** el bloque `interface PaginationMeta` local (líneas 7-14)
- **Agregar** al inicio del archivo: `import type { PaginationMeta } from 'types/pagination'`
- `GetFamiliesResponse.meta: PaginationMeta` (línea ~35) seguirá compilando

### No requiere cambios
- `modules/families/components/families-table.tsx` — ya importa correctamente desde `types/pagination`

## Verificación
- TypeScript no debe mostrar errores (`tsc --noEmit`) 
- Buscar `interface PaginationMeta` en el proyecto → debe aparecer solo en `types/pagination.ts`
