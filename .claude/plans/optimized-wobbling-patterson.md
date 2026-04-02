# Plan: Wizard de Emisión Masiva AFIP

## Context

La academia necesita emitir facturas electrónicas en AFIP a partir de sus facturas internas ya pagadas (PAID). El wizard permite seleccionar facturas, ver un resumen con desglose por tipo de comprobante, y emitir en bulk usando Trigger.dev. Se replica el patrón existente de `bulk-invoices`.

---

## Flujo del Wizard

**Step 1 — Selección**: card de validación de pre-requisitos + tabla de facturas PAID elegibles con checkboxes
**Step 2 — Resumen**: desglose por tipo comprobante, punto de venta, fecha emisión, botón emitir
**Step 3 — Resultados**: polling de BulkOperation, tabla de resultados con CAE/errores

---

## Phase 1: Backend — Utilidades AFIP

### 1.1 Resolver tipo de comprobante
**Nuevo**: `be/src/afip/utils/resolve-cbte-tipo.ts`
- Función pura: `resolveCbteTipo(academyTaxStatus, recipientTaxCondition) => number`
- Academy RI + receptor Cons.Final/Exento → Factura B (6)
- Academy RI + receptor RI/Monotributo → Factura A (1)
- Academy Monotributo/Exento → Factura C (11)

### 1.2 Crear instancia AFIP standalone
**Nuevo**: `be/src/afip/utils/create-afip-instance.ts`
- Función standalone que toma `AcademyAfipSettings` y retorna instancia del SDK `Afip`
- Necesario porque el task de Trigger.dev corre fuera del DI de NestJS
- Extraer lógica de `AfipService.getAfipInstanceForAcademy()`

---

## Phase 2: Backend — Query y Mutation

### 2.1 DTOs nuevos
**Nuevo**: `be/src/bulk-operations/dto/invoices-for-bulk-afip.input.ts`
- `search?: string` — filtro por nombre
- `period?: string` — filtro por mes (yyyy-MM)

**Nuevo**: `be/src/bulk-operations/dto/bulk-create-afip-invoices.input.ts`
- `invoiceIds: string[]`
- `ptoVta: number`
- `cbteFch: Date`

### 2.2 Entities nuevas
**Nuevo**: `be/src/bulk-operations/entities/invoice-bulk-afip-preview.entity.ts`
- invoiceId, invoiceNumber, studentName, status, total

**Nuevo**: `be/src/bulk-operations/entities/afip-bulk-summary.entity.ts`
- totalCount, totalAmount, breakdown: [{ cbteTipo, label, count, amount }]

### 2.3 Extender service
**Modificar**: `be/src/bulk-operations/bulk-operations.service.ts`

Agregar métodos:
- `findInvoicesForBulkAfip(input, academyId, page, limit)` — facturas PAID sin AfipInvoice EMITTED (incluye ERROR para reintentar)
- `bulkCreateAfipInvoices(input, academyId)` — valida, crea BulkOperation BULK_AFIP, dispara task
- `getAfipBulkSummary(invoiceIds, academyId)` — resuelve cbteTipo por factura y agrupa

### 2.4 Extender resolver
**Modificar**: `be/src/bulk-operations/bulk-operations.resolver.ts`
- Query `invoicesForBulkAfip` (paginado)
- Query `afipBulkSummary` (desglose para step 2)
- Mutation `bulkCreateAfipInvoices`

### 2.5 Extender module
**Modificar**: `be/src/bulk-operations/bulk-operations.module.ts`
- Importar AfipModule y FeatureFlagsModule

---

## Phase 3: Backend — Trigger.dev Task

**Nuevo**: `be/src/trigger/bulk-create-afip-invoices.ts`

Payload: `{ operationId, invoiceIds, ptoVta, cbteFch, academyId }`

Procesamiento secuencial por cada invoice:
1. Fetch invoice con student + billingProfile
2. Resolver datos fiscales (billing profile o fallback Consumidor Final: DocTipo 99, DocNro 0)
3. Calcular cbteTipo con `resolveCbteTipo()`
4. Obtener último nro: `afip.ElectronicBilling.getLastVoucher(ptoVta, cbteTipo)`
5. Crear registro AfipInvoice con status EMITTING
6. Llamar `afip.ElectronicBilling.createVoucher(data)`
   - Concepto: 2 (Servicios)
   - FchServDesde/FchServHasta/FchVtoPago: usar cbteFch como default
   - ImpTotal: invoice.total / 100 (centavos a pesos)
   - MonId: PES, MonCotiz: 1
7. Si éxito: actualizar AfipInvoice con CAE, cbteNro, status EMITTED
8. Si error: actualizar AfipInvoice con lastError, status ERROR
9. Actualizar BulkOperation con progreso

Resultado por item: `{ invoiceId, studentName, invoiceNumber, status, cbteNro?, cae?, total?, error? }`

---

## Phase 4: Frontend — Módulo afip-invoices

### 4.1 Estructura de archivos
```
web/modules/afip-invoices/
├── index.ts
├── types/index.ts
├── graphql/
│   ├── queries.ts      (INVOICES_FOR_BULK_AFIP, AFIP_BULK_SUMMARY)
│   └── mutations.ts    (BULK_CREATE_AFIP_INVOICES)
├── hooks/
│   ├── use-afip-invoice-filters.ts
│   ├── use-afip-invoice-selection.ts
│   ├── use-afip-prerequisites.ts
│   └── use-bulk-create-afip-invoices.ts
└── components/
    ├── afip-bulk-page.tsx
    ├── prerequisites-card.tsx
    ├── selection-step.tsx
    ├── afip-invoices-table.tsx
    ├── summary-step.tsx
    └── results-step.tsx
```

### 4.2 Types
**Nuevo**: `web/modules/afip-invoices/types/index.ts`
- `AfipBulkInvoice` — fila de tabla (invoiceId, invoiceNumber, studentName, status, total)
- `AfipPrerequisites` — estado de pre-requisitos
- `AfipBulkSummary` — resumen con breakdown por cbteTipo
- `AfipBulkResult` — resultado por item (invoiceId, studentName, status, cbteNro, cae, error)

### 4.3 GraphQL
**Nuevo**: `web/modules/afip-invoices/graphql/queries.ts`
- `INVOICES_FOR_BULK_AFIP` — paginado, para tabla step 1
- `AFIP_BULK_SUMMARY` — recibe invoiceIds, retorna desglose para step 2
- Reutilizar `GET_BULK_OPERATION` de bulk-invoices para polling

**Nuevo**: `web/modules/afip-invoices/graphql/mutations.ts`
- `BULK_CREATE_AFIP_INVOICES` — dispara operación

### 4.4 Hooks
**Nuevo**: `use-afip-invoice-filters.ts`
- Replicar `use-bulk-invoice-filters.ts` — search + period (sin includePastDue)

**Nuevo**: `use-afip-invoice-selection.ts`
- Replicar `use-bulk-invoice-selection.ts` — keyed por invoiceId

**Nuevo**: `use-afip-prerequisites.ts`
- Query `afipSettings` + `afipSalesPoints`
- Computa: onboardingCompleted, delegationOk, hasActiveSalesPoint, allMet

**Nuevo**: `use-bulk-create-afip-invoices.ts`
- Replicar patrón de polling de `use-bulk-create-invoices.ts`
- Module-level interval (sobrevive navegación)
- NO redirige — transiciona a step 3 dentro del wizard

### 4.5 Componentes

**`afip-bulk-page.tsx`** — Orquestador del wizard
- State: `step: 'selection' | 'summary' | 'results'`
- Maneja todos los hooks, pasa props a cada step
- Preserva selección al ir y volver entre steps

**`prerequisites-card.tsx`** — Card de validación (top de step 1)
- 3 checks: onboarding, delegación, punto de venta
- Si falla: warning + link a /settings/impositivo
- Si todo ok: card verde o no se muestra

**`selection-step.tsx`** — Step 1
- Prerequisites card
- Filtros (search + period)
- Tabla de facturas
- Footer: "X facturas seleccionadas" + botón "Siguiente" (disabled si !allMet || selectedCount === 0)

**`afip-invoices-table.tsx`** — Tabla con checkboxes
- Columnas: ☐, Alumno, Nro Factura, Estado (badge PAGADA), Monto
- Header checkbox con indeterminate
- Paginación
- Replicar patrón de `bulk-invoices-table.tsx`

**`summary-step.tsx`** — Step 2
- Resumen: X facturas, $XXX total
- Desglose: "Facturas B: 18 — $290.000" etc (datos de query `afipBulkSummary`)
- Punto de venta (select, preseleccionado si hay uno solo)
- Fecha de emisión (date picker, default hoy)
- Botones: "Volver" + "Emitir X facturas en AFIP"

**`results-step.tsx`** — Step 3
- Polling BulkOperation con barra de progreso
- Cuando completa: tabla de resultados (Alumno, Nro AFIP, CAE, Monto, Status badge)
- Botón "Notificar por email" (disabled, placeholder futuro)
- Botón "Finalizar" → navega a /finance/invoices

### 4.6 Ruta
**Nuevo**: `web/app/(authenticated)/finance/invoices/afip-bulk/page.tsx`
**Modificar**: `web/lib/config/routes.ts` — agregar AFIP_BULK_INVOICES

---

## Orden de implementación

1. Backend utilities (resolve-cbte-tipo, create-afip-instance)
2. Backend DTOs + entities
3. Backend service methods + resolver
4. Backend Trigger.dev task
5. Frontend types + GraphQL
6. Frontend hooks
7. Frontend components (prerequisites → table → selection step → summary step → results step → page)
8. Ruta

---

## Verification

1. Navegar a /finance/invoices/afip-bulk
2. Si onboarding no está completo → card de warning, botón Siguiente disabled
3. Si está completo → tabla muestra facturas PAID sin emisión AFIP
4. Seleccionar facturas → Siguiente → Step 2 muestra resumen con desglose
5. Elegir punto de venta y fecha → Emitir → se crea BulkOperation
6. Step 3 muestra progreso → al completar, tabla de resultados con CAE
7. Finalizar → vuelve a lista de facturas
