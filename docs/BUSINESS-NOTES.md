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

