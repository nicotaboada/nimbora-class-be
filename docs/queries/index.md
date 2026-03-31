# GraphQL Queries

Complete list of all read operations organized by module.

## Students Module

### `student(id: String!): Student`
Get a single student by ID.
- **Auth**: Required
- **Multi-tenant**: Verified

### `students(page: Int, limit: Int, search: String, status: StudentStatus): PaginatedStudents`
List students with pagination, search, and status filter.
- **Pagination**: page (default 1), limit (default 10)
- **Search**: Optional search by firstName/lastName/email
- **Status**: Filter by ENABLED or DISABLED

### `studentStats(): StudentStats`
Get aggregate stats for all students in academy.
- **Returns**: totalStudents, activeStudents, disabledStudents, etc.

---

## Fees Module

### `fee(id: String!): Fee`
Get a single fee template.

### `fees(page: Int, limit: Int): PaginatedFees`
List all fees with pagination.

---

## Charges Module

### `studentIdsWithFee(feeId: String!): [String]`
Get IDs of students who already have a fee assigned.
- **Purpose**: Avoid assigning same fee twice

### `chargesByStudent(studentId: String!): [Charge]`
Get all charges for a student, grouped by fee.

### `chargesForInvoice(input: ChargesForInvoiceInput!): ChargesForInvoiceOutput`
Get charges available to invoice for a student.
- **Input**: studentId, periodMonth (optional), includeOverdue (optional)
- **Output**: List of charges + total

### `studentFeeOverviews(studentId: String!, filter: StudentFeeOverviewFilter): [StudentFeeOverview]`
Get charges grouped by fee with billing status.
- **Purpose**: "Show me all fees for this student and their status"
- **Output**: Per fee: pending charges count, invoiced count, paid count, etc.

### `studentChargesOverview(studentId: String!): StudentChargesOverview`
Get financial summary for student: totals + latest charges.
- **Purpose**: Dashboard card "total owed", "recent charges"

### `studentFeeDetail(studentId: String!, feeId: String!): StudentFeeDetail`
Get installment detail for a fee/student (slideout).
- **Purpose**: Show all installments with amounts and due dates

---

## Invoices Module

### `invoice(id: String!): Invoice`
Get a single invoice.
- **Returns**: Full invoice with lines, payments, totals

### `invoices(filter: InvoicesFilterInput, page: Int, limit: Int): PaginatedInvoices`
List invoices with optional filters.
- **Filters**: studentId, status (ISSUED, PAID, etc.), dateRange, etc.

### `studentInvoiceOverview(studentId: String!): StudentInvoiceOverview`
Get financial summary for student.
- **Returns**:
  - totalIssued, totalPaid, totalPending
  - unpaidInvoices[], paidInvoices[]
  - lastInvoice, nextDueDate

---

## Payments Module

### `payment(id: String!): Payment`
Get a single payment record.

### `paymentsByInvoice(invoiceId: String!): [Payment]`
Get all payments for an invoice.
- **Purpose**: Show payment history on invoice detail

---

## Billing Profiles Module

### `billingProfile(id: String!): BillingProfile`
Get a single billing profile.

### `billingProfiles(studentId: String, isDefault: Boolean): [BillingProfile]`
List billing profiles with optional filters.
- **Filters**: Link to student, or show default for academy

---

## AFIP Module

### `lookupCuit(cuit: String!): TaxpayerInfo`
Look up taxpayer data in ARCA registry by CUIT.
- **Auth**: Not required (part of onboarding)
- **Purpose**: Validate CUIT before setup
- **Returns**: razonSocial, personeria, condicionIva, etc.

### `afipSettings(): AcademyAfipSettings`
Get AFIP configuration for academy.
- **Returns**: fiscal data, onboardingStep, delegationStatus, salesPoints[]

---

## Feature Flags Module

### `academyFeatures(): [AcademyFeature]`
List all feature flags for academy with enabled status.

---

## Summary Table

| Module | Queries |
|--------|---------|
| Students | 3 (student, students, studentStats) |
| Fees | 2 (fee, fees) |
| Charges | 6 (studentIdsWithFee, chargesByStudent, chargesForInvoice, studentFeeOverviews, studentChargesOverview, studentFeeDetail) |
| Invoices | 3 (invoice, invoices, studentInvoiceOverview) |
| Payments | 2 (payment, paymentsByInvoice) |
| Billing Profiles | 2 (billingProfile, billingProfiles) |
| AFIP | 2 (lookupCuit, afipSettings) |
| Feature Flags | 1 (academyFeatures) |
| **Total** | **21** |

---

## Query Patterns

### Pagination
```ts
{
  invoices(page: 1, limit: 10) {
    items {
      id
      invoiceNumber
      total
    }
    total
    page
    limit
  }
}
```

### Filtering
```ts
{
  invoices(
    filter: {
      status: PAID,
      studentId: "s1",
      startDate: "2026-03-01"
    }
  ) {
    items { ... }
  }
}
```

### Nested Data
```ts
{
  invoice(id: "inv1") {
    id
    lines {
      id
      description
      amount
    }
    payments {
      id
      amount
      method
    }
  }
}
```

---

## Related

- [Mutations](../mutations/index.md) — Write operations
- [Data Flows](../data-flows/index.md) — How queries interact with data
