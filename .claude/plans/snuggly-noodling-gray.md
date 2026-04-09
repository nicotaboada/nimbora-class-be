# Plan: Guardian Personal Info Edit Sheet

## Context
The guardian detail page shows a "Información Personal" card (read-only). The card component already has a Pencil icon + `onEditClick` prop built in but the page never passes it. We need to wire up a sheet (slide-up) to edit the guardian's personal info via the existing `updateGuardianPersonalInfo` backend mutation. The form fields (firstName, lastName, birthDate, gender, documentType, documentNumber) are identical to the teacher personal info sheet, so we extract a reusable `PersonalInfoFormFields` component that will also be used for students in the future.

---

## Files to Create

### 1. `web/components/common/personal-info-form-fields.tsx`
Reusable form fields component — contains the 6 shared fields.
- Accepts `control: Control<PersonalInfoFormValues>` and `watch` from react-hook-form
- Exports `PersonalInfoFormValues` interface: `{ firstName, lastName, birthDate?, gender?, documentType?, documentNumber? }`
- Renders: Nombre*, Apellido*, Fecha de nacimiento, Género, Tipo de documento, Número de documento
- Contains the DNI formatting logic (copied from `teacher-personal-info-sheet.tsx:217-252`)
- Imports: `GenderSelect`, `DocumentTypeSelect`, `DatePickerInput`, `Input`, `FormField/FormItem/FormLabel/FormControl/FormMessage`

### 2. `web/modules/families/hooks/use-update-guardian-personal-info.ts`
Mirrors `modules/teachers/hooks/use-update-teacher-personal-info.ts` exactly.
- Takes `guardianId: string`
- Calls `useMutation(UPDATE_GUARDIAN_PERSONAL_INFO, { refetchQueries: [{ query: GET_GUARDIAN, variables: { id: guardianId } }] })`
- Returns `{ updatePersonalInfo(data), loading }`

### 3. `web/modules/families/components/guardian-personal-info-sheet.tsx`
New sheet component — mirrors `teacher-personal-info-sheet.tsx` structure.
- Props: `open, onOpenChange, guardian: GuardianDetail, onSaved?`
- Uses `useUpdateGuardianPersonalInfo({ guardianId: guardian.id })`
- Uses `useForm<PersonalInfoFormValues>` with `updateGuardianPersonalInfoSchema`
- Renders `<PersonalInfoFormFields control={form.control} watch={form.watch} />` inside the Sheet
- SheetDescription: "Actualiza los datos personales del tutor"
- On success: `toast.success('Información personal actualizada')`, close sheet

---

## Files to Modify

### 4. `web/modules/families/graphql/mutations.ts`
Add new mutation document:
```graphql
mutation UpdateGuardianPersonalInfo($input: UpdateGuardianPersonalInfoInput!) {
  updateGuardianPersonalInfo(input: $input) {
    id
    firstName
    lastName
    birthDate
    gender
    documentType
    documentNumber
    relationship
  }
}
```
Export as `UPDATE_GUARDIAN_PERSONAL_INFO`.

### 5. `web/modules/families/types/index.ts`
Add:
```ts
import { PersonalInfoFormValues } from 'components/common/personal-info-form-fields'

export type UpdateGuardianPersonalInfoInput = PersonalInfoFormValues

export const updateGuardianPersonalInfoSchema = updateTeacherPersonalInfoSchema
// (same zod schema — import from shared location or duplicate)
```
Since the schema is identical to teacher's, define the zod schema in the shared `personal-info-form-fields.tsx` and import it from both teacher and guardian types files.

### 6. `web/app/(authenticated)/families/[familyId]/tutors/[tutorId]/page.tsx`
Add state and wire up:
```tsx
const [personalInfoSheetOpen, setPersonalInfoSheetOpen] = useState(false)

// In JSX:
<GuardianPersonalInfoCard
  guardian={guardian}
  onEditClick={() => setPersonalInfoSheetOpen(true)}
/>
<GuardianPersonalInfoSheet
  open={personalInfoSheetOpen}
  onOpenChange={setPersonalInfoSheetOpen}
  guardian={guardian}
/>
```

### 7. `web/modules/teachers/components/teacher-personal-info-sheet.tsx`
Refactor to use `<PersonalInfoFormFields control={form.control} watch={form.watch} />` instead of the inline field definitions. The form schema and types stay in `teacher.ts` but import the base schema from the shared component.

---

## Key Reuse Points
- `GuardianPersonalInfoCard` at `modules/families/components/guardian-personal-info-card.tsx` — already has pencil + `onEditClick` prop, just not wired
- `GET_GUARDIAN` query at `modules/families/graphql/queries.ts` — already fetches all personal info fields, used for refetchQueries
- `GenderSelect` at `components/common/gender-select.tsx`
- `DocumentTypeSelect` at `components/common/document-type-select.tsx`
- `DatePickerInput` at `components/ui/date-picker-input`
- `formatDNI` from `lib/utils/helpers`
- `GuardianRelationship` enum at `modules/families/enums/guardian-relationship.enum.ts` (not editable via this mutation — display only in card)

---

## TypeScript Strategy for Reusable Component
Define `PersonalInfoFormValues` in `personal-info-form-fields.tsx` and export it. Export `personalInfoSchema` (zod) from the same file. Both teacher and guardian types import from there to keep the types aligned:
- `UpdateTeacherPersonalInfoInput` = `PersonalInfoFormValues` (teacher.ts)
- `UpdateGuardianPersonalInfoInput` = `PersonalInfoFormValues` (families/types/index.ts)
The component accepts `Control<PersonalInfoFormValues>` — fully typed, no `any`.

---

## Verification
1. Run `npm run start:dev` in `/be` — confirm `updateGuardianPersonalInfo` mutation exists in schema
2. Open guardian detail page → verify pencil icon appears on "Información Personal" card
3. Click pencil → sheet slides up with all 6 form fields pre-filled
4. Edit and save → toast success, sheet closes, card data refreshes
5. Check TypeScript: `npm run build` in `/web` — no type errors
