# Plan: Aplicar las 2 migraciones pendientes

## Context

El backend agregó 2 migraciones SQL manuales que aún no se aplicaron a la DB de Supabase. El código TypeScript ya compila pero la DB todavía no tiene las columnas/enums necesarios, así que cualquier operación en runtime va a fallar:
- Crear una Family con `code` → falla (columna no existe)
- Disparar un `BULK_FAMILY_IMPORT` → falla (valor del enum no existe)
- Import de Students referenciando `codigo_familia` → falla

**Migraciones pendientes** (en orden):

1. [prisma/migrations/20260417210000_add_family_code_unique/migration.sql](prisma/migrations/20260417210000_add_family_code_unique/migration.sql)
   ```sql
   ALTER TABLE "Family" ADD COLUMN "code" TEXT;
   CREATE UNIQUE INDEX "Family_academyId_code_key" ON "Family"("academyId", "code");
   ```

2. [prisma/migrations/20260417220000_add_bulk_family_import_type/migration.sql](prisma/migrations/20260417220000_add_bulk_family_import_type/migration.sql)
   ```sql
   ALTER TYPE "BulkOperationType" ADD VALUE 'BULK_FAMILY_IMPORT';
   ```

## Recomendación: `prisma migrate deploy` (mismo método que la migración anterior)

Como la migración anterior (`add_class_code_unique`) la aplicaste con `prisma migrate deploy` sin problemas, lo más consistente es repetir el flujo.

### Paso único

```bash
cd "/Users/nicolastaboada/Desktop/Proyectos SaaS/nimbora-class/be"
npx prisma migrate deploy
```

Prisma:
- Detecta las 2 migraciones pendientes (las que no están en `_prisma_migrations`)
- Las aplica en orden
- Actualiza `_prisma_migrations` automáticamente → historial queda sincronizado

### Nota sobre `ALTER TYPE ADD VALUE` en transacción

En Postgres 12+, `ALTER TYPE ... ADD VALUE` se permite dentro de una transacción **siempre que el nuevo valor no se use en la misma transacción**. La migración 2 solo agrega el valor (no lo usa), así que `prisma migrate deploy` lo aplica sin problema. Confirmado en [Postgres docs sobre ALTER TYPE](https://www.postgresql.org/docs/current/sql-altertype.html).

### Si `prisma migrate deploy` falla

Fallback manual (Supabase SQL Editor):
1. Dashboard → SQL Editor
2. Ejecutar el SQL de la migración 1
3. Ejecutar el SQL de la migración 2
4. Actualizar `_prisma_migrations` para que no queden duplicadas en el próximo `deploy`:
   ```sql
   INSERT INTO "_prisma_migrations"
     (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
   VALUES
     (gen_random_uuid()::text, 'manual', now(),
      '20260417210000_add_family_code_unique', null, null, now(), 1),
     (gen_random_uuid()::text, 'manual', now(),
      '20260417220000_add_bulk_family_import_type', null, null, now(), 1);
   ```

## Verificación post-aplicación

Desde Supabase SQL Editor:

```sql
-- 1) Family.code existe y tiene unique index
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'Family' AND column_name = 'code';
-- Esperado: code | text

SELECT indexname FROM pg_indexes
WHERE tablename = 'Family' AND indexname = 'Family_academyId_code_key';
-- Esperado: 1 fila

-- 2) Enum BulkOperationType tiene BULK_FAMILY_IMPORT
SELECT unnest(enum_range(NULL::"BulkOperationType"));
-- Esperado: la lista incluye BULK_FAMILY_IMPORT

-- 3) _prisma_migrations registra las 2 nuevas
SELECT migration_name, finished_at FROM "_prisma_migrations"
WHERE migration_name LIKE '%family%' ORDER BY started_at DESC LIMIT 5;
-- Esperado: ambas con finished_at no null
```

Si todo OK → probar end-to-end subiendo un XLSX de Familias desde la UI.

## Referencias

- Todas las migraciones locales: [prisma/migrations/](prisma/migrations/)
- Conexión DB: `.env` (DATABASE_URL pooler, DIRECT_URL direct connection de Supabase — Prisma usa DIRECT_URL para migraciones)
