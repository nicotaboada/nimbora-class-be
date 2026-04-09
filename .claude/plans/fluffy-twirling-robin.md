# Plan: Reemplazar FamilyStudent por Student en FamilyDetail

## Context
`FamilyStudent` es un tipo duplicado y redundante. Ya existe `Student` en `modules/students/types/student.ts`. El componente `family-students-section.tsx` usa los mismos datos de estudiante, por lo que `FamilyStudent` debe eliminarse y `FamilyDetail.students` debe tipar con `Student` directamente.

## Archivos a modificar

### 1. `modules/families/types/index.ts`
- Eliminar la interfaz `FamilyStudent`
- Cambiar `FamilyDetail.students` de `FamilyStudent[]` a `Student[]`
- `Student` ya está importado

### 2. `modules/families/graphql/queries.ts`
- En `GET_FAMILY`, agregar campos `status` y `avatar` al fragmento de students

### 3. `modules/families/hooks/use-family-detail.ts`
- Actualizar `GetFamilyResponse` para incluir `status` y `avatar` en students
- Actualizar el mapeo de students:
  - `avatar: s.avatar ?? null` (era `avatarUrl: null`)
  - `courses: s.classes` (era `enrolledClasses: s.classes.map(c => c.name)`)
  - `status: s.status` (era `status: 'ACTIVE' as const` hardcodeado)
  - Agregar campos requeridos por `Student`: `email: ''`, `createdAt: ''`, `updatedAt: ''`

### 4. `modules/families/components/family-students-section.tsx`
- `student.avatarUrl` → `student.avatar`
- `student.enrolledClasses.map(className => ...)` → `student.courses?.map(c => c.name).map(className => ...) ?? []`
- `student.status === 'ACTIVE'` → `student.status === Status.ENABLED`
- Importar `Status` desde `lib/constants/status.enum`

## Verificación
1. La página `/families/[familyId]` renderiza la tabla de estudiantes correctamente
2. Las clases se muestran como badges
3. El badge de estado muestra "Activo" / "Inactivo" según `Status.ENABLED/DISABLED`
4. No hay errores de TypeScript
