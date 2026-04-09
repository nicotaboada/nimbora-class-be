# Plan: Shared Enum Maps in common/utils

## Context
`genderMap` y `documentTypeMap` están definidos de forma idéntica de forma local en `teacher-mapper.util.ts` y `guardian-mapper.util.ts`. Si se agrega el campo `gender` a students en el futuro, habría una tercera copia. La solución es extraerlos a `src/common/utils/enum-maps.util.ts` y que cada mapper los importe desde ahí.

---

## Archivo nuevo: `src/common/utils/enum-maps.util.ts`

Exportar tres mapas:

```ts
export const genderMap: Record<string, Gender | undefined> = {
  MALE: Gender.MALE,
  FEMALE: Gender.FEMALE,
  OTHER: Gender.OTHER,
  NOT_SPECIFIED: Gender.NOT_SPECIFIED,
};

export const documentTypeMap: Record<string, DocumentType | undefined> = {
  DNI: DocumentType.DNI,
  PASSPORT: DocumentType.PASSPORT,
  NIE: DocumentType.NIE,
  OTHER: DocumentType.OTHER,
};

export const statusMap: Record<string, Status> = {
  ENABLED: Status.ENABLED,
  DISABLED: Status.DISABLED,
};
```

---

## Archivos a modificar

### 1. `src/teachers/utils/teacher-mapper.util.ts`
- Eliminar los tres mapas definidos localmente dentro de `mapTeacherToEntity()`
- Importar `genderMap`, `documentTypeMap`, `statusMap` desde `../../common/utils/enum-maps.util`

### 2. `src/families/utils/guardian-mapper.util.ts`
- Eliminar los dos mapas definidos localmente dentro de `mapGuardianToEntity()`
- Eliminar también el cast temporal `prismaGuardianWithGender`
- Importar `genderMap`, `documentTypeMap` desde `../../common/utils/enum-maps.util`
- Usar `genderMap[prismaGuardian.gender]` directamente (el campo `gender` ya existe en Prisma tras la migración aplicada)

### 3. `src/common/utils/index.ts` (si existe, o re-export desde cada archivo directamente)
- Agregar re-export de `enum-maps.util.ts` si hay un barrel

---

## Verificación
- `npx tsc --noEmit` sin errores
- Los mappers de teacher y guardian compilan correctamente
