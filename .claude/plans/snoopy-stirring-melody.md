# Plan: Family Invoice Schema Support

## Context

The academy needs to support invoicing at the family level (not just per student). A family may have multiple students, and the academy wants to generate a single invoice for the whole family (one per billing cycle, one per AFIP fiscal document). This plan covers only the **schema changes** — no business logic, no new GraphQL endpoints, no trigger changes. The UI will be built separately.

The goal is to make `Invoice` and `BillingProfile` optionally owned by a `Family` instead of (or alongside) a `Student`, without breaking any existing functionality.

---

## Changes

### 1. `prisma/schema.prisma`

**`Invoice` model** — add optional `familyId`:
```prisma
// Existing (keep as-is):
studentId     String?
student       Student?  @relation(fields: [studentId], references: [id])

// Add:
familyId      String?
family        Family?   @relation(fields: [familyId], references: [id])
```
Also add index: `@@index([familyId])`

**`BillingProfile` model** — add optional `familyId`:
```prisma
// Existing (keep as-is):
studentId     String?
student       Student?  @relation(fields: [studentId], references: [id])

// Add:
familyId      String?
family        Family?   @relation(fields: [familyId], references: [id])
```
Also add index: `@@index([familyId])`

**`Family` model** — add back-relations:
```prisma
invoices         Invoice[]
billingProfiles  BillingProfile[]
```

### 2. Migration

Run:
```bash
npm run prisma:migrate
```

Name suggestion: `add_family_id_to_invoice_and_billing_profile`

---

## Critical files

- `prisma/schema.prisma` — only file to modify
- No service, resolver, trigger, or DTO changes in this scope

---

## Constraints

- `studentId` and `familyId` are both nullable — no DB-level exclusivity constraint. The app layer will enforce that exactly one is set (future work when creating family invoices).
- No existing data is touched. All current invoices keep their `studentId`, `familyId` stays null.
- No breaking changes to existing GraphQL API.

---

## Verification

1. `npm run prisma:migrate` completes without errors
2. `npm run prisma:generate` regenerates client with new fields
3. `npm run start:dev` starts without errors
4. Existing invoice queries still work (no regressions — `familyId` is nullable, all existing rows unaffected)
5. Prisma Studio: confirm `Invoice` and `BillingProfile` tables have the new nullable columns
