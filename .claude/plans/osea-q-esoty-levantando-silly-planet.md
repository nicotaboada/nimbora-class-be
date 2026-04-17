# Plan: arreglar agotamiento de conexiones Prisma/Supabase

## Context

Al correr el bulk import de estudiantes, el server NestJS empezó a tirar:

```
FATAL: (EMAXCONNSESSION) max clients reached in session mode -
max clients are limited to pool_size: 15
```

**Causa raíz:**

1. `DATABASE_URL` apunta al pooler de Supabase en **session mode** (puerto `5432`), que limita a **15 clientes simultáneos** en todo el proyecto. En session mode, las conexiones se reservan por toda la vida del cliente (no se reciclan por request).

2. Cada task de Trigger.dev corre en un **proceso worker separado** del server NestJS y hace su propio `new PrismaClient()` a nivel de módulo:
   - [src/trigger/bulk-import-students.ts:7](src/trigger/bulk-import-students.ts#L7)
   - [src/trigger/bulk-create-invoices.ts:21](src/trigger/bulk-create-invoices.ts#L21)
   - [src/trigger/bulk-create-afip-invoices.ts:21](src/trigger/bulk-create-afip-invoices.ts#L21)
   - [src/trigger/bulk-create-family-invoices.ts:21](src/trigger/bulk-create-family-invoices.ts#L21)

3. Cada PrismaClient abre su propio pool (default ≈ `num_cpus * 2 + 1`, típicamente 9-17 conexiones). Entre el server Nest y uno o más workers de Trigger activos, las 15 slots de session mode se agotan casi instantáneamente.

El error explotó en `classes.service.ts:403` (server Nest) porque el worker de Trigger ya había consumido el cupo.

**Outcome esperado:** dejar el backend estable bajo carga de bulk imports sin tocar código de negocio, usando la configuración estándar recomendada por Supabase + Prisma + Trigger.dev.

---

## Approach

La solución canónica es **usar el pooler en transaction mode** (puerto `6543`) para runtime, donde las conexiones se reciclan por transacción y soporta cientos de clientes lógicos sobre el mismo cupo físico. Además, limitar el pool interno de Prisma a 1 conexión por cliente (recomendación oficial cuando se está detrás de pgbouncer), y acotar la concurrencia de los bulk tasks para evitar picos.

### Cambios

**1. [.env](.env) — rutear runtime por transaction pooler**

```diff
-DATABASE_URL="postgresql://...@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
-#DATABASE_URL="postgresql://...@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
+DATABASE_URL="postgresql://...@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
 DIRECT_URL="postgresql://...@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
```

- `pgbouncer=true`: obligatorio — desactiva prepared statements que no son compatibles con transaction mode.
- `connection_limit=1`: el pooling real lo hace pgbouncer; Prisma solo necesita 1 socket lógico por cliente. Esto hace que cada worker de Trigger + el server Nest ocupen apenas 1 conexión cada uno.
- `DIRECT_URL` queda en 5432 — solo se usa para `prisma migrate` / introspección, no para runtime.

**2. [trigger.config.ts](trigger.config.ts) — limitar concurrencia de bulk tasks (opcional, defensa en profundidad)**

No es estrictamente necesario tras el fix del `.env`, pero evita abrir N workers simultáneos durante un bulk grande. Se puede agregar `queue: { concurrencyLimit: 1 }` a cada bulk task (en el `task({...})`), no en el config global.

**3. `prisma.$disconnect()` en los Trigger tasks — NO hace falta**

Trigger.dev mata el proceso worker al finalizar, así que el pool se libera solo. No agregamos cleanup innecesario.

---

## Archivos modificados

- [.env](.env) — cambiar `DATABASE_URL` al pooler 6543 con `pgbouncer=true&connection_limit=1`.
- (Opcional) cada task en [src/trigger/](src/trigger/) — agregar `queue: { concurrencyLimit: 1 }` al `task({...})`.

No se toca:
- [prisma/schema.prisma](prisma/schema.prisma) — ya tiene `directUrl` correctamente configurado.
- [src/prisma/prisma.service.ts](src/prisma/prisma.service.ts) — queda igual.
- Los `new PrismaClient()` en los tasks — es el patrón estándar para workers en proceso separado.

---

## Verificación

1. Reemplazar el `DATABASE_URL` en `.env`.
2. Reiniciar el server: `npm run start:dev`.
3. Verificar que queries normales responden (por ejemplo, una query `students` desde GraphQL Playground).
4. Volver a correr el bulk import de estudiantes que fallaba antes.
5. Durante/después del bulk, ejecutar una query al server Nest (ej. `classStudent.findMany`) y confirmar que **no** tira `EMAXCONNSESSION`.
6. Confirmar que el task de Trigger corre a término y el `BulkOperation` queda en `COMPLETED`.

### Sanity check adicional

Si a futuro vuelve a pasar, revisar en el dashboard de Supabase (Database → Roles → Pooler) cuántos clientes hay conectados. Con la config nueva, debería verse 1 cliente por proceso activo (server Nest + cada worker de Trigger activo) en vez del pool completo por proceso.
