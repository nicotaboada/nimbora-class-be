# Plan: Utility `pickDefined` para reemplazar el patrón `if (x !== undefined)`

## Context
En varios servicios se repite el patrón de construir un objeto de actualización de Prisma campo por campo:

```ts
const updateData: Prisma.FamilyGuardianUpdateInput = {};
if (input.firstName !== undefined) updateData.firstName = input.firstName;
if (input.lastName !== undefined) updateData.lastName = input.lastName;
// ... 28 líneas en total en 2 archivos
```

Este patrón es verboso y propenso a olvidos. La solución es una función utilitaria que filtre claves con valor `undefined`.

## Implementación

### 1. Crear `/src/common/utils/pick-defined.util.ts`

```ts
export function pickDefined<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}
```

### 2. Aplicar en `families.service.ts` — 3 bloques

**Bloque 1 (líneas ~336-343)** — `updateGuardianPersonalInfo`:
```ts
// ANTES
const updateData: Prisma.FamilyGuardianUpdateInput = {};
if (input.firstName !== undefined) updateData.firstName = input.firstName;
// ...6 campos

// DESPUÉS
const updateData = pickDefined(input);
```

**Bloque 2 (líneas ~381-388)** — mismo patrón con `updateGuardianPersonalInfo` (birthDate, gender, documentType, etc.):
```ts
const updateData = pickDefined(input);
```

**Bloque 3 (líneas ~409-418)** — `updateGuardianContactInfo` (email, phone, address, etc.):
```ts
const updateData = pickDefined(input);
```

### 3. Aplicar en `classes.service.ts` — 1 bloque (líneas ~101-109)

```ts
// ANTES (8 campos)
const updateData: Prisma.ClassUpdateInput = {};
if (input.name !== undefined) updateData.name = input.name;
// ...

// DESPUÉS
const updateData = pickDefined(input);
```

## Archivos a modificar
- `src/common/utils/pick-defined.util.ts` — CREAR
- `src/families/families.service.ts` — reemplazar 3 bloques
- `src/classes/classes.service.ts` — reemplazar 1 bloque

## Consideración de tipos
Los DTOs de input usan campos que mapean 1:1 a los campos de Prisma Update, por lo que `Partial<InputType>` es asignable a `Prisma.XxxUpdateInput`. Si algún campo del DTO tiene un tipo diferente al de Prisma (ej. enum propio vs enum Prisma), TypeScript lo detectará en compilación.

## Verificación
- `npm run build` — sin errores de TypeScript
- Ejecutar las mutations afectadas y verificar que los campos `undefined` no sobreescriban datos existentes en DB
