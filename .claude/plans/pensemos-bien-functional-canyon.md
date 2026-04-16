# Plan: Arreglar tipos en invoice-mapper.util.ts

## Contexto

El mapper `mapInvoiceToEntity` estaba tipado como `invoice: any`, lo que genera errores de ESLint strict. Al intentar tiparlo correctamente se descubrieron 2 problemas compuestos:

1. **Bug silencioso de datos**: todas las queries que incluyen `family` hacen `family: { include: { students: true } }`. Nunca incluyen `guardians` ni `classStudents` anidados. Como `mapInvoiceToEntity` verifica en runtime `invoice.family.guardians` antes de mapear, el resultado es que **`family` siempre queda `undefined`** en la respuesta, aunque la factura tenga familia asociada.

2. **Tipos incompatibles**: 10 call sites usan el mapper con queries de distintos shapes (algunas incluyen family, otras no; algunas incluyen payments, otras no). No existe un único tipo Prisma que los cubra a todos.

### Uso real de `family` en invoice (confirmado con el usuario)
- Factura a estudiante solo → no se necesita family
- Factura a tutor (familiar) → se muestra avatar + email del guardian responsable de billing
- Estudiantes de la factura vienen por `InvoiceLine.description`, no por `family.students`
- Pero el schema GraphQL `Family` expone students con classes → si el frontend los pide, tienen que venir

## Solución

### 1. Tipo `MappableInvoice` con relaciones opcionales (no `any`)

En `invoice-mapper.util.ts`, definir un tipo manual donde todas las relaciones sean opcionales. Como TypeScript es estructural, queries sin `family`/`student`/`payments` son compatibles (propiedades opcionales pueden omitirse):

```ts
import {
  Invoice as PrismaInvoice,
  InvoiceLine as PrismaInvoiceLine,
  Student as PrismaStudent,
  Family as PrismaFamily,
  Guardian as PrismaGuardian,
  ClassStudent as PrismaClassStudent,
  Class as PrismaClass,
  Payment as PrismaPayment,
} from "@prisma/client";

type MappableFamily = PrismaFamily & {
  students: Array<PrismaStudent & {
    classStudents: Array<PrismaClassStudent & { class: PrismaClass }>;
  }>;
  guardians: PrismaGuardian[];
};

type MappableInvoice = PrismaInvoice & {
  lines: PrismaInvoiceLine[];
  student?: PrismaStudent | null;
  family?: MappableFamily | null;
  payments?: PrismaPayment[];
};

export function mapInvoiceToEntity(invoice: MappableInvoice): Invoice { ... }
```

### 2. Actualizar las 4 queries que incluyen family

Líneas afectadas en `invoices.service.ts`: `createInvoice` (~237), `findById` (~596), `findAll` (~645), `getStudentOverview` unpaidInvoices (~714).

Cambiar:
```ts
family: { include: { students: true } }
```
A:
```ts
family: {
  include: {
    students: {
      include: { classStudents: { include: { class: true } } },
    },
    guardians: true,
  },
}
```

Esto resuelve el bug (guardians ahora llegan) y hace que el tipo del payload coincida con `MappableFamily`.

### 3. Las otras 5 call sites no requieren cambios

`addInvoiceLine`, `updateInvoiceLine`, `removeInvoiceLine`, `voidInvoice`, y `getStudentOverview` paidInvoices no incluyen `family` ni `student`. Como esas relaciones son **opcionales** en `MappableInvoice`, los payloads siguen siendo compatibles — `family` simplemente será `undefined` en la respuesta, que es el comportamiento esperado en esas operaciones.

### 4. Mantener la guarda runtime en el mapper

Aunque los tipos garantizan que `family` viene con `students` y `guardians` cuando está presente, dejar el check defensivo por si acaso:
```ts
family: invoice.family ? mapFamilyToEntity(invoice.family) : undefined,
```

## Archivos a modificar

- `src/invoices/utils/invoice-mapper.util.ts` — definir `MappableInvoice` + `MappableFamily`, tipar el parámetro
- `src/invoices/invoices.service.ts` — 4 queries con family: agregar `guardians: true` y `classStudents: { include: { class: true } }` a students

## Verificación

1. `npm run build` — sin errores de tipo en los 10 call sites
2. GraphQL query de `invoice` con `family { guardians { email avatarUrl } }` → confirmar que ahora llegan los guardians (antes venía vacío/null)
3. GraphQL query de factura individual (sin family) → confirmar que `family` es `null` como esperado
