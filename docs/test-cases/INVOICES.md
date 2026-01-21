# Test Cases — Módulo Invoices (Backend + Frontend)

> Alcance: **Invoices + InvoiceLines + Charges** (sin Payments todavía, salvo reglas futuras de “lock” cuando existan pagos).
> Modelo asumido:

* `Charge.status`: `PENDING | INVOICED | PAID | CANCELLED` (o similar)
* `Invoice.status`: `ISSUED | PAID | PARTIALLY_PAID | VOID`
* `InvoiceLine.isActive`: `true` (activa) / `false` (histórica)
* Descuentos viven en `InvoiceLine` (NO se guardan en `Charge`)

---

## 1) Reglas de negocio (core) a validar

### R1 — Un Charge no puede estar en 2 Invoices activas

* Un mismo `chargeId` solo puede existir en **una** `InvoiceLine` activa (`isActive=true`) a la vez.
* Si se intenta crear otra invoice con el mismo charge → error.

### R2 — Crear invoice “consume” charges

* Al crear una invoice con lines:

  * Se insertan `Invoice` + `InvoiceLine(isActive=true)`
  * Cada `Charge` asociado pasa de `PENDING` → `INVOICED`

### R3 — Remover línea devuelve el charge a PENDING

* `removeInvoiceLine`:

  * `InvoiceLine.isActive = false` (no se borra)
  * `Charge.status` vuelve a `PENDING`
  * Totales del invoice se recalculan

### R4 — Void invoice libera todos los charges

* `voidInvoice`:

  * `Invoice.status = VOID`
  * Todas las `InvoiceLines` pasan a `isActive=false`
  * Todos los `Charge.status` vuelven a `PENDING`
  * Se puede re-facturar esos charges luego

### R5 — Totales del invoice

* `Invoice.subtotal` = suma `originalAmount` de líneas activas
* `Invoice.totalDiscount` = suma de descuentos aplicados (líneas activas)
* `Invoice.total` = suma `finalAmount` (líneas activas)

### R6 — Descuento no puede generar valores inválidos

* Nunca permitir `finalAmount < 0`
* Si `discountType=PERCENT`, `discountValue` debe estar en rango razonable (por ej. `0..100`)
* Si `discountType=FIXED_AMOUNT`, `discountValue <= originalAmount`

---

## 2) Test Cases Backend (Integration)

> Nota: cada caso incluye **Setup / Steps / Expected**.
> Idealmente correr contra DB real en test (Postgres) y resetear por test.

### B01 — Happy path: crear invoice sin descuentos

**Setup:** Student S1, Charges C1(10000), C2(20000) en `PENDING`
**Steps:** `createInvoice({ studentId:S1, lines:[{C1},{C2}] })`
**Expected:**

* Invoice creada con 2 líneas activas
* `C1,C2.status=INVOICED`
* Totales: `subtotal=30000`, `totalDiscount=0`, `total=30000`

---

### B02 — Crear invoice con recipient OTHER (sin student)

**Setup:** Charge manual NO existe aún (solo invoice con charges si tu API lo requiere).
Si tu modelo permite invoice sin student: ok.
**Steps:** `createInvoice({ studentId:null, recipientName:"Juan Perez", lines:[...] })`
**Expected:**

* `studentId=null`, snapshot de recipient OK
* Totales OK
* Cargos INVOICED igual

---

### B03 — Crear invoice con múltiples descuentos (%)

**Setup:** S1, charges C1..C4 cada uno `amount=10000` PENDING
**Steps:** createInvoice con 4 lines con `PERCENT 10`
**Expected:**

* Cada line: `finalAmount=9000`
* Totales: `subtotal=40000`, `totalDiscount=4000`, `total=36000`
* Charges `INVOICED`

---

### B04 — Validación: percent > 100 rechaza

**Setup:** S1, C1 amount=10000 PENDING
**Steps:** createInvoice line con `discountType=PERCENT, discountValue=1000`
**Expected:** error de validación (400/graphql error), nada creado, `C1.status=PENDING`

---

### B05 — Validación: fixed_amount > original rechaza

**Setup:** S1, C1 amount=10000 PENDING
**Steps:** descuento `FIXED_AMOUNT=15000`
**Expected:** error, invoice no creada, charge sigue PENDING

---

### B06 — Validación: finalAmount nunca negativo (edge)

**Setup:** S1, C1 amount=10000
**Steps:** descuento fixed=999999
**Expected:** error, rollback.

---

### B07 — Concurrencia / exclusividad: mismo charge en 2 invoices

**Setup:** S1, C1 PENDING
**Steps:**

1. Crear Invoice I1 con C1
2. Intentar crear Invoice I2 con C1 de nuevo
   **Expected:** paso 2 falla (unique/partial index o regla service), I2 no se crea.

---

### B08 — Remover una línea recalcula totales y libera charge

**Setup:** S1, C1=10000, C2=20000, createInvoice I1 con ambos
**Steps:** `removeInvoiceLine(lineId de C1)`
**Expected:**

* Line de C1 `isActive=false`
* `C1.status=PENDING`, `C2.status=INVOICED`
* Totales I1: `subtotal=20000`, `total=20000`

---

### B09 — Re-facturar charge removido crea nueva line limpia

**Setup:** continuar de B08
**Steps:** crear I2 con C1 sin descuento
**Expected:**

* Nueva InvoiceLine L2 activa con `discount=null`, `finalAmount=10000`
* En DB existen 2 lines con `chargeId=C1`: una histórica + una activa

---

### B10 — Void invoice libera todos los charges

**Setup:** S1, C1..C3 PENDING, createInvoice I1 con 3 lines
**Steps:** `voidInvoice(I1)`
**Expected:**

* `I1.status=VOID`
* Todas las lines `isActive=false`
* Todos los charges `PENDING`
* Se puede crear nueva invoice con C1..C3

---

### B11 — Invoice vacía: comportamiento definido (elige una política)

**Política A (permitir vacío):**

* remove última línea → invoice queda total=0 (válido)
  **Política B (no permitir vacío):**
* remove última línea → error “invoice must have at least 1 active line”
  **Test:** crear invoice con 1 charge y remover
  **Expected:** según política.

---

### B12 — Editar descuento recalcula totales

**Setup:** S1, C1=10000, C2=20000, invoice con ambos sin descuento
**Steps:** `updateInvoiceLine(C1, PERCENT 10)`
**Expected:** totals `subtotal=30000`, `totalDiscount=1000`, `total=29000`

---

### B13 — Editar descuento y luego remover la línea (descuento no persiste)

**Setup:** S1, C1=10000, create invoice I1, aplicar descuento 10% a la line de C1
**Steps:**

1. updateLine con descuento
2. removeLine de C1
3. crear invoice I2 con C1 sin descuento
   **Expected:**

* C1 vuelve a PENDING al remover
* I2 se crea con finalAmount=10000 (sin descuento)
* Descuento quedó solo en line histórica de I1

---

### B14 — Delete vs Void (si implementás “delete” como soft-delete)

**Setup:** invoice I1 con 2 charges INVOICED
**Steps:** `deleteInvoice(I1)` (en realidad `void`)
**Expected:** mismo resultado que B10.

---

### B15 — InvoiceNumber (si es autoincrement por org/tenant)

**Setup:** crear 3 invoices seguidas
**Expected:** invoiceNumber incremental sin colisiones

---

## 3) Test Cases Frontend (E2E / UI)

> Objetivo: asegurar que el UI no permita estados imposibles (bug dreamclass style).
> Ideal: Playwright/Cypress.

### F01 — Create invoice: selección de charges (happy)

**Steps:**

* Entrar a Create Invoice de Student S1
* Seleccionar 2 charges PENDING
* Crear
  **Expected:** UI muestra invoice con total correcto, charges ya no aparecen como disponibles.

---

### F02 — Validación UI: no permitir “Create” sin líneas

**Steps:** deseleccionar todo
**Expected:** botón Create deshabilitado o error visible.

---

### F03 — Aplicar descuento percent: clamp 0..100

**Steps:** ingresar `150%`
**Expected:** UI bloquea / muestra error / normaliza a 100 (definí cuál).

---

### F04 — Aplicar fixed discount: no permitir > amount

**Steps:** amount=10000, ingresar descuento=15000
**Expected:** error UI, no permite guardar.

---

### F05 — No permitir totals negativos

**Steps:** intentar forzar un descuento que dé negativo
**Expected:** UI no lo permite; total nunca < 0.

---

### F06 — Remover línea actualiza total instantáneo

**Steps:** invoice draft en pantalla, remover 1 charge
**Expected:** total baja correctamente; si era la última línea → comportamiento según política.

---

### F07 — Edit discount y luego Remove

**Steps:**

1. aplicar descuento a una línea
2. remover esa misma línea
   **Expected:**

* el total se recalcula sin esa línea
* si luego se vuelve a agregar ese charge (si el UI lo permite), entra sin descuento previo

---

### F08 — “Create and Notify” (si lo implementás luego)

**Expected:** no rompe create; estado server igual; notificación se dispara (mock).

---

### F09 — “Lock” cuando existan pagos (regla futura)

**Regla sugerida:** si invoice tiene pagos > 0, bloquear:

* remove line
* edit discount
* void invoice (o pedir flow especial de credit note)
  **Expected:** botones deshabilitados + tooltip “Invoice has payments”.

---

### F10 — “Past due charges” toggle (si lo usás)

**Steps:** toggle ON
**Expected:** UI incluye sección “Past due” según query (dueDate < startOfMonth && status=PENDING)

---

## 4) Validaciones mínimas (Backend y Frontend)

### Backend (obligatorias)

* Validar descuentos (rangos) + `finalAmount >= 0`
* Validar charges pertenecen al student (si invoice es de student)
* Validar `Charge.status == PENDING` al incluirlo
* Validar exclusividad (no charge en invoice activa)
* Transacción: createInvoice debe ser atómico

### Frontend (recomendadas)

* Clamp/validar inputs de descuento
* No permitir crear invoice sin líneas
* Mostrar total siempre consistente (sin floats; todo centavos)
* Confirm modal al void/delete

---

## 5) Notas de diseño

* Nunca calcular totales con floats; todo en **centavos int**
* `finalAmount` se calcula y persiste en backend (source of truth)
* Si removés una línea: esa línea queda histórica (`isActive=false`), no se borra
* El descuento “vive” en la línea, por eso **no se “arrastra”** al re-facturar el charge

---