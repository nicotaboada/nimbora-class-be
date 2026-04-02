# Invoice Detail Page UI Refactor

## Context

The invoice detail page currently uses a vertical single-column layout with individual action buttons. The new design introduces a **two-column layout** (left sidebar + right content area) and consolidates action buttons into dropdown menus, matching the design screenshot provided.

## Changes Overview

| # | File | Action |
|---|------|--------|
| 1 | `modules/invoices/components/invoice-detail/invoice-detail-header.tsx` | Refactor: consolidate buttons into 2 dropdown menus + trash icon |
| 2 | `modules/invoices/components/invoice-detail/invoice-sidebar.tsx` | **New**: sidebar with Resumen, Estudiante, Facturar A, Detalles de Emisión |
| 3 | `modules/invoices/components/invoice-detail/payment-history-card.tsx` | Refactor: table → card-based list + green styling |
| 4 | `modules/invoices/components/payment-status-badge.tsx` | Refactor: green styling for APPROVED status |
| 5 | `app/(authenticated)/finance/invoices/[id]/page.tsx` | Refactor: vertical stack → `grid-cols-[320px_1fr]` two-column layout |
| 6 | `modules/invoices/components/invoice-detail/index.ts` | Update barrel export |

---

## Step 1: Refactor Header (`invoice-detail-header.tsx`)

Replace 5+ individual buttons with 3 consolidated controls:

1. **"+ Agregar"** dropdown (primary `Button` with `Plus` + `ChevronDown` as `DropdownMenuTrigger`):
   - "Agregar Pago" (disabled when `isFullyPaid`)
   - "Agregar Cargo" (disabled when `hasPayments`)

2. **"Enviar"** dropdown (outline `Button` with `Send` + `ChevronDown`):
   - "Enviar por Email" → calls `onSendAfipEmail` when AFIP, placeholder otherwise
   - "Enviar por WhatsApp" → stub with `toast.info` or `wa.me` link
   - `DropdownMenuSeparator`
   - "Descargar PDF" → calls `onDownloadPDF` / `onDownloadAfipPDF`

3. **Trash icon** button — stays as-is

Uses existing `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` from `@/components/ui/dropdown-menu`.

Pattern reference: `invoices-section.tsx:132` split-button dropdown (but simpler — single unified trigger, not split).

---

## Step 2: New Sidebar Component (`invoice-sidebar.tsx`)

A single `Card` (bordered) containing 4 sections separated by dividers:

1. **Resumen** — `bg-[#FAFAFA] rounded-xl p-4` box:
   - Total Facturado / Pagado / Saldo Pendiente
   - Conditional "Saldo a favor" line (reuse logic from current `invoice-info-card.tsx:159-205`)

2. **Estudiante** — uppercase label + `StudentAvatar` + name link + email
   (reuse from `invoice-info-card.tsx:44-69`)

3. **Facturar A** — uppercase label + name + email/address/phone with icons
   (reuse from `invoice-info-card.tsx:117-152`)

4. **Detalles de Emisión** — uppercase label + issue date + due date with overdue indicator
   (reuse from `invoice-info-card.tsx:73-111`)

Props: `{ invoice: Invoice }`

---

## Step 3: Refactor Payment History (`payment-history-card.tsx`)

**Header**: Change `Total Pagado` from plain text to a green `Badge`:
```
<Badge className="bg-green-50 text-green-700 border-green-200 shadow-none font-semibold">
  Total Pagado: {formatCurrency(totalPaid)}
</Badge>
```

**Body**: Replace `Table` with a vertical list of payment items. Each item:
```
[✓ green circle]  $20,000.00                    [✓ Aprobado badge]  [⋮]
                   28/03/2026
                   📁 Transferencia Bancaria
```

- Status icon: `CheckCircle2` green for APPROVED, `Clock` amber for PENDING, `XCircle` red for REJECTED/VOID
- Amount bold, date muted, method icon + label muted
- 3-dot `DropdownMenu` for void action (same as current)

---

## Step 4: Update Payment Status Badge (`payment-status-badge.tsx`)

Change APPROVED status config to use green styling:
```ts
case PaymentStatus.APPROVED:
  return {
    label: 'Aprobado',
    className: 'bg-green-50 text-green-700 border-green-200',
    icon: <Check className="size-3 text-green-700" />,
  }
```

---

## Step 5: Refactor Page Layout (`page.tsx`)

Replace the vertical `space-y-6` with:

```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
  {/* Left Sidebar */}
  <div className="lg:sticky lg:top-4 lg:self-start">
    <InvoiceSidebar invoice={invoice} />
  </div>

  {/* Right Main Content */}
  <div className="min-w-0 space-y-6">
    {hasPendingPayments && <PendingPaymentsCard ... />}
    <PaymentHistoryCard ... />
    <InvoiceChargesTable ... />
    {notes section}
  </div>
</div>
```

Grid pattern follows `app/(authenticated)/students/[id]/page.tsx:111` which uses `grid-cols-[300px_1fr]`.

- `lg:sticky lg:top-4 lg:self-start` keeps sidebar visible while scrolling
- `self-start` prevents grid stretch
- `min-w-0` on right column prevents overflow
- Responsive: stacks vertically on mobile (`grid-cols-1`)

Import changes: add `InvoiceSidebar`, remove `InvoiceInfoCard`.

Add `onSendWhatsApp` prop to header (stub for now).

---

## Step 6: Update Barrel Export (`index.ts`)

- Add `export { InvoiceSidebar } from './invoice-sidebar'`
- Remove `export { InvoiceInfoCard } from './invoice-info-card'`

---

## Implementation Order

1. `payment-status-badge.tsx` (independent, small change)
2. `invoice-detail-header.tsx` (independent)
3. `invoice-sidebar.tsx` (new file, no deps)
4. `payment-history-card.tsx` (independent)
5. `index.ts` (update exports)
6. `page.tsx` (wire everything together)
7. Remove `invoice-info-card.tsx`

## Verification

1. Navigate to any invoice detail page in the app
2. Verify two-column layout renders correctly
3. Verify "Agregar" dropdown opens with both options, respecting disabled states
4. Verify "Enviar" dropdown shows email/whatsapp/download options
5. Verify payment history shows card-based layout with green styling for approved
6. Verify sidebar shows all 4 sections (resumen, estudiante, facturar a, detalles)
7. Verify responsive: on mobile sidebar stacks above content
8. Verify sticky sidebar behavior when scrolling on desktop
