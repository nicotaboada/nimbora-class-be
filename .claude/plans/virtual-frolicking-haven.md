# Plan: Resolver Recipient del Guardian en bulk-create-invoices

## Context

Cuando se crea una factura individual a un alumno que tiene familia asignada, el recipient
debería ser el guardian responsable de facturación (`isResponsibleForBilling=true`), no el alumno.

**Para `createInvoice` (individual via GraphQL):** el frontend resuelve el recipient antes de
enviar la mutation. Si el alumno tiene familia, el frontend autocompleta con el guardian responsable.
No hay cambio de backend necesario.

**Para `bulk-create-invoices.ts`:** el backend resuelve el recipient solo (no hay frontend).
Hoy siempre usa `student.firstName + lastName`. Hay que agregar lógica para usar el guardian
si el alumno tiene familia.

---

## Regla

```
Alumno CON familia  → recipient = guardian con isResponsibleForBilling=true (o primer guardian)
Alumno SIN familia  → recipient = el alumno (comportamiento actual)
```

---

## Archivo a modificar

`src/trigger/bulk-create-invoices.ts` — función `processStudentInvoice`

---

## Cambio

```typescript
// ANTES: solo busca datos del alumno
const student = await prisma.student.findUnique({
  where: { id: studentId },
  select: { firstName: true, lastName: true, email: true, phoneNumber: true },
});

const recipientName  = `${student.firstName} ${student.lastName}`;
const recipientEmail = student.email;
const recipientPhone = student.phoneNumber;

// DESPUÉS: incluir familia y guardian responsable
const student = await prisma.student.findUnique({
  where: { id: studentId },
  select: {
    firstName: true,
    lastName: true,
    email: true,
    phoneNumber: true,
    family: {
      select: {
        guardians: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            address: true,
            isResponsibleForBilling: true,
          },
        },
      },
    },
  },
});

// Resolver recipient: guardian responsable o el alumno
const guardian = student.family?.guardians.find((g) => g.isResponsibleForBilling)
              ?? student.family?.guardians[0]
              ?? null;

const recipientName    = guardian
  ? `${guardian.firstName} ${guardian.lastName}`
  : `${student.firstName} ${student.lastName}`;
const recipientEmail   = guardian?.email       ?? student.email;
const recipientPhone   = guardian?.phoneNumber ?? student.phoneNumber;
const recipientAddress = guardian?.address     ?? null;
```

---

## Casos cubiertos

| Caso | Recipient |
|---|---|
| Alumno sin familia | Datos del alumno |
| Alumno con familia + guardian marcado como responsable | Datos del guardian |
| Alumno con familia + ningún guardian marcado | Primer guardian de la familia |

---

## Verificación

1. Correr bulk create invoices con alumno sin familia → `recipientName` = alumno ✓
2. Correr bulk create invoices con alumno con guardian responsable → `recipientName` = guardian ✓
3. Correr bulk create invoices con alumno en familia sin guardian marcado → `recipientName` = primer guardian ✓
