# Payment Processing Flow

How payments are recorded and affect invoice status and credits.

## Overview

Payment records the money received on an invoice. Can be a payment or refund.

```
Record Payment → Update Invoice Balance → Update Status → Generate Credit (if overpay)
```

## Step 1: Record Payment

```ts
addPayment({
  invoiceId: "inv1",
  type: "PAYMENT", // or "REFUND"
  amount: 45000, // centavos
  method: "BANK_TRANSFER",
  paidAt: "2026-03-31T10:30:00Z",
  reference: "TRF-12345", // bank transfer reference
  status: "APPROVED" // or "PENDING_REVIEW"
})
```

### Input Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| invoiceId | String | ✓ | Invoice to pay |
| type | PAYMENT \| REFUND | ✓ | PAYMENT=money in, REFUND=money out |
| amount | Int | ✓ | Centavos, always positive |
| method | CASH \| BANK_TRANSFER \| CARD | ✓ | Payment method |
| paidAt | DateTime | ✓ | When payment was received |
| reference | String | - | Bank reference, check digits, etc. |
| status | APPROVED \| PENDING_REVIEW | - | Default: APPROVED |

## Step 2: Create Payment Record

```ts
const payment = await Payment.create({
  invoiceId,
  type,
  amount,
  method,
  paidAt,
  reference,
  status // defaults to APPROVED
});
```

**Payment states**:
- `PENDING_REVIEW`: Proof uploaded, awaiting approval (future feature)
- `APPROVED`: Payment confirmed
- `REJECTED`: Payment rejected (kept for audit)
- `VOID`: Payment reversed (soft delete)

## Step 3: Update Invoice Totals

**Only if Payment.status = APPROVED**:

```ts
if (payment.status === 'APPROVED') {
  if (payment.type === 'PAYMENT') {
    invoice.paidAmount += payment.amount;
  } else if (payment.type === 'REFUND') {
    invoice.paidAmount -= payment.amount;
  }

  invoice.balance = invoice.total - invoice.paidAmount;
}
```

### Example

```
Invoice state before payment:
- total: 45000
- paidAmount: 0
- balance: 45000

Record payment: amount 30000

Invoice state after:
- total: 45000
- paidAmount: 30000
- balance: 15000 (remaining due)
```

## Step 4: Update Invoice Status

Auto-update Invoice.status based on balance:

```ts
if (invoice.balance === 0) {
  invoice.status = 'PAID';
} else if (invoice.balance > 0 && invoice.paidAmount > 0) {
  invoice.status = 'PARTIALLY_PAID';
} else if (invoice.balance > 0 && invoice.paidAmount === 0) {
  invoice.status = 'ISSUED'; // no change
}
```

**State progression**:
```
ISSUED (no payments)
  ↓ first payment received
PARTIALLY_PAID (0 < balance < total)
  ↓ final payment received
PAID (balance = 0)
```

## Step 5: Handle Overpayment

If `paidAmount > total`, create StudentCredit:

```ts
const overpayAmount = invoice.paidAmount - invoice.total;

if (overpayAmount > 0) {
  const credit = await StudentCredit.create({
    studentId: invoice.studentId,
    amount: overpayAmount,
    availableAmount: overpayAmount,
    status: 'AVAILABLE',
    sourcePaymentId: payment.id,
    sourceInvoiceId: invoice.id
  });
}
```

### Example

```
Invoice:
- total: 45000

Payment received: 50000

Result:
- invoice.paidAmount: 50000
- invoice.balance: -5000 (overpay)
- StudentCredit created:
  - amount: 5000
  - status: AVAILABLE
```

**Use Case**: Student can use credit on future invoices.

**Future Feature**: Partial credit use (e.g., credit 2000 out of 5000).

## Step 6: Void Payment

If payment needs to be reversed:

```ts
voidPayment({
  paymentId: "pay1",
  invoiceId: "inv1", // verification
  voidReason: "Customer disputed charge"
})
```

### Effect

1. **Set Payment.status = VOID**
   - Payment record remains (audit trail)
   - Records voidedAt timestamp

2. **Update Invoice**
   ```ts
   invoice.paidAmount -= payment.amount;
   invoice.balance = invoice.total - invoice.paidAmount;
   // Recompute status
   ```

3. **Void related StudentCredit** (if any)
   ```ts
   if (credit exists for this payment) {
     credit.status = 'VOID';
   }
   ```

### Example

```
Before void:
- paidAmount: 50000
- balance: -5000
- StudentCredit: 5000 (AVAILABLE)

After void:
- paidAmount: 0
- balance: 45000
- StudentCredit: 5000 (VOID)
```

## Payment Status Flow

```
Approval:
PENDING_REVIEW → APPROVED (or REJECTED)

Reversal:
APPROVED → VOID

REJECTED is terminal (kept for audit)
```

## Key Decisions

### Why separate Payment from Invoice?
- Invoice = billing document (immutable)
- Payment = receipt transaction (can be voided)
- Decoupling allows payment history tracking

### Why StudentCredit for overpayment?
- Creates a liability record
- Allows future credit use
- Audit trail (which payment generated credit)

### Why type = PAYMENT | REFUND?
- Both affect paidAmount
- REFUND is explicit (vs. negative amount)
- Clearer semantics for reporting

### Why only APPROVED payments count?
- PENDING_REVIEW can still be rejected
- Keeps balance accurate for unpending payments

## Multi-Tenant Safety

Always verify invoice belongs to academy:

```ts
const invoice = await Invoice.findUnique({ where: { id } });
assertOwnership(invoice.academyId, user.academyId);
// Then process payment
```

## Related

- [Invoice Generation](./invoice-generation.md) — Create invoice before payment
- [Data Flow Overview](./index.md) — High-level flows
- [Mutations: Payments](../mutations/index.md) — API endpoints
