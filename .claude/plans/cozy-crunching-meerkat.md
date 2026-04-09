# Plan: Add `relationship` field to Crear Tutor sheet

## Context
The "Crear Tutor" form is missing the required `relationship` field (tipo de vínculo). The backend already defines a `GuardianRelationship` enum with 8 values and marks `relationship` as required in `CreateGuardianInput`. The frontend never wired it up — it's absent from the Zod schema, the form UI, and the GraphQL mutation variables.

## Files to modify (all in `/web`)

1. **`modules/families/types/index.ts`** — Add `relationship` to `createGuardianSchema` as required enum string
2. **`modules/families/graphql/mutations.ts`** — Add `relationship` to `CREATE_GUARDIAN` mutation input
3. **`modules/families/components/create-tutor-sheet.tsx`** — Add `<Select>` field + wire form state + pass to mutation

---

## Step-by-step changes

### 1. `modules/families/types/index.ts`

Add `relationship` as a required field in `createGuardianSchema`:

```ts
const GuardianRelationship = z.enum([
  'PADRE', 'MADRE', 'ABUELO', 'ABUELA', 'TIO', 'TIA', 'TUTOR', 'OTRO'
])

export const createGuardianSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  relationship: GuardianRelationship,          // NEW — required
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
  familyId: z.string().min(1, "La familia es requerida"),  // UPDATED — required
})
```

---

### 2. `modules/families/graphql/mutations.ts`

Add `relationship` to the input variables of `CREATE_GUARDIAN`. No change needed in the returned fields.

```graphql
mutation CreateGuardian($input: CreateGuardianInput!) {
  createGuardian(createGuardianInput: $input) {
    id
    firstName
    lastName
    relationship   # ← ADD
    email
    phoneNumber
    familyId
    createdAt
  }
}
```

---

### 3. `modules/families/components/create-tutor-sheet.tsx`

**Imports**: Add `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `components/ui/select`.

**Default values & reset**: Add `relationship: '' as GuardianRelationship` (or leave empty and let Zod validation enforce required).

**New FormField** — place after `lastName`, before `email`:

```tsx
<FormField
  control={form.control}
  name="relationship"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Relación</FormLabel>
      <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={loading}>
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar relación" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="PADRE">Padre</SelectItem>
          <SelectItem value="MADRE">Madre</SelectItem>
          <SelectItem value="ABUELO">Abuelo</SelectItem>
          <SelectItem value="ABUELA">Abuela</SelectItem>
          <SelectItem value="TIO">Tío</SelectItem>
          <SelectItem value="TIA">Tía</SelectItem>
          <SelectItem value="TUTOR">Tutor</SelectItem>
          <SelectItem value="OTRO">Otro</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

**`handleSubmit`**: Pass `relationship: data.relationship` y `familyId: data.familyId` (remover `|| undefined`, ahora es requerido) en el `input` object.

**`handleOpenChange` reset**: Add `relationship: '' as any` y `familyId: defaultFamilyId || ''` al objeto de reset (sin cambios en familyId, ya era así).

---

## Verification

1. Run `npm run dev` in `/web`
2. Open the Crear Tutor sheet
3. Try to submit without selecting a relación → should block with validation error
4. Select a value, fill required fields, submit → mutation fires with `relationship` in variables
5. Verify created guardian appears with correct relationship in the family detail view
