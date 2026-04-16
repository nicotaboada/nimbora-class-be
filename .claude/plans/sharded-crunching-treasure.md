# Plan: isResponsibleForBilling en FamilyGuardian

## Context

Actualmente, cuando se crea una factura familiar (`bulk-create-family-invoices.ts`), el "FACTURAR A" se determina con una lógica implícita: el primer tutor con `emailNotifications=true` y email. Esto mezcla dos conceptos distintos (notificaciones vs facturación) y no es controlable por el admin.

La solución: agregar `isResponsibleForBilling` a `FamilyGuardian`, con auto-assign al primer tutor creado y una mutation para cambiarlo.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | Agregar campo `isResponsibleForBilling` |
| `prisma/migrations/` | Nueva migración |
| `src/families/families.service.ts` | Auto-assign en `createGuardian` + nuevo método `setFamilyBillingGuardian` |
| `src/families/families.resolver.ts` | Nueva mutation `updateGuardianBilling` |
| `src/families/entities/guardian.entity.ts` | Agregar campo al GraphQL type |
| `src/families/dto/update-guardian-billing.input.ts` | Nuevo DTO |
| `src/trigger/bulk-create-family-invoices.ts` | Usar `isResponsibleForBilling` en lugar de `emailNotifications` |

---

## Implementación paso a paso

### 1. Schema Prisma

```prisma
model FamilyGuardian {
  // ... campos existentes ...
  emailNotifications      Boolean @default(true)
  isResponsibleForBilling Boolean @default(false)  // <-- nuevo
}
```

Correr: `npm run prisma:migrate`

### 2. Auto-assign en `createGuardian` (`families.service.ts`)

Dentro del método `createGuardian`, después del `assertOwnership`, verificar si la familia ya tiene tutores. Si es el primero → `isResponsibleForBilling = true`:

```ts
async createGuardian(input: CreateGuardianInput, academyId: string) {
  let isResponsibleForBilling = false;

  if (input.familyId) {
    const family = await this.prisma.family.findUnique({
      where: { id: input.familyId },
      include: { _count: { select: { guardians: true } } },
    });
    assertOwnership(family, academyId, "Family");
    isResponsibleForBilling = family._count.guardians === 0;
  }

  const guardian = await this.prisma.familyGuardian.create({
    data: {
      ...campos existentes...,
      isResponsibleForBilling,
    },
  });

  return mapGuardianToEntity(guardian, []);
}
```

### 3. Nuevo método `updateGuardianBilling` (`families.service.ts`)

Atómico: primero pone todos en `false`, luego el seleccionado en `true`.

```ts
async updateGuardianBilling(guardianId: string, academyId: string) {
  const guardian = await this.prisma.familyGuardian.findUnique({
    where: { id: guardianId },
  });
  if (!guardian || guardian.academyId !== academyId) {
    throw new NotFoundException("Guardian not found");
  }
  if (!guardian.familyId) {
    throw new BadRequestException("Guardian does not belong to a family");
  }

  await this.prisma.$transaction([
    this.prisma.familyGuardian.updateMany({
      where: { familyId: guardian.familyId },
      data: { isResponsibleForBilling: false },
    }),
    this.prisma.familyGuardian.update({
      where: { id: guardianId },
      data: { isResponsibleForBilling: true },
    }),
  ]);

  return this.findOneGuardian(guardianId, academyId);
}
```

### 4. Nuevo DTO (`update-guardian-billing.input.ts`)

Igual que `UpdateGuardianNotificationsInput`:

```ts
@InputType()
export class UpdateGuardianBillingInput {
  @Field()
  @IsUUID()
  guardianId: string;
}
```

### 5. Nueva mutation en resolver (`families.resolver.ts`)

Seguir el mismo patrón que `updateGuardianNotifications`:

```ts
@Mutation(() => Guardian)
updateGuardianBilling(
  @Args("input") input: UpdateGuardianBillingInput,
  @CurrentUser() user: User,
) {
  return this.familiesService.updateGuardianBilling(
    input.guardianId,
    user.academyId,
  );
}
```

### 6. Agregar campo a la entity GraphQL (`guardian.entity.ts`)

```ts
@Field()
isResponsibleForBilling: boolean;
```

Asegurarse que `mapGuardianToEntity` incluya el campo.

### 7. Actualizar `bulk-create-family-invoices.ts`

Agregar `isResponsibleForBilling` al select de guardians y cambiar la lógica de selección:

```ts
// Select
guardians: {
  select: {
    firstName, lastName, email, phoneNumber, address,
    emailNotifications,
    isResponsibleForBilling,  // <-- nuevo
  }
}

// Lógica (antes)
family.guardians.find(g => g.emailNotifications && g.email) ?? family.guardians[0]

// Lógica (después)
family.guardians.find(g => g.isResponsibleForBilling) ?? family.guardians[0]
```

---

## Migration de datos para familias existentes

Archivo: `prisma/migrations/20260416073311_seed_is_responsible_for_billing/migration.sql`

Aplica `isResponsibleForBilling = true` al primer tutor con `emailNotifications=true` y email por familia.
Fallback: primer tutor por `createdAt`. Si no hay familias/tutores: no hace nada.

Aplicar con: `npx prisma migrate deploy`

## Verificación

1. Aplicar migration → verificar en DB que cada familia tiene exactamente 1 tutor con `isResponsibleForBilling = true`
2. Crear una familia → agregar primer tutor → verificar `isResponsibleForBilling = true` automático
3. Agregar segundo tutor → verificar que sigue siendo el primero el responsable
4. Llamar mutation `updateGuardianBilling` con el segundo tutor → verificar que cambia
5. Crear factura familiar bulk → verificar que `recipientName` usa el tutor con `isResponsibleForBilling = true`
