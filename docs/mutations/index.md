# GraphQL Mutations

Complete list of all mutations organized by module.

## Students Module

### `createStudent(createStudentInput: CreateStudentInput!): Student`
Creates a new student in the academy.
- **Auth**: Required (any role)
- **Multi-tenant**: Automatic (associated with `user.academyId`)
- **Input**: firstName, lastName, email, phoneNumber, status
- **Response**: Student object

### `updateStudent(updateStudentInput: UpdateStudentInput!): Student`
Updates an existing student.
- **Auth**: Required
- **Input**: id (required), firstName, lastName, email, phoneNumber, status
- **Multi-tenant**: Validates `academyId`

### `removeStudent(id: String!): Student`
Removes a student (hard delete or status change - check implementation).
- **Auth**: Required
- **Input**: id
- **Note**: Verify if this cascades to related Charges/Invoices

---

## Fees Module

### `createOneOffFee(input: CreateOneOffFeeInput!): Fee`
Creates a one-time fee (e.g., registration fee, exam fee).
- **Type**: ONE_OFF
- **Input**: description, cost, occurrences (optional)
- **Required**: startDate
- **Result**: Fee object

### `createMonthlyFee(input: CreateMonthlyFeeInput!): Fee`
Creates a recurring monthly fee (standard subscription).
- **Type**: MONTHLY
- **Input**: description, cost
- **Required**: startDate
- **Result**: Fee object

### `createPeriodicFee(input: CreatePeriodicFeeInput!): Fee`
Creates a fee with custom period (weekly, bi-weekly, quarterly, etc.).
- **Type**: PERIODIC
- **Input**: description, cost, period (EVERY_WEEK, TWICE_A_MONTH, EVERY_MONTH, etc.), occurrences (optional)
- **Required**: startDate
- **Result**: Fee object

### `updateOneOffFee(input: UpdateOneOffFeeInput!): Fee`
Updates a one-off fee.
- **Input**: id (required), description, cost, occurrences
- **Note**: Check if updating affects existing Charges

### `updateMonthlyFee(input: UpdateMonthlyFeeInput!): Fee`
Updates a monthly fee.
- **Input**: id (required), description, cost
- **Note**: Future Charges will use new cost

### `updatePeriodicFee(input: UpdatePeriodicFeeInput!): Fee`
Updates a periodic fee.
- **Input**: id (required), description, cost, period, occurrences
- **Note**: Check period change impact

### `deleteFee(id: String!): Fee`
Deletes/archives a fee.
- **Input**: id
- **Question**: Hard delete or soft delete? Check implementation
- **Impact**: Does this cancel pending Charges?

---

## Charges Module

### `assignFeeToStudents(input: AssignFeeInput!): AssignFeeOutput`
Assigns a fee to multiple students, generating all corresponding Charges.
- **Input**:
  - feeId (String!)
  - studentIds (String[]) — Multiple students
  - startDate (DateTime) — When charges start
- **Output**:
  - successCount: Int
  - failureCount: Int
  - errors: String[]
- **Data Flow**:
  1. For each (feeId, studentId) pair
  2. Generate Charge instances based on fee.type and fee.period
  3. Set installmentNumber globally (1, 2, 3...)
  4. Set periodMonth ("2026-03", etc.)
- **Bulk Operation**: Likely triggers a Trigger.dev task

### `unassignFeeFromStudent(input: UnassignFeeInput!): UnassignFeeOutput`
Removes a fee from a student, canceling pending charges.
- **Input**:
  - studentId (String!)
  - feeId (String!)
  - reason (String, optional)
- **Output**:
  - successCount: Int
  - canceledCharges: Int
- **Data Flow**:
  1. Find all pending Charges for (studentId, feeId)
  2. Update status to CANCELLED
  3. If any are INVOICED, handle invoice impact (TBD)

---

## Invoices Module

### `createInvoice(input: CreateInvoiceInput!): Invoice`
Creates a new invoice with initial lines.
- **Input**:
  - studentId (String, optional) — null if recipient is "OTHER"
  - recipientName (String!)
  - recipientEmail, recipientPhone, recipientAddress (optional)
  - billingProfileId (String, optional) — Link to BillingProfile
  - issueDate (DateTime!)
  - dueDate (DateTime!)
  - lines (InvoiceLineInput[]) — Initial lines
  - publicNotes, privateNotes (optional)
- **Output**: Invoice with computed totals
- **Totals Calculation**:
  - subtotal = sum(line.originalAmount)
  - totalDiscount = sum(discounts)
  - total = sum(line.finalAmount)

### `addInvoiceLine(input: AddInvoiceLineInput!): Invoice`
Adds a line to an existing invoice.
- **Input**:
  - invoiceId (String!)
  - chargeId (String, optional) — Reference existing Charge
  - type (CHARGE | MANUAL)
  - description (String!)
  - originalAmount (Int!) — In centavos
  - discountType (PERCENT | FIXED_AMOUNT, optional)
  - discountValue (Int, optional)
  - discountReason (String, optional)
- **Constraints**:
  - Each Charge can only appear ONCE per Invoice (partial unique)
  - If chargeId is provided, type must be CHARGE
- **Returns**: Updated Invoice with new totals

### `updateInvoiceLine(input: UpdateInvoiceLineInput!): Invoice`
Updates discount on an invoice line.
- **Input**:
  - lineId (String!)
  - invoiceId (String!) — For verification
  - discountType (PERCENT | FIXED_AMOUNT, optional)
  - discountValue (Int, optional)
  - discountReason (String, optional)
- **Effect**: Recalculates Invoice.total and Invoice.balance
- **Note**: Cannot update other fields; use removeInvoiceLine + addInvoiceLine

### `removeInvoiceLine(lineId: String!): Invoice`
Removes a line from invoice (soft delete via isActive = false).
- **Input**: lineId
- **Effect**:
  - Sets InvoiceLine.isActive = false
  - Recalculates Invoice totals
- **Note**: CHARGE-backed lines must have active flag set, not hard-deleted

### `voidInvoice(invoiceId: String!): Invoice`
Voids (cancels) an invoice (status = VOID).
- **Input**: invoiceId
- **Effect**:
  - Sets Invoice.status = VOID
  - All associated Charges return to PENDING (if applicable)
- **Audit**: Records void reason (implicit)

---

## Payments Module

### `addPayment(input: AddPaymentInput!): Invoice`
Records a payment received on an invoice.
- **Input**:
  - invoiceId (String!)
  - type (PAYMENT | REFUND) — Default: PAYMENT
  - amount (Int!) — In centavos (always positive)
  - method (CASH | BANK_TRANSFER | CARD)
  - paidAt (DateTime!) — When payment was received
  - reference (String, optional) — Transfer reference, check last 4 digits, etc.
  - status (PENDING_REVIEW | APPROVED) — Default: APPROVED
- **Output**: Updated Invoice
- **Data Flow**:
  1. Create Payment record
  2. Update Invoice.paidAmount += amount
  3. Update Invoice.balance = total - paidAmount
  4. If paidAmount > total, create StudentCredit for overpayment
  5. Auto-update Invoice.status:
     - If balance = 0: status = PAID
     - If balance > 0 and paidAmount > 0: status = PARTIALLY_PAID

### `voidPayment(input: VoidPaymentInput!): Invoice`
Cancels/reverses a payment (soft delete via status = VOID).
- **Input**:
  - paymentId (String!)
  - invoiceId (String!) — For verification
  - voidReason (String!) — Audit trail
- **Effect**:
  1. Sets Payment.status = VOID
  2. Updates Invoice.paidAmount (subtracts void amount)
  3. Updates Invoice.balance (recalculates)
  4. If StudentCredit was created from this Payment, mark as VOID
- **Audit**: Records voidReason and voidedAt timestamp

---

## AFIP Module

### `setupAfipSettings(input: SetupAfipSettingsInput!): AcademyAfipSettings`
**Step 1 of AFIP onboarding**: Saves fiscal data.
- **Input**:
  - cuit (String!) — CUIT without hyphens or formatted
  - taxStatus (MONOTRIBUTO | RESPONSABLE_INSCRIPTO | EXENTO | CONSUMIDOR_FINAL)
  - [Look-up CUIT first via `lookupCuit` query]
- **Process**:
  1. Validate CUIT format
  2. Look up in ARCA registry
  3. Save fiscal data (razonSocial, personeria, condicionIva, etc.)
  4. Create first sales point (defaultPtoVta)
  5. Set onboardingStep = DELEGATION_1
- **Output**: AcademyAfipSettings object

### `confirmAfipDelegationReady(): AcademyAfipSettings`
**Step 2 of AFIP onboarding**: User confirms delegation in ARCA is done.
- **Process**:
  1. Validate current step is DELEGATION_1
  2. Set onboardingStep = DELEGATION_2
- **Note**: No ARCA validation yet; just proceed to verification step
- **Output**: Updated AcademyAfipSettings

### `verifyAfipDelegation(): AcademyAfipSettings`
**Step 3 of AFIP onboarding**: Verifies delegation is active.
- **Process**:
  1. Call AFIP WSFE service to verify delegation is active
  2. If valid:
     - Set delegationStatus = OK
     - Set onboardingStep = COMPLETED
     - Set delegatedAt = now
  3. If invalid:
     - Set delegationStatus = ERROR
     - Return error message (user must retry delegation in ARCA)
- **Output**: AcademyAfipSettings

---

## Billing Profiles Module

### `createBillingProfile(input: CreateBillingProfileInput!): BillingProfile`
Creates a customer fiscal profile.
- **Input**:
  - displayName (String!)
  - docType (CONSUMIDOR_FINAL | DNI | CUIT)
  - docNumber (String, optional if CONSUMIDOR_FINAL)
  - taxCondition (CONSUMIDOR_FINAL | MONOTRIBUTO | RESPONSABLE_INSCRIPTO | EXENTO)
  - razonSocial (String, optional)
  - personeria (String, optional) — "Física" or "Jurídica"
  - email, phone, address (optional)
  - [Detailed address fields]: street, apartment, zipCode, province, city
  - studentId (String, optional) — Link to student
  - isDefault (Boolean, optional)
- **Output**: BillingProfile object

### `updateBillingProfile(input: UpdateBillingProfileInput!): BillingProfile`
Updates a billing profile.
- **Input**: id + same fields as create
- **Note**: Can be used on multiple Invoices if reused

---

## Bulk Operations Module

No direct mutations (handled via specific mutations like `assignFeeToStudents`).

---

## Feature Flags Module

### `toggleAcademyFeature(key: String!, enabled: Boolean!): AcademyFeature`
Enables/disables a feature for the academy.
- **Input**:
  - key (String!) — "AFIP", "PAYMENTS", "WHATSAPP", etc.
  - enabled (Boolean!)
- **Effect**: Updates AcademyFeature.enabled
- **Use Case**: Feature gates for AFIP integration, payment methods, notifications

---

## Summary by Module

| Module | Mutations | Key Operations |
|--------|-----------|-----------------|
| **Students** | 3 | create, update, remove |
| **Fees** | 7 | create (3 types), update (3 types), delete |
| **Charges** | 2 | assignFeeToStudents, unassignFeeFromStudent |
| **Invoices** | 5 | createInvoice, addLine, updateLine, removeLine, void |
| **Payments** | 2 | addPayment, voidPayment |
| **AFIP** | 3 | setupSettings (Step 1), confirmReady (Step 2), verifyDelegation (Step 3) |
| **Billing Profiles** | 2 | create, update |
| **Feature Flags** | 1 | toggleAcademyFeature |
| **Total** | **25** | — |

---

## Related

- [Queries](./index.md) — All read operations
- [Data Flows](../data-flows/index.md) — How mutations interact with data
- [Types](../types/index.md) — Input/Output type definitions
