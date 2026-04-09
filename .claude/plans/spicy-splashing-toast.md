# Plan: Edit Tutor (Editar Tutor) Feature

## Context
The "Editar" menu item in the tutor dropdown inside `FamilyTutorsSection` is rendered but has no action wired to it. The goal is to open the same "Agregar Tutor" sheet pre-filled with the selected guardian's data, and save changes via an `updateGuardian` mutation (which doesn't exist yet in backend or frontend).

---

## Scope

### Backend
1. **New DTO**: `UpdateGuardianInput` (same optional fields as `CreateGuardianInput` minus `familyId`, plus required `id`)
2. **New service method**: `FamiliesService.updateGuardian(id, input, academyId)`
3. **New resolver mutation**: `updateGuardian(updateGuardianInput) → Guardian`

### Frontend
4. **New mutation**: `UPDATE_GUARDIAN` in `mutations.ts`
5. **Modify `CreateTutorSheet`**: support an optional edit mode via `guardianId` + `defaultValues` props
6. **Wire `FamilyTutorsSection`**: state for selected guardian + open state for edit sheet

---

## Implementation Plan

### 1. Backend — `UpdateGuardianInput` DTO
**File**: `src/families/dto/update-guardian.input.ts` (new)

```ts
@InputType()
export class UpdateGuardianInput {
  @Field() id: string;                    // required
  @Field({ nullable: true }) firstName?: string;
  @Field({ nullable: true }) lastName?: string;
  @Field(() => GuardianRelationship, { nullable: true }) relationship?: GuardianRelationship;
  @Field({ nullable: true }) email?: string;
  @Field({ nullable: true }) phoneNumber?: string;
}
```

### 2. Backend — `FamiliesService.updateGuardian()`
**File**: `src/families/families.service.ts`

- `findUnique` by `id`
- `assertOwnership(guardian.academyId, academyId)`
- `prisma.familyGuardian.update({ where: { id }, data: { ...input fields (excluding id) } })`
- Map result with `mapGuardianToEntity()` (the existing mapper)
- Throw `NotFoundException` if not found

### 3. Backend — `FamiliesResolver.updateGuardian()`
**File**: `src/families/families.resolver.ts`

```ts
@Mutation(() => Guardian)
updateGuardian(
  @Args('updateGuardianInput') input: UpdateGuardianInput,
  @CurrentUser() user: User,
) {
  return this.familiesService.updateGuardian(input.id, input, user.academyId);
}
```

### 4. Frontend — `UPDATE_GUARDIAN` mutation
**File**: `web/modules/families/graphql/mutations.ts`

```graphql
mutation UpdateGuardian($input: UpdateGuardianInput!) {
  updateGuardian(updateGuardianInput: $input) {
    id firstName lastName relationship email phoneNumber
  }
}
```

### 5. Frontend — Modify `CreateTutorSheet` to support edit mode
**File**: `web/modules/families/components/create-tutor-sheet.tsx`

Add optional props:
```ts
guardianId?: string          // if provided → edit mode
defaultValues?: Partial<CreateGuardianFormValues>  // pre-fill form
```

Behavior changes when `guardianId` is provided:
- Sheet title: `"Editar Tutor"` instead of `"Agregar Tutor"`
- On submit: call `UPDATE_GUARDIAN` mutation instead of `CREATE_GUARDIAN`
- Success toast: `"Tutor actualizado exitosamente"`
- Refetch `GET_FAMILY` for the same `familyId`
- `familyId` field is hidden (always disabled in edit mode)

### 6. Frontend — Wire `FamilyTutorsSection`
**File**: `web/modules/families/components/family-tutors-section.tsx`

Add state:
```ts
const [editingGuardian, setEditingGuardian] = useState<FamilyGuardian | null>(null);
```

Wire "Editar" menu item:
```tsx
<DropdownMenuItem onClick={() => setEditingGuardian(guardian)}>
  Editar
</DropdownMenuItem>
```

Mount the sheet (reuse same `CreateTutorSheet`):
```tsx
<CreateTutorSheet
  open={!!editingGuardian}
  onOpenChange={(open) => !open && setEditingGuardian(null)}
  defaultFamilyId={family.id}
  guardianId={editingGuardian?.id}
  defaultValues={editingGuardian ? {
    firstName: editingGuardian.firstName,
    lastName: editingGuardian.lastName,
    relationship: editingGuardian.relationship,
    email: editingGuardian.email,
    phoneNumber: editingGuardian.phone,  // note: mapped as `phone` in FamilyGuardian type
    familyId: family.id,
  } : undefined}
/>
```

---

## Critical Files

| File | Action |
|---|---|
| `be/src/families/dto/update-guardian.input.ts` | Create |
| `be/src/families/families.service.ts` | Add `updateGuardian()` method |
| `be/src/families/families.resolver.ts` | Add `updateGuardian()` mutation |
| `web/modules/families/graphql/mutations.ts` | Add `UPDATE_GUARDIAN` |
| `web/modules/families/components/create-tutor-sheet.tsx` | Extend with edit mode props |
| `web/modules/families/components/family-tutors-section.tsx` | Wire "Editar" onClick + mount sheet |

---

## Verification
1. Start backend: `npm run start:dev` — check no TS errors, `schema.gql` regenerated with `updateGuardian` mutation
2. Open a family detail page → click `...` on a tutor → click `Editar`
3. Sheet should open pre-filled with the tutor's data
4. Edit a field → submit → toast "Tutor actualizado" → family data refreshes with new values
