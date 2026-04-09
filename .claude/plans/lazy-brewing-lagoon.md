# Plan: Crear Tutor — Backend mutation + FamilyPicker + CreateTutorSheet

## Context
El usuario quiere implementar la funcionalidad completa para crear tutores (guardians). Esto implica:
1. Un nuevo mutation `createGuardian` en el backend
2. Un componente `FamilyPicker` reutilizable (igual patrón que StudentPicker/TeacherPicker)
3. Un sheet `CreateTutorSheet` que usa el FamilyPicker (familia opcional; si viene de dentro de una familia, viene preseleccionada)

---

## Backend

### Archivos a crear

**`be/src/families/dto/create-guardian.input.ts`**
```ts
@InputType()
export class CreateGuardianInput {
  @Field() firstName: string          // required
  @Field() lastName: string           // required
  @Field({ nullable: true }) email?: string
  @Field({ nullable: true }) phoneNumber?: string
  @Field({ nullable: true }) familyId?: string  // optional
}
```

**`be/src/families/entities/guardian.entity.ts`**
```ts
@ObjectType()
export class Guardian {
  @Field() id: string
  @Field() firstName: string
  @Field() lastName: string
  @Field({ nullable: true }) email?: string
  @Field({ nullable: true }) phoneNumber?: string
  @Field({ nullable: true }) familyId?: string
  @Field() academyId: string
  @Field() createdAt: Date
}
```

**`be/src/families/utils/guardian-mapper.util.ts`**
- Mapea `FamilyGuardian` de Prisma → `Guardian` entity

### Archivos a modificar

**`be/src/families/families.service.ts`** — agregar:
```ts
async createGuardian(input: CreateGuardianInput, academyId: string): Promise<Guardian> {
  // Si familyId viene, verificar ownership
  // prisma.familyGuardian.create({ data: { ...input, academyId } })
  // return mapGuardianToEntity(guardian)
}
```

**`be/src/families/families.resolver.ts`** — agregar:
```ts
@Mutation(() => Guardian)
createGuardian(
  @Args('createGuardianInput') input: CreateGuardianInput,
  @CurrentUser() user: User,
) {
  return this.familiesService.createGuardian(input, user.academyId);
}
```

---

## Frontend

### 1. FamilyPicker — nuevo componente reutilizable

**`web/components/common/family-picker/family-picker.tsx`**
- Misma estructura exacta que `StudentPicker` / `TeacherPicker`
- Props: `{ value: FamilyPickerFamily | null, onChange, families, loading?, onSearchChange? }`
- `FamilyPickerFamily`: `{ id, name }`
- Trigger: nombre de la familia seleccionada o placeholder "Seleccionar familia"
- Lista: muestra nombre de la familia, checkmark al seleccionado

**`web/components/common/family-picker/use-families-for-picker.ts`**
- Igual que `useStudentsForPicker` / `useTeachersForPicker`
- Usa `GET_FAMILIES` con debounced search (300ms), limit 30
- Retorna `{ families, loading, setSearch }`

### 2. CreateTutorSheet

**`web/modules/families/components/create-tutor-sheet.tsx`**

Props:
```ts
interface CreateTutorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTutorCreated?: () => void
  defaultFamilyId?: string   // cuando viene de dentro de una familia
}
```

Campos del formulario (zod schema):
- `firstName` string required
- `lastName` string required
- `email` string email optional
- `phoneNumber` string optional
- `familyId` string optional

Comportamiento:
- Si `defaultFamilyId` viene como prop → pre-poblar el campo `familyId` en el form y **no mostrar el FamilyPicker** (la familia ya está seleccionada)
- Si no viene `defaultFamilyId` → mostrar el `FamilyPicker` para que el usuario elija

Mutation: `CREATE_GUARDIAN` (nuevo en mutations.ts)

### 3. GraphQL — web mutations

**`web/modules/families/graphql/mutations.ts`** — agregar:
```graphql
mutation CreateGuardian($input: CreateGuardianInput!) {
  createGuardian(createGuardianInput: $input) {
    id
    firstName
    lastName
    email
    phoneNumber
    familyId
    createdAt
  }
}
```

---

## Archivos críticos de referencia

- `web/components/common/student-picker/student-picker.tsx` — patrón exact a replicar
- `web/components/common/student-picker/use-students-for-picker.ts` — patrón hook
- `web/modules/families/components/create-family-sheet.tsx` — patrón sheet
- `be/src/families/families.service.ts` — agregar método
- `be/src/families/families.resolver.ts` — agregar mutation
- `be/prisma/schema.prisma` — modelo `FamilyGuardian` (ya existe)

---

## Verificación

1. `npm run start:dev` en backend — verificar que el schema GraphQL incluye `createGuardian`
2. Desde GraphQL playground: llamar `createGuardian` con y sin `familyId`
3. En frontend: abrir el sheet desde la tabla de tutores (sin familia preseleccionada) y desde el detalle de una familia (con `defaultFamilyId`)
4. Verificar que el FamilyPicker busca familias en tiempo real con debounce
