# Plan: Refactorizar families/page.tsx para usar useBackendPagination

## Context
El módulo `families` es el único listado principal que no usa `useBackendPagination`. Todos los demás módulos (students, teachers, classes, invoices, fees) usan el hook genérico. `families/page.tsx` maneja su propio `useState(currentPage)` y `use-families.ts` usa `useQuery` directamente — duplicando lógica que ya está centralizada en `useBackendPagination`.

El objetivo es alinearlo con el patrón estándar del proyecto.

## Archivos a modificar

- `web/app/(authenticated)/families/page.tsx`
- `web/modules/families/hooks/use-families.ts` — eliminar (reemplazado por el hook genérico)

## Archivos a reutilizar (sin modificar)

- `web/hooks/use-backend-pagination.ts` — hook genérico a usar
- `web/modules/families/graphql/queries.ts` → `GET_FAMILIES` — query ya existe con firma `($page, $limit, $search)`
- `web/modules/families/types/index.ts` — tipos de Family ya definidos

## Implementación

### 1. `families/page.tsx`

Reemplazar:
```ts
const [currentPage, setCurrentPage] = useState(1)
const { families, paginationMeta, loading, refetch } = useFamilies(currentPage, 10, searchQuery)
```

Por:
```ts
const { data: families, meta: paginationMeta, loading, goToNextPage, goToPreviousPage, refetch } =
  useBackendPagination<GetFamiliesResponse, Family>({
    query: GET_FAMILIES,
    dataKey: 'families',
    pageSize: 10,
    queryVariables: { search: searchQuery.trim() || undefined },
  })
```

- Eliminar import de `useFamilies` y `useState` (si solo se usaba para `currentPage`)
- Agregar imports de `useBackendPagination`, `GET_FAMILIES`, tipos relevantes
- Reemplazar `onNextPage={() => setCurrentPage((p) => p + 1)}` por `onNextPage={goToNextPage}`
- Reemplazar `onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}` por `onPreviousPage={goToPreviousPage}`

> Nota: `useState` para `viewMode` e `isCreateSheetOpen` se mantienen.

### 2. `use-families.ts`

Verificar que no se usa en ningún otro lugar y eliminar el archivo.

## Verificación

1. `npm run build` en `/web` sin errores de TypeScript
2. En dev, navegar a `/families` y verificar que:
   - La lista carga correctamente
   - La paginación (siguiente/anterior) funciona
   - La búsqueda resetea automáticamente a página 1
   - Crear una familia y verificar que `refetch` funciona
