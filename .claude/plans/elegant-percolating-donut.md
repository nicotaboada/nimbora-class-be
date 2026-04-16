# Plan: Bulk Create Family Invoices

## Context
The bulk invoice mutation currently only supports individual students. The UI already has a `familiesForBulkInvoice` query and a family selection screen. We need to close the loop with a mutation that creates **one invoice per family**, where all students' charges become lines on that single invoice. The `Invoice` model needs a `familyId` field to support this. Billing profiles are out of scope for now (internal invoices only).

---

## Changes Required

### 1. Prisma Schema (`/prisma/schema.prisma`)

**Add to `Invoice` model:**
```prisma
familyId   String?
family     Family?  @relation(fields: [familyId], references: [id])
@@index([familyId])
```

**Add to `Family` model:**
```prisma
invoices   Invoice[]
```

**Add to `BulkOperationType` enum:**
```prisma
BULK_FAMILY_INVOICE
```

Run: `npm run prisma:migrate` (name: `add-family-invoice`)

---

### 2. New Files

#### `/src/bulk-operations/dto/bulk-create-family-invoices.input.ts`
```ts
@InputType() FamilyInvoiceStudentItemInput   { studentId: UUID, chargeIds: UUID[] (min 1) }
@InputType() BulkFamilyInvoiceItemInput      { familyId: UUID, students: FamilyInvoiceStudentItemInput[] (min 1) }
@InputType() BulkCreateFamilyInvoicesInput   { items: BulkFamilyInvoiceItemInput[] (min 1), dueDate: Date, notify: boolean = false }
```

#### `/src/bulk-operations/entities/bulk-family-operation-result.entity.ts`
```ts
@ObjectType() BulkFamilyOperationResult {
  familyId, familyName, status: "created"|"skipped"|"failed",
  invoiceId?, studentCount?, totalLines?, error?
}
```

#### `/src/trigger/bulk-create-family-invoices.ts`
New Trigger.dev task (mirrors `bulk-create-invoices.ts` structure):
- Task ID: `"bulk-create-family-invoices"`, `retry: { maxAttempts: 1 }`
- Payload: `{ operationId, items[], dueDate, academyId, notify }`
- Per family: fetch family + guardians, fetch all charges across all listed students, build invoice lines, create invoice in a `$transaction` (invoice create + charges updateMany to INVOICED)
- Invoice line description format: `"{fee.description} — Cuota {periodMonth} ({firstName} {lastName})"`
- `recipientName`: primary guardian name (first guardian with emailNotifications, else first guardian, else family name)
- `recipientEmail/Phone/Address`: from that same guardian (nullable)
- `billingProfileId`: null (MVP — internal invoices only)
- If `notify`: send PDF to all guardians with `emailNotifications: true` and an email
- Track progress same way as student task (completedItems, failedItems, skippedItems, results after each item)

---

### 3. Modified Files

#### `/src/bulk-operations/enums/bulk-operation-type.enum.ts`
Add: `BULK_FAMILY_INVOICE = "BULK_FAMILY_INVOICE"`

#### `/src/bulk-operations/entities/bulk-operation.entity.ts`
Add field: `familyResults?: BulkFamilyOperationResult[]` (used when `type === BULK_FAMILY_INVOICE`)

#### `/src/bulk-operations/bulk-operations.service.ts`
Add method: `bulkCreateFamilyInvoices(input, academyId)`
1. `validateFamiliesOwnership(familyIds, academyId)` — all families belong to academy, no duplicates
2. `validateStudentFamilyMembership(items, academyId)` — each studentId actually belongs to the given familyId + academyId
3. Flatten items → call existing `validateChargesAvailability` (checks PENDING status + student ownership)
4. Create `BulkOperation` with type `BULK_FAMILY_INVOICE`, `totalItems = items.length`
5. `tasks.trigger("bulk-create-family-invoices", payload)`
6. Update operation with `triggerRunId`, return mapped entity

Update `mapToEntity` to populate `familyResults` when `type === BULK_FAMILY_INVOICE`.

#### `/src/bulk-operations/bulk-operations.resolver.ts`
Add mutation:
```ts
@Mutation(() => BulkOperation)
bulkCreateFamilyInvoices(@Args("input") input: BulkCreateFamilyInvoicesInput, @CurrentUser() user: User)
```

---

## Implementation Order
1. `prisma/schema.prisma` → migrate
2. `enums/bulk-operation-type.enum.ts`
3. `dto/bulk-create-family-invoices.input.ts`
4. `entities/bulk-family-operation-result.entity.ts`
5. `entities/bulk-operation.entity.ts` (add familyResults field)
6. `bulk-operations.service.ts` (add method + validators + update mapToEntity)
7. `trigger/bulk-create-family-invoices.ts`
8. `bulk-operations.resolver.ts` (add mutation)

---

## Verification
1. `npm run start:dev` — server starts without TypeScript errors
2. GraphQL Playground: call `bulkCreateFamilyInvoices` with a valid family + charge IDs
3. Poll `bulkOperation(id)` until `status: COMPLETED`
4. Verify in Prisma Studio: Invoice created with `familyId` set, `studentId: null`, correct lines, charges moved to `INVOICED`
5. Verify `BulkOperation.familyResults` contains one entry per family with `status: "created"`
