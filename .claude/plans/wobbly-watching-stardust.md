# Plan: Bulk Invoices for Families — Phase 1 (UI + Selection)

## Context

The backend already has `familiesForBulkInvoice` GraphQL query returning paginated families with their students and pending charges. 

**This phase:** Build the selection UI only. The creation mutation will be a separate phase (it will work differently from the student bulk mutation, so a new backend mutation is needed later).

**Scope:** Route, table with expand/collapse grouped rows, family selection, charges detail sheet, and the new dropdown button.

---

## Files to Create

### 1. Next.js route page — `web/app/(authenticated)/finance/invoices/bulk-families/page.tsx`
Thin wrapper:
```tsx
'use client'
import { BulkFamiliesInvoicesPage } from '@/modules/bulk-families-invoices/components/bulk-families-invoices-page'
export default function BulkFamiliesInvoicesRoute() {
  return <BulkFamiliesInvoicesPage />
}
```

### 2. New module — `web/modules/bulk-families-invoices/`

#### `types/index.ts`
```ts
import type { PaginationMeta } from '@/types/pagination'

export interface StudentBulkInvoiceInFamily {
  studentId: string
  firstName: string
  lastName: string
  chargeCount: number
  totalAmount: number
  chargeIds: string[]
}

export interface FamilyBulkInvoicePreview {
  familyId: string
  familyName: string
  studentCount: number
  totalAmount: number
  students: StudentBulkInvoiceInFamily[]
}

export interface FamiliesForBulkInvoiceResponse {
  familiesForBulkInvoice: {
    data: FamilyBulkInvoicePreview[]
    meta: PaginationMeta
  }
}
```

#### `graphql/queries.ts`
```ts
export const FAMILIES_FOR_BULK_INVOICE = gql`
  query FamiliesForBulkInvoice($input: StudentsForBulkInvoiceInput!, $page: Int, $limit: Int) {
    familiesForBulkInvoice(input: $input, page: $page, limit: $limit) {
      data {
        familyId familyName studentCount totalAmount
        students { studentId firstName lastName chargeCount totalAmount chargeIds }
      }
      meta { total page limit totalPages hasNextPage hasPreviousPage }
    }
  }
`
```

#### `hooks/use-bulk-family-filters.ts`
Identical shape to `use-bulk-invoice-filters.ts` — `searchQuery`, `dateFilter`, `period`, `queryVariables` with `StudentsForBulkInvoiceInput` (same DTO reused in backend).

#### `hooks/use-bulk-family-selection.ts`
Manages `selectedFamilyIds: Set<string>`. Toggling a family selects/deselects it. Clears on filter change. `selectedCount` returns `totalFiltered` when `isAllSelected`, else `selectedFamilyIds.size`.

#### `components/bulk-families-invoices-page.tsx`
Mirror of `bulk-invoices-page.tsx` using the families query and selection hook.
- Breadcrumb: `Facturas → Crear Facturas en Masa (Familias)`
- Action button: disabled for now (placeholder "Crear Facturas" button, enabled only when families selected, but does nothing until mutation phase)
- Passes selection state and families data to the table

#### `components/bulk-families-invoices-table.tsx`
Key difference: grouped rows with expand/collapse.
- Header row per family: checkbox, family icon + name, student count badge, `N cargos — $X` summary, total
- Expanded child rows per student: indented, avatar initials (e.g. "AT"), `1 cargo — $X.xx ⓘ`, total
- The ⓘ button opens the charges detail sheet for that student
- Expansion state: `expandedFamilyIds: Set<string>` local to component
- "Select all" header checkbox selects all visible families
- Matches the screenshot design

#### `components/bulk-family-charges-sheet.tsx`
Reuse the same pattern as `bulk-invoice-charges-sheet.tsx` from the student module. Opens when the ⓘ info button is clicked on a student row. Fetches charges using the same `GET_CHARGES_FOR_INVOICE` query (from invoices module) with `studentId` and `period`.

---

## Files to Modify

### `web/lib/config/routes.ts`
Add:
```ts
BULK_FAMILIES_INVOICES: '/finance/invoices/bulk-families',
```

### `web/modules/invoices/components/invoices-section.tsx`
Add new `DropdownMenuItem` after "Crear Múltiples Facturas":
```tsx
<DropdownMenuItem asChild className="cursor-pointer gap-2 py-2">
  <Link href={ROUTES.BULK_FAMILIES_INVOICES} className="whitespace-nowrap">
    <Users className="size-4 text-[#737373]" />
    <span>Crear Facturas por Familia</span>
  </Link>
</DropdownMenuItem>
```
Add `Users` to lucide-react imports.

---

## Key Design Decisions

- **No mutation yet** — the "Crear Facturas" button will be visible but either disabled or a TODO placeholder. Mutation integration is Phase 2.
- **Selection by family** — checking a family row is atomic (all its students included implicitly).
- **Expand/collapse** — local state, no URL param needed.
- **Charges sheet** — reuse the existing `GET_CHARGES_FOR_INVOICE` query and sheet pattern for per-student detail.

---

## Verification

1. `/finance/invoices` dropdown → new "Crear Facturas por Familia" item visible.
2. Click → redirects to `/finance/invoices/bulk-families`.
3. Change period → families with pending charges load.
4. Expand a family row → students show with charge counts and totals.
5. Select families → counter ("N familias seleccionadas") updates.
6. Click ⓘ on a student → charges sheet opens with that student's charges for the period.
