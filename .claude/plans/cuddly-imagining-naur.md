# Plan: Mutation updateGuardianNotifications

## Context
La pantalla de Tutores/Guardianes muestra un toggle "Recibe mails" por cada tutor. Actualmente el campo `emailNotifications` existe en el modelo Prisma `FamilyGuardian` (default `true`) y se expone en `FamilyGuardianSummary`, pero no hay ninguna mutation para cambiarlo. El objetivo es implementar `updateGuardianNotifications` para que el frontend pueda cambiar ese toggle.

---

## Archivos a modificar

- [src/families/families.resolver.ts](src/families/families.resolver.ts) — agregar mutation
- [src/families/families.service.ts](src/families/families.service.ts) — agregar método de servicio
- [src/families/entities/guardian.entity.ts](src/families/entities/guardian.entity.ts) — exponer `emailNotifications`
- [src/families/utils/guardian-mapper.util.ts](src/families/utils/guardian-mapper.util.ts) — mapear `emailNotifications`

**Nuevo archivo:**
- `src/families/dto/update-guardian-notifications.input.ts` — DTO de input

---

## Implementación

### 1. DTO — `update-guardian-notifications.input.ts`
```ts
@InputType()
export class UpdateGuardianNotificationsInput {
  @Field()
  @IsUUID()
  guardianId: string;

  @Field()
  @IsBoolean()
  emailNotifications: boolean;
}
```

### 2. Entity — agregar campo a `Guardian`
Agregar en `guardian.entity.ts`:
```ts
@Field()
emailNotifications: boolean;
```

### 3. Mapper — `guardian-mapper.util.ts`
Agregar `emailNotifications: prismaGuardian.emailNotifications` en el mapper.

### 4. Service — `families.service.ts`
```ts
async updateGuardianNotifications(
  input: UpdateGuardianNotificationsInput,
  academyId: string,
): Promise<Guardian> {
  const guardian = await this.prisma.familyGuardian.findUnique({
    where: { id: input.guardianId },
  });
  assertOwnership(guardian?.academyId, academyId);

  const updated = await this.prisma.familyGuardian.update({
    where: { id: input.guardianId },
    data: { emailNotifications: input.emailNotifications },
  });
  return mapGuardianToEntity(updated);
}
```

### 5. Resolver — `families.resolver.ts`
```ts
@Mutation(() => Guardian)
updateGuardianNotifications(
  @Args("input") input: UpdateGuardianNotificationsInput,
  @CurrentUser() user: User,
) {
  return this.familiesService.updateGuardianNotifications(input, user.academyId);
}
```

---

## Verificación
1. Regenerar schema GraphQL: `npm run start:dev`
2. En GraphQL Playground ejecutar:
```graphql
mutation {
  updateGuardianNotifications(input: {
    guardianId: "uuid-del-tutor",
    emailNotifications: false
  }) {
    id
    firstName
    emailNotifications
  }
}
```
3. Verificar que el campo cambió en DB con Prisma Studio: `npm run prisma:studio`
4. Verificar que un guardianId de otra academy devuelve error de autorización.
