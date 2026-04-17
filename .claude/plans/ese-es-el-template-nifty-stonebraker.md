# Plan — Mejoras al template XLSX de importación de alumnos

## Context

El template Excel que se descarga para importar alumnos en bulk tiene 3 problemas de UX:

1. **Demasiadas filas vacías (500)** — satura visualmente cuando el usuario abre el archivo.
2. **No hay fila de ejemplo** — el usuario no sabe cómo se ve un registro bien formado (ej. formato de fecha, qué ponerle a teléfono con código país, etc.).
3. **Headers no distinguen requerido de opcional** — el usuario no sabe qué campos puede dejar en blanco hasta que intenta subir y falla.

Los 3 cambios son cosméticos/UX pero afectan el flujo de validación, así que hay que tocar template-generator y parser en conjunto para no romper el contrato.

## Approach

Tres cambios puntuales, todos en [src/bulk-imports/](src/bulk-imports/):

### 1. Reducir filas vacías de 500 → 10

En [src/bulk-imports/services/template-generator.service.ts:9](src/bulk-imports/services/template-generator.service.ts#L9) cambiar `DATA_ROW_COUNT = 500` a `DATA_ROW_COUNT = 10`.

Impacto: la data validation (dropdowns) se aplica a filas 3..12 en vez de 2..501. Si el usuario agrega filas manualmente, Excel/Sheets suele extender la validation automáticamente; si no, igual se valida en el parseo del backend.

### 2. Fila de ejemplo (fila 2) con auto-skip por estilo italic

**En config** — [src/bulk-imports/config/student-import.config.ts](src/bulk-imports/config/student-import.config.ts):

Agregar campo `example: string` a cada `StudentImportColumn` con valores realistas:

```
firstName: "Juan"
lastName: "Pérez"
email: "juan.perez@example.com"
phoneCountryCode: PHONE_CODES[0] formateado (ej. "+54 Argentina")
phoneNumber: "1123456789"
birthDate: "15/03/2000"
gender: GENDER_LABELS[primera opción] (ej. "Masculino")
documentType: DOCUMENT_TYPE_LABELS[primera opción] (ej. "DNI")
documentNumber: "12345678"
address: "Av. Corrientes 1234"
city: "Buenos Aires"
country: COUNTRIES[0] formateado (ej. "🇦🇷 Argentina")
postalCode: "C1043"
```

Los ejemplos de dropdowns deben usar el primer valor del array ya existente (no hardcodear strings que después puedan divergir del dropdown).

**En template-generator** — [src/bulk-imports/services/template-generator.service.ts](src/bulk-imports/services/template-generator.service.ts):

Agregar función `writeExampleRow(sheet, columns)` que corre después de `writeHeaderRow`:
- Escribe los `example` en fila 2.
- Aplica a todas las celdas de la fila 2: `font: { italic: true, color: { argb: "FF888888" } }` y `fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } }`.

El `DATA_ROW_COUNT` ahora referencia rango 3..12 (no 2..501). Ajustar el loop de data validation en `attachDropdowns` para empezar en row 3.

**En parser** — [src/bulk-imports/services/xlsx-parser.service.ts](src/bulk-imports/services/xlsx-parser.service.ts):

En el loop de filas (línea 58-71), antes de procesar una fila, chequear si es fila de ejemplo:
- Función helper `isExampleRow(row)`: retorna `true` si **todas** las celdas con valor tienen `cell.font?.italic === true`.
- Si es ejemplo, `continue`.

Checar todas las celdas (no solo la primera) reduce falsos positivos: un usuario que copia la fila de ejemplo y sobrescribe una celda probablemente pierda el italic en esa celda, lo cual ya no match-ea el predicado.

### 3. Headers con `(Requerido)` / `(Opcional)`

**En config** — [src/bulk-imports/config/student-import.config.ts](src/bulk-imports/config/student-import.config.ts):

Agregar función exportada:

```ts
export function formatColumnHeader(col: StudentImportColumn): string {
  return `${col.header} (${col.required ? "Requerido" : "Opcional"})`;
}
```

**Reemplazar** todos los usos de `col.header` por `formatColumnHeader(col)` en:
- [template-generator.service.ts:39](src/bulk-imports/services/template-generator.service.ts#L39) — `writeHeaderRow`
- Wherever [bulk-imports.service.ts](src/bulk-imports/bulk-imports.service.ts) construye `expectedHeaders` para pasarle al parser (grep `STUDENT_IMPORT_COLUMNS.map` en ese archivo y ajustar).

Esto mantiene single source of truth: el formato del header se genera en un lugar y se consume tanto al escribir como al leer, así nunca divergen.

**Nota de compatibilidad:** la feature todavía no está mergeada (carpeta `src/bulk-imports/` aparece en git status como untracked), así que no hay templates antiguos en producción que rompan. No hace falta fallback.

## Archivos a modificar

- [src/bulk-imports/config/student-import.config.ts](src/bulk-imports/config/student-import.config.ts) — agregar `example` a cada columna + función `formatColumnHeader`.
- [src/bulk-imports/services/template-generator.service.ts](src/bulk-imports/services/template-generator.service.ts) — `DATA_ROW_COUNT = 10`, nueva función `writeExampleRow`, ajustar rango de `attachDropdowns`, usar `formatColumnHeader`.
- [src/bulk-imports/services/xlsx-parser.service.ts](src/bulk-imports/services/xlsx-parser.service.ts) — agregar `isExampleRow` y skip en el loop de parseo.
- [src/bulk-imports/bulk-imports.service.ts](src/bulk-imports/bulk-imports.service.ts) — usar `formatColumnHeader` al construir `expectedHeaders`.

## Verificación end-to-end

1. `npm run start:dev` — asegurar que el build no rompe.
2. Llamar a la GraphQL query/mutation que devuelve el template (existe en [bulk-imports.resolver.ts](src/bulk-imports/bulk-imports.resolver.ts)) y descargar el XLSX.
3. **Visual check** en Excel y Numbers:
   - Solo 10 filas vacías (filas 3..12).
   - Fila 2 tiene datos de ejemplo en italic con fondo gris claro.
   - Headers dicen `Nombre (Requerido)`, `Teléfono (Opcional)`, etc.
   - Dropdowns siguen funcionando en todas las filas 3..12.
4. **End-to-end sin borrar el ejemplo**: subir el template sin modificar → el backend debe parsearlo como 0 filas válidas (ejemplo salteado, resto vacías). No debe crearse ningún alumno.
5. **End-to-end con datos**: sobrescribir filas 3 y 4 con alumnos reales → el backend crea 2 alumnos, ignora la fila 2 de ejemplo.
6. **Regresión**: subir un template viejo (si hay alguno en tests) — debería fallar con `"Faltan columnas"` porque los headers cambiaron. Confirmar que el error es claro.
