# Plan: Filtro de clases con auto-selección en selector de estudiantes (Opción B)

## Context
El modal de "Seleccionar estudiantes" (asignación de cargos) tiene actualmente dos filtros: estado y clases. Se quiere:
1. Eliminar el filtro de estado
2. Reemplazar el selector de clases por el componente ya existente (el de la tabla profesor-estudiantes)
3. Al seleccionar una clase, auto-seleccionar todos los estudiantes de esa clase (reemplazando la selección actual)

## Backend — No requiere cambios

La query `students` ya soporta todo lo necesario:

- **`classId` filter**: `src/students/students.resolver.ts:69` y `src/students/students.service.ts:84`
- **Limit máximo de 100**: `src/students/students.service.ts:78` — suficiente para cualquier clase
- **`status` filter**: existe pero el frontend simplemente deja de enviarlo

No hay migraciones ni cambios de código necesarios en el BE.

## Frontend — Cambios requeridos (fuera de este repo)

### 1. Eliminar filtro de estado
Quitar el dropdown "Todos los estados" del modal.

### 2. Reemplazar componente de filtro de clases
Usar el mismo componente de filtro de clases que se usa en la tabla profesor-estudiantes.

### 3. Auto-selección al cambiar clase (Opción B)
Cuando el usuario selecciona una clase en el filtro:
1. Hacer query `students(classId: X, limit: 100, page: 1)` — sin paginación manual, traer todo de una
2. Reemplazar la selección actual con todos los `id` retornados
3. Si vuelve a "Todas las clases" → mantener la selección actual (no limpiar)
4. El usuario puede desmarcar individuales después del auto-select

### Query a usar
```graphql
query Students($classId: String, $search: String, $page: Int, $limit: Int) {
  students(classId: $classId, search: $search, page: $page, limit: $limit) {
    data {
      id
      firstName
      lastName
      status
    }
    meta {
      total
      totalPages
    }
  }
}
```

Cuando se selecciona clase: `limit: 100, page: 1` para traer todos de una y auto-seleccionar.

## Verificación
- [ ] Al seleccionar una clase, todos sus estudiantes quedan seleccionados
- [ ] Al cambiar de clase, la selección anterior se reemplaza
- [ ] Se puede deseleccionar individuales después del auto-select
- [ ] El filtro de estado ya no aparece
- [ ] El contador "X estudiantes seleccionados" refleja la selección correcta
- [ ] Estudiantes con "Ya tiene asignado este cargo" siguen bloqueados aunque la clase los incluya
