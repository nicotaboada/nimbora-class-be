# Plan: Guardian Contact Info Edit Sheet

## Context
The guardian detail page shows a "Información de Contacto" card but has no edit capability. The backend `updateGuardianContactInfo` mutation already exists. We need to add a pencil icon to the card that opens a slide-up Sheet, mirroring the teacher contact info sheet pattern. The form inside the sheet should be extracted into a shared reusable component since it will also be used for students.

---

## Files to Create

### 1. `web/components/common/contact-info-form.tsx`
Shared reusable form component (used by guardian and future student sheet).

- Export `contactInfoSchema` — zod schema with: `email` (required), `phoneCountryCode?`, `phoneNumber?`, `address?`, `country?`, `state?`, `city?`, `postalCode?`
- Export `ContactInfoFormValues` type
- Export `ContactInfoForm` component:
  - Props: `form: UseFormReturn<ContactInfoFormValues>`
  - Renders all 8 fields using the same layout/components as `teacher-contact-info-sheet.tsx`:
    - Email (required indicator)
    - PhoneCountryCodeSelect + phoneNumber Input (side by side)
    - address, country (CountrySelect → resets state+city), state (StateSelect → resets city), city, postalCode

### 2. `web/modules/families/hooks/use-update-guardian-contact-info.ts`
Hook mirroring `use-update-teacher-contact-info.ts`:

- `useMutation(UPDATE_GUARDIAN_CONTACT_INFO)`
- `updateContactInfo(guardianId: string, input: ContactInfoFormValues)` — merges `guardianId` into input
- On success: `toast.success("Información de contacto actualizada")`, calls `onSuccess?.()`
- On error: `toast.error(...)`
- Returns `{ updateContactInfo, loading }`

### 3. `web/modules/families/components/guardian-contact-info-sheet.tsx`
Sheet component mirroring `teacher-contact-info-sheet.tsx`:

- Props: `open`, `onOpenChange`, `guardian: GuardianDetail`, `onSaved?: () => void`
- `useForm` with `contactInfoSchema` + `zodResolver`, `mode: 'onBlur'`
- `useEffect` resets form whenever `open` or `guardian` changes — maps flat `guardian` fields into form values
- On submit: calls `updateContactInfo(guardian.id, data)`, on success → `onSaved?.()` + close sheet
- `handleOpenChange(false)` resets form + clears errors
- Footer: spacer + Cancelar + Guardar (disabled when `!isValid || loading`)
- Uses `<ContactInfoForm form={form} />` for the fields

---

## Files to Modify

### 4. `web/modules/families/graphql/mutations.ts`
Add `UPDATE_GUARDIAN_CONTACT_INFO` mutation:

```graphql
mutation UpdateGuardianContactInfo($input: UpdateGuardianContactInfoInput!) {
  updateGuardianContactInfo(input: $input) {
    id
    email
    phoneCountryCode
    phoneNumber
    address
    country
    state
    city
    postalCode
  }
}
```

### 5. `web/app/(authenticated)/families/[familyId]/tutors/[tutorId]/page.tsx`
Wire up the sheet:

- Add `const [contactInfoSheetOpen, setContactInfoSheetOpen] = useState(false)`
- Pass `onEditClick={() => setContactInfoSheetOpen(true)}` to `<GuardianContactInfoCard>`
- Add `<GuardianContactInfoSheet open={contactInfoSheetOpen} onOpenChange={setContactInfoSheetOpen} guardian={guardian} onSaved={refetch} />`
- The `refetch` comes from `useGuardianDetail(tutorId)` (already returned by the hook)

---

## Key Reference Files
- Teacher sheet to mirror: `web/modules/teachers/components/teacher-contact-info-sheet.tsx`
- Teacher hook to mirror: `web/modules/teachers/hooks/use-update-teacher-contact-info.ts`
- Guardian detail page: `web/app/(authenticated)/families/[familyId]/tutors/[tutorId]/page.tsx`
- Guardian contact card (already has `onEditClick` prop but unwired): `web/modules/families/components/guardian-contact-info-card.tsx`
- Geo/phone components: `components/common/geo/`, `components/common/phone-input/`
- Existing families mutations: `web/modules/families/graphql/mutations.ts`

---

## Verification
1. Start dev server: `npm run start:dev` (backend) — confirm schema compiles
2. Open guardian detail page → pencil icon appears on "Información de Contacto" card
3. Click pencil → sheet slides up with all 8 fields pre-filled from guardian data
4. Edit and save → mutation fires, toast appears, sheet closes, guardian data refreshes (refetch)
5. Cancel → sheet closes with no changes
