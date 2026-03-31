# Fee Management Flow

How fees are created and assigned to students, generating charges.

## Overview

Fees are templates. When assigned to students, they generate Charges (instances of the fee).

```
Create Fee Template → Assign to Students → Generate Charges → Students owe money
```

## Step 1: Create Fee

Three types of fees:

### One-Off Fee (registration, exam, etc.)

```ts
createOneOffFee({
  description: "Registration fee",
  cost: 50000, // centavos ($500)
  occurrences: 1, // how many times
  startDate: "2026-03-01"
})
```

**Result**: Single charge on startDate.

### Monthly Fee (tuition)

```ts
createMonthlyFee({
  description: "Tuition",
  cost: 100000, // $1000/month
  startDate: "2026-03-01" // starts March
})
```

**Result**: Charges for March, April, May, ... indefinitely (until unassigned).

### Periodic Fee (quarterly, bi-weekly, etc.)

```ts
createPeriodicFee({
  description: "Gym membership",
  cost: 25000, // $250
  period: "EVERY_3_MONTHS", // or EVERY_WEEK, TWICE_A_MONTH, etc.
  occurrences: 4, // 4 quarters = 1 year
  startDate: "2026-03-01"
})
```

**Periods available**:
- EVERY_WEEK
- TWICE_A_MONTH
- EVERY_MONTH
- EVERY_2_MONTHS
- EVERY_3_MONTHS
- EVERY_4_MONTHS
- EVERY_5_MONTHS
- EVERY_6_MONTHS

**Result**: Charges on 3-month intervals, 4 times total.

## Step 2: Fee Record Created

```
Fee {
  id: "f1",
  description: "Tuition",
  type: "MONTHLY",
  cost: 100000,
  period: null,
  occurrences: null,
  startDate: "2026-03-01",
  academyId: "academy1"
}
```

**Fields**:
- type: ONE_OFF | MONTHLY | PERIODIC
- cost: amount in centavos
- period: null if ONE_OFF/MONTHLY, required if PERIODIC
- occurrences: null if MONTHLY (unlimited), required if ONE_OFF/PERIODIC
- startDate: when fee schedule begins

## Step 3: Assign Fee to Students

Admin decides which students get the fee:

```ts
assignFeeToStudents({
  feeId: "f1",
  studentIds: ["s1", "s2", "s3"],
  startDate: "2026-03-01"
})
```

### What Happens

For each (feeId, studentId) pair, generate Charges based on fee type:

#### ONE_OFF: 1 Charge
```
Charge {
  feeId: "f1",
  studentId: "s1",
  amount: 50000, // snapshot of Fee.cost
  periodMonth: "2026-03",
  installmentNumber: 1,
  status: "PENDING",
  issueDate: "2026-03-01",
  dueDate: "2026-03-08" (issueDate + 7 days)
}
```

#### MONTHLY: Multiple Charges (one per month)
```
Month: 2026-03 → Charge { periodMonth: "2026-03", installmentNumber: 1 }
Month: 2026-04 → Charge { periodMonth: "2026-04", installmentNumber: 2 }
Month: 2026-05 → Charge { periodMonth: "2026-05", installmentNumber: 3 }
... continues until student unassigned
```

#### PERIODIC: Multiple Charges based on period
```
Period: EVERY_3_MONTHS, occurrences: 4
→ Charge { periodMonth: "2026-03", installmentNumber: 1 }
→ Charge { periodMonth: "2026-06", installmentNumber: 2 }
→ Charge { periodMonth: "2026-09", installmentNumber: 3 }
→ Charge { periodMonth: "2026-12", installmentNumber: 4 }
```

### Key Fields

| Field | Purpose |
|-------|---------|
| installmentNumber | Global counter (1, 2, 3...) for this student's fees |
| periodMonth | "2026-03" — month this charge belongs to |
| amount | Snapshot of Fee.cost at assignment time |
| status | PENDING (not yet invoiced) |
| issueDate/dueDate | Payment deadline |

### Example

```ts
Input:
{
  feeId: "f1" (Monthly tuition, cost: 100000),
  studentIds: ["s1", "s2"],
  startDate: "2026-03-01"
}

Output for "s1":
[
  Charge { studentId: "s1", feeId: "f1", periodMonth: "2026-03", installmentNumber: 1, amount: 100000 },
  Charge { studentId: "s1", feeId: "f1", periodMonth: "2026-04", installmentNumber: 2, amount: 100000 },
  Charge { studentId: "s1", feeId: "f1", periodMonth: "2026-05", installmentNumber: 3, amount: 100000 },
  ...
]

Output for "s2":
[
  Charge { studentId: "s2", feeId: "f1", periodMonth: "2026-03", installmentNumber: 1, amount: 100000 },
  Charge { studentId: "s2", feeId: "f1", periodMonth: "2026-04", installmentNumber: 2, amount: 100000 },
  ...
]
```

## Step 4: Unassign Fee (Optional)

If student drops class or fee is discontinued:

```ts
unassignFeeFromStudent({
  studentId: "s1",
  feeId: "f1",
  reason: "Student dropped"
})
```

### Effect

1. **Find all Charges** for (studentId, feeId)
2. **Cancel PENDING charges**
   - Set status = CANCELLED
   - Student no longer owes these charges
3. **INVOICED charges**: Cannot unassign
   - Already included in Invoice
   - Would break invoice integrity
4. **PAID charges**: Cannot unassign
   - Already received payment

### Example

```
Before unassign:
- Charge { periodMonth: "2026-03", status: "PENDING" } ← will cancel
- Charge { periodMonth: "2026-04", status: "INVOICED" } ← error, cannot unassign
- Charge { periodMonth: "2026-05", status: "PAID" } ← error, cannot unassign

After unassign (only PENDING cancelled):
- Charge { periodMonth: "2026-03", status: "CANCELLED" }
- Charge { periodMonth: "2026-04", status: "INVOICED" } ← unchanged
- Charge { periodMonth: "2026-05", status: "PAID" } ← unchanged
```

## Charge Status Lifecycle

```
PENDING (waiting to be invoiced)
  ↓ included in Invoice
INVOICED (part of an Invoice, may or may not be paid)
  ↓ payment received
PAID (payment confirmed)

or anytime:
→ CANCELLED (fee unassigned or invoice voided)
```

## Cost Snapshots

**Why Charge snapshots Fee.cost**:
- Fee.cost can change over time
- Charge preserves the cost at assignment time
- Fair to students (they were promised that amount)
- Audit trail (what did student owe on date X?)

### Example

```
2026-03-01: Admin creates Fee with cost = 100000
2026-03-01: Assigns to s1 → Charge { amount: 100000 }

2026-06-01: Admin updates Fee cost to 120000
2026-06-01: Assigns to s1 → Charge { amount: 120000 }

Result: s1 owes 100000 for Mar-May, 120000 for Jun onwards
```

## installmentNumber

Global counter per student, increments across all fees:

```
Student s1 assignments:
- Fee f1 (tuition): installmentNumber 1, 2, 3, ...
- Fee f2 (gym): installmentNumber 4, 5, ...
- Fee f3 (materials): installmentNumber 6

Result: Unique installmentNumber per student
```

**Unique Constraint**: `[studentId, feeId, installmentNumber]`

Prevents duplicate charges for same fee/student/installment.

## Related

- [Invoice Generation](./invoice-generation.md) — Charges become invoice lines
- [Data Flow Overview](./index.md) — High-level flows
- [Mutations: Fees](../mutations/index.md) — Create/update fee endpoints
- [Mutations: Charges](../mutations/index.md) — Assign/unassign endpoints
