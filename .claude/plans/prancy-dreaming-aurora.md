# Plan: Frontend - Bulk Create Family Invoices Mutation

## Context
The backend `bulkCreateFamilyInvoices` mutation is fully implemented. The frontend page (`bulk-families-invoices-page.tsx`) has the UI wired (selection, filters, table) but the three button actions are all `console.log` TODOs. This plan wires up the mutation following the exact same pattern as `bulk-invoices`.

## Files to Create

### 1. `/web/modules/bulk-families-invoices/graphql/mutations.ts`
```ts
import { gql } from '@apollo/client'

export const BULK_CREATE_FAMILY_INVOICES = gql`
  mutation BulkCreateFamilyInvoices($input: BulkCreateFamilyInvoicesInput!) {
    bulkCreateFamilyInvoices(input: $input) {
      id
      status
    }
  }
`
```

### 2. `/web/modules/bulk-families-invoices/hooks/use-bulk-create-family-invoices.ts`
Mirror `use-bulk-create-invoices.ts` but adapted for families:

- **Props**: `{ selectedIds: Set<string>, families: FamilyBulkInvoicePreview[], period: Date, isAllSelected: boolean }`
- **Input mapping**: filter `families` by `selectedIds` (unless `isAllSelected`), then map each to `{ familyId, students: [{ studentId, chargeIds }] }` using `family.students`
- **dueDate**: `endOfMonth(period)` (same as existing hook)
- **Polling**: reuse `GET_BULK_OPERATION` (already re-exported in `queries.ts`) — same 10s interval pattern
- **On complete**: call `apolloClient.refetchQueries({ include: [GET_INVOICES] })`
- **Toast messages**: "Se crearon X facturas de familias correctamente" / partial / error

**Types to add in `types/index.ts`**:
```ts
export interface BulkCreateFamilyInvoicesResponse {
  bulkCreateFamilyInvoices: { id: string; status: BulkJobStatus }
}
```
Also re-export `BulkJobStatus` and `BulkOperationStatusResponse` from bulk-invoices types (or duplicate — check if already exported from bulk-families-invoices types).

## Files to Modify

### 3. `/web/modules/bulk-families-invoices/types/index.ts`
Add response types needed by the hook:
```ts
export type BulkJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface BulkOperationStatusResponse {
  bulkOperation: { id: string; status: BulkJobStatus; totalItems: number; completedItems: number; failedItems: number; skippedItems: number }
}

export interface BulkCreateFamilyInvoicesResponse {
  bulkCreateFamilyInvoices: { id: string; status: BulkJobStatus }
}
```

### 4. `/web/modules/bulk-families-invoices/components/bulk-families-invoices-page.tsx`
- Import `useBulkCreateFamilyInvoices` hook
- Instantiate: `const { createBulkFamilyInvoices, isSubmitting } = useBulkCreateFamilyInvoices({ selectedIds, families, period, isAllSelected })`
- Replace all 3 `console.log` TODOs:
  - Main button `onClick`: `createBulkFamilyInvoices(false)`
  - "Crear y Notificar" `onClick`: `createBulkFamilyInvoices(true)`
  - "Solo Crear" `onClick`: `createBulkFamilyInvoices(false)`
- Add `isSubmitting` to `disabled` conditions on both buttons

## Key Details

### Input shape for the mutation
```ts
{
  items: selectedFamilies.map(f => ({
    familyId: f.familyId,
    students: f.students.map(s => ({
      studentId: s.studentId,
      chargeIds: s.chargeIds,
    })),
  })),
  dueDate: endOfMonth(period),
  notify,
}
```

### Re-used utilities
- `GET_BULK_OPERATION` — already re-exported in `bulk-families-invoices/graphql/queries.ts`
- `GET_INVOICES` — from `@/modules/invoices/graphql/queries` (same refetch target as bulk-invoices)
- `endOfMonth` from `date-fns`

## Verification
1. Select one or more families in the table, click "Solo Crear" → mutation fires, router navigates to invoices page, loading toast appears
2. After ~10s poll, toast updates to success/partial/error based on `BulkOperation.status`
3. "Crear y Notificar" → same flow but `notify: true` (guardians get email)
4. Buttons are disabled when `selectedCount === 0` OR `isSubmitting === true`
