# Notas de Lógica de Negocio

## Configuración de Billing

Las constantes en `src/charges/constants/billing.constants.ts` actualmente están hardcodeadas:

- `CHARGE_DAY_OF_MONTH = 1` - Día del mes en que se generan los cargos
- `GRACE_DAYS = 9` - Días de gracia después de la fecha de emisión

**TODO**: Estas variables vendrán por configuración de la academia. El día de cobro y los días de gracia serán configurables por cada academia.

---

## Limpieza de Cargos

Cuando se borre o deshabilite un estudiante, hay que asegurarse de borrar o cancelar todos sus cargos pendientes para limpiar la base de datos.

**TODO**: Implementar esto como parte del flujo de eliminación/deshabilitación de estudiantes.

---

## Estructura de Módulos

Patrón de organización para módulos como `charges`, `fees`, `students`:

```
src/module-name/
  entities/           # Modelos GraphQL (ObjectTypes que representan datos de DB)
    module.entity.ts
  
  enums/              # Enums separados de las entities
    module-type.enum.ts
    module-status.enum.ts
  
  dto/                # Data Transfer Objects
    create-module.input.ts    # @InputType() para mutations
    update-module.input.ts
    module-response.output.ts # @ObjectType() para respuestas
    paginated-module.output.ts
  
  constants/          # Constantes del módulo
    module.constants.ts
  
  utils/              # Funciones auxiliares
    module-calculator.ts
```

**Notas**:
- Los enums deben registrarse con `registerEnumType()` de NestJS GraphQL
- Separar inputs (*.input.ts) de outputs (*.output.ts) en la carpeta dto/
- Las entities son solo para modelos que representan tablas de la DB

---

## Borrado de Fees

Lógica implementada en `deleteFee`:

| Escenario | Acción |
|-----------|--------|
| Fee con **todos** los cargos PENDING | ✅ Borra fee + todos sus cargos |
| Fee con **al menos un** cargo INVOICED | ❌ Bloquea borrado + error |

**Implementación** (`src/fees/fees.service.ts`):
1. Verificar si hay cargos con status `INVOICED`
2. Si hay → tirar `BadRequestException`
3. Si no hay → borrar todos los cargos con `deleteMany`, luego borrar el fee

**Estados de Charge**:
- `PENDING` - Cargo creado, pendiente de pago
- `PAID` - Cargo pagado
- `CANCELLED` - Cargo cancelado
- `INVOICED` - Cargo incluido en una factura (bloquea borrado del fee)

---

## Edición de Fees

Al editar un Fee (template), los cargos ya creados **mantienen su monto original**. El campo `amount` en Charge es un snapshot del `Fee.cost` al momento de la asignación.

---

## Invoice Module

### Modelo conceptual

```
Fee (plantilla)
  └── genera → Charge (deuda operativa, mes a mes)
                 └── puede ser incluido en → Invoice (documento contable)
                       └── a través de → InvoiceLine (snapshot contable)
```

### Tipos de InvoiceLine

| Tipo | chargeId | Descripción | Monto |
|------|----------|-------------|-------|
| CHARGE | Requerido | Snapshot de Fee.description | Snapshot de Charge.amount |
| MANUAL | null | Usuario ingresa (materiales, ajuste, etc.) | Usuario ingresa |

### Estados de Invoice

- `ISSUED` - Factura emitida (default al crear)
- `PAID` - Todos los cargos pagados
- `PARTIALLY_PAID` - Algunos cargos pagados (para pagos parciales futuros)
- `VOID` - Anulada (soft delete, mantiene historial)

### Reglas de negocio

1. **Descuentos solo en InvoiceLine** - El `Charge.amount` nunca se modifica
2. **isActive en InvoiceLine** - Flag técnico para unicidad vs histórico:
   - `true` = línea activa (cuenta para validaciones)
   - `false` = línea histórica (invoice anulada o línea removida)
3. **Totales calculados en backend** - Ignorar valores del frontend
4. **Recipient flexible** - `studentId` nullable para casos "OTHER"

### Flujo de Charge.status con Invoice

| Acción | Status Charge |
|--------|---------------|
| Crear InvoiceLine tipo CHARGE | PENDING → INVOICED |
| VOID Invoice | INVOICED → PENDING |
| Remove InvoiceLine | INVOICED → PENDING |

### Índice parcial para unicidad

Un Charge solo puede estar en UNA InvoiceLine activa:

```sql
CREATE UNIQUE INDEX uniq_active_charge_invoiceline 
ON "InvoiceLine" ("chargeId") 
WHERE "chargeId" IS NOT NULL AND "isActive" = true;
```
