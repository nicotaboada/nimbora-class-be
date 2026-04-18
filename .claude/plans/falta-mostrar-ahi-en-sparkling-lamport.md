# Bulk import de familias: `code` y tutor 1 opcionales

## Context

Hoy el bulk import de familias exige **código** y **Tutor 1 (nombre, apellido, parentesco)** como obligatorios en el Excel. Pero en el flujo manual de "Crear Familia" ([create-family-sheet.tsx](../../../web/modules/families/components/create-family-sheet.tsx)) solo `name` es required — `code` y los tutores se agregan después, opcionalmente.

Esa inconsistencia hace que el import sea más estricto que la creación manual sin justificación en la regla de negocio. La DB ya permite `Family.code` nullable ([prisma/schema.prisma:232](../../prisma/schema.prisma#L232)) y familias sin guardians. La tarea: relajar el validator y la config del bulk import para que **solo `name` sea obligatorio**, y que tanto `code` como los dos tutores sigan la misma lógica "todo o nada" que ya usa el Tutor 2.

Resultado esperado: un Excel válido puede tener solo la columna `Nombre de la familia` llena; `code`, Tutor 1 y Tutor 2 son todos opcionales, pero si se llena algún campo de un tutor, los 3 fields mínimos (firstName, lastName, relationship) siguen siendo required dentro de ese bloque.

---

## Cambios

### 1. Config — marcar columnas como opcionales

[src/bulk-imports/config/family-import.config.ts](../../src/bulk-imports/config/family-import.config.ts)

Cambiar `required: true` → `required: false` en:
- `code` (línea 61)
- `g1_firstName` (línea 76)
- `g1_lastName` (línea 83)
- `g1_relationship` (línea 90)

`name` sigue `required: true`. Esto actualiza automáticamente los headers del Excel ("Requerido"/"Opcional") vía `formatColumnHeader` en [template-generator.service.ts](../../src/bulk-imports/services/template-generator.service.ts).

### 2. Types — permitir null en `code` y `guardian1`

[src/bulk-imports/types/family-import.types.ts](../../src/bulk-imports/types/family-import.types.ts)

```ts
export interface FamilyImportRow {
  code: string | null;
  name: string;
  guardian1: FamilyImportGuardian | null;
  guardian2: FamilyImportGuardian | null;
}
```

Actualizar el comentario del header del archivo para reflejar que ambos guardians son opcionales y `code` puede ser null.

También actualizar `FamilyImportResult.code` a `string | null` (línea 31) para que el log acepte rows sin código.

### 3. Validator — reusar el patrón "all-or-nothing" del g2 para `code` y `g1`

[src/bulk-imports/validators/family-import.validator.ts](../../src/bulk-imports/validators/family-import.validator.ts)

**3.1. `code` opcional (líneas 247-249):**

```ts
const code = get("code");
if (code && code.length > 100) addError("Código", "Máximo 100 caracteres");
```
Ya no bloquea si es null. Solo valida largo si viene.

**3.2. Guardian 1 opcional (línea 256):**

Cambiar el cuarto argumento de `true` a `false`:
```ts
const guardian1 = this.normalizeGuardian("g1", row, errors, false);
const guardian2 = this.normalizeGuardian("g2", row, errors, false);
```

La función `normalizeGuardian` ya soporta este caso: el check `if (!required && !hasAnyField) return null;` (línea 316) deja pasar tutores completamente vacíos. Si el usuario llena **cualquier** campo de Tutor 1, las validaciones required de firstName/lastName/relationship siguen activas → no se puede cargar un tutor a medio llenar.

**3.3. Early-return de `normalizeRow` (líneas 259-271):**

Relajar para aceptar `code` y `guardian1` null:
```ts
if (errors.length > 0 || !name) {
  return { errors };
}
return {
  errors,
  normalized: { code, name, guardian1, guardian2 },
};
```

**3.4. Dedup de `code` (líneas 91-95 y 114-125):**

Envolver el agregado al map en null-check — solo chequear duplicados entre rows que sí tienen código:
```ts
if (result.normalized.code) {
  const codeKey = result.normalized.code.toLowerCase();
  const codeList = codeToRows.get(codeKey) ?? [];
  codeList.push(parsed.rowNumber);
  codeToRows.set(codeKey, codeList);
}
```

El resto del dedup (`codeToRows`, query a `prisma.family`) ya es seguro: el `if (codesToCheck.length > 0)` de la línea 141 se salta si no hay códigos.

### 4. Trigger task — null guards al crear

[src/trigger/bulk-import-families.ts](../../src/trigger/bulk-import-families.ts)

**4.1. Payload types (líneas 26-32):**
```ts
interface FamilyImportPayloadRow {
  rowNumber: number;
  code: string | null;
  name: string;
  guardian1: FamilyImportPayloadGuardian | null;
  guardian2: FamilyImportPayloadGuardian | null;
}
```

**4.2. `family.create` (línea 56):**
`code: row.code` ya funciona — Prisma acepta `null` para campos `String?`. Sin cambios.

**4.3. Build array de guardians (líneas 62-63):**

Reemplazar por un filtro:
```ts
const guardians = [row.guardian1, row.guardian2].filter(
  (g): g is FamilyImportPayloadGuardian => g !== null,
);
```

**4.4. Skip el `createMany` si no hay guardians (línea 65):**

```ts
if (guardians.length > 0) {
  await tx.familyGuardian.createMany({
    data: guardians.map((g) => ({ /* ... */ })),
  });
}
```

**4.5. Return (líneas 80-84):**
El `code: row.code` queda como está — el `FamilyImportResult.code` ya será `string | null`.

---

## Archivos críticos

- [src/bulk-imports/config/family-import.config.ts](../../src/bulk-imports/config/family-import.config.ts) — flags de required
- [src/bulk-imports/types/family-import.types.ts](../../src/bulk-imports/types/family-import.types.ts) — tipos nullables
- [src/bulk-imports/validators/family-import.validator.ts](../../src/bulk-imports/validators/family-import.validator.ts) — lógica de validación
- [src/trigger/bulk-import-families.ts](../../src/trigger/bulk-import-families.ts) — creación en DB

### Utilidades / patrones reutilizados

- Lógica "all-or-nothing" ya implementada en [family-import.validator.ts:316](../../src/bulk-imports/validators/family-import.validator.ts#L316) (`if (!required && !hasAnyField) return null;`) — se aprovecha tal cual para g1.
- `formatColumnHeader` en [template-generator.service.ts](../../src/bulk-imports/services/template-generator.service.ts) — actualiza headers del Excel automáticamente.
- Prisma schema ya nullable en `Family.code` y permite 0 guardians — sin migrations.

---

## Verificación end-to-end

1. `npm run start:dev` en `/be`.
2. Generar plantilla de importación de familias desde el frontend → abrir el Excel → confirmar que los headers de `Código`, `Tutor 1 - Nombre`, `Tutor 1 - Apellido`, `Tutor 1 - Parentesco` muestran `(Opcional)`.
3. **Caso A — solo nombre:** cargar una sola fila con `Nombre de la familia = "Familia Test"` y el resto vacío. Importar. Debe crear la familia sin código y sin guardians.
4. **Caso B — nombre + código:** cargar `Nombre + Código` únicamente. Debe crear la familia con código.
5. **Caso C — nombre + tutor 1 completo:** cargar `Nombre + g1_firstName + g1_lastName + g1_relationship`. Debe crear familia con 1 guardian.
6. **Caso D — tutor 1 a medio llenar:** cargar `Nombre + g1_firstName` y dejar apellido y parentesco vacíos. Debe fallar con errores específicos en `g1_lastName` y `g1_relationship`.
7. **Caso E — código duplicado:** cargar dos filas con el mismo código → debe fallar con "Código duplicado". Luego cargar dos filas sin código → debe pasar OK (no se cruzan nulls).
8. Verificar en Prisma Studio (`npm run prisma:studio`) que las familias creadas en los casos A/B tienen `code = null` cuando corresponde y 0 guardians en A.
