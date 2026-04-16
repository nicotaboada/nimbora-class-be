# Plan: Campo "Facturar A" en el formulario de creación de factura

## Context

When creating an invoice, the "Nombre" field is auto-filled with the selected student's name. However, for students that belong to a family, the billing recipient should be the guardian marked as `isResponsibleForBilling: true`, not the student themselves. This plan adds a readonly "Facturar A" display field that shows who will be billed, and auto-fills the "Nombre" field from that person's data.

---

## Scope: Frontend only

No backend changes are needed. The `family` query already returns guardians with `isResponsibleForBilling`, `email`, `phoneNumber`, and `address`. The `createInvoice` mutation already accepts `recipientName` as a free string.

---

## Files to Modify (all in `/web`)

1. **`modules/students/graphql/queries.ts`** — Add `familyId` to `GET_STUDENTS` query body
2. **`components/common/student-picker/student-picker.tsx`** — Add `familyId?: string | null` to `StudentPickerStudent` interface
3. **`components/common/student-picker/use-students-for-picker.ts`** — Include `familyId` in the mapped student object
4. **`modules/invoices/types/invoice.ts`** — Add `familyId?: string | null` to `StudentForInvoice` interface
5. **`modules/invoices/hooks/use-create-invoice.ts`** — Add family lookup + billing recipient resolution logic
6. **`modules/invoices/components/sheets/create-invoice-sheet/invoice-data-form.tsx`** — Add `billingRecipientLabel` prop + readonly "Facturar A" field
7. **`modules/invoices/components/sheets/create-invoice-sheet/create-invoice-sheet.tsx`** — Pass `billingRecipientLabel` to `InvoiceDataForm`

---

## Implementation Details

### 1. `GET_STUDENTS` query — add `familyId`

```graphql
data {
  id
  firstName
  lastName
  email
  phoneNumber
  familyId   # ADD THIS
  status
  ...
}
```

### 2. `StudentPickerStudent` type — add `familyId`

```ts
export interface StudentPickerStudent {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string | null
  familyId?: string | null   // ADD
}
```

### 3. `useStudentsForPicker` — map `familyId`

In the `.map()` call, add: `familyId: student.familyId ?? null`

### 4. `StudentForInvoice` type — add `familyId`

```ts
export interface StudentForInvoice {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string | null
  familyId?: string | null   // ADD
}
```

### 5. `useCreateInvoice` hook — family lookup + billing recipient

Split into three focused pieces:

**Add a lazy GET_FAMILY query** (import from `@/modules/families/graphql/queries`):
```ts
const [fetchFamily, { data: familyData }] = useLazyQuery(GET_FAMILY, {
  fetchPolicy: 'cache-and-network',
})
```

**Effect 1** — trigger family fetch when student changes and has a family:
```ts
React.useEffect(() => {
  if (selectedStudent?.familyId) {
    fetchFamily({ variables: { id: selectedStudent.familyId } })
  }
}, [selectedStudent])
```

**useMemo** — derive the billing recipient from student + family data:
```ts
const billingRecipient = React.useMemo(() => {
  if (!selectedStudent) return null
  const guardian = familyData?.family?.guardians?.find(
    (g: { isResponsibleForBilling: boolean }) => g.isResponsibleForBilling
  )
  return guardian ?? selectedStudent
}, [selectedStudent, familyData])
```
Result is always a guardian or the student — both have `firstName`, `lastName`, `email`, `phoneNumber`.

**Effect 2** — fill form when billing recipient resolves:
```ts
React.useEffect(() => {
  if (!billingRecipient || !selectedStudent) return
  setFormData((prev) => ({
    ...prev,
    studentId: selectedStudent.id,
    name: `${billingRecipient.firstName} ${billingRecipient.lastName}`,
    email: billingRecipient.email ?? '',
    phone: billingRecipient.phoneNumber ?? '',
    address: '',
  }))
}, [billingRecipient])
```

The form fills immediately with the student's name (fallback), then silently updates to the guardian's name when the family query resolves — no blocking, no spinner.

**Derive `billingRecipientLabel` from `billingRecipient`** (no extra state needed):
```ts
const billingRecipientLabel = billingRecipient
  ? `${billingRecipient.firstName} ${billingRecipient.lastName}`
  : ''
```

**Expose `billingRecipientLabel` in the return object.**

### 6. `InvoiceDataForm` — add readonly "Facturar A" field

Add `billingRecipientLabel?: string` to `InvoiceDataFormProps`.

Render a readonly field **above** the "Nombre" field when `billingRecipientLabel` is set:

```tsx
{billingRecipientLabel && (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-[#171717]">Facturar A</label>
    <Input value={billingRecipientLabel} readOnly disabled className="bg-muted cursor-default" />
  </div>
)}
```

### 7. `create-invoice-sheet.tsx` — pass `billingRecipientLabel`

Destructure `billingRecipientLabel` from `useCreateInvoice(...)` and pass it:

```tsx
<InvoiceDataForm
  defaultValues={invoiceFormValues}
  onValuesChange={handleFormValuesChange}
  billingRecipientLabel={billingRecipientLabel}
/>
```

---

## Data Flow Summary

```
Student selected
  ├── has familyId?
  │     YES → GET_FAMILY(familyId)
  │             ├── guardian with isResponsibleForBilling=true found?
  │             │     YES → billingRecipientLabel = guardian full name
  │             │           name = guardian full name
  │             │           email = guardian.email (fallback: student.email)
  │             │           phone = guardian.phoneNumber
  │             └─── NO  → fallback to student (same as no-family path)
  └── no familyId
        → billingRecipientLabel = student full name
          name = student full name
          email = student.email
          phone = student.phoneNumber
```

---

## Verification

1. Open the invoice creation sheet
2. Select a student **without** a family:
   - "Facturar A" field shows the student's name
   - "Nombre" is auto-filled with the student's name
3. Select a student **with** a family that has a billing guardian:
   - "Facturar A" shows the billing guardian's name
   - "Nombre" is auto-filled with the guardian's name
   - Email/phone are from the guardian
4. "Nombre" field remains editable (user can still override it manually)
5. Switching students resets all fields correctly
