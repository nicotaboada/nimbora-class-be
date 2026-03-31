# Invoices Module

Student billing documents and line item management.

## Entities

### Invoice
```
id, invoiceNumber (autoincrement), studentId?, recipientName, recipientEmail,
billingProfileId?, academyId, issueDate, dueDate, publicNotes, privateNotes,
status (ISSUED|PAID|PARTIALLY_PAID|VOID), subtotal, totalDiscount, total,
paidAmount, balance, createdAt, updatedAt
```

**Totals**: Computed in backend, never trusted from DB.

### InvoiceLine
```
id, invoiceId (FK), type (CHARGE|MANUAL), chargeId?, description,
originalAmount, discountType (PERCENT|FIXED_AMOUNT)?, discountValue?,
discountReason?, finalAmount, isActive
```

**Constraint**: Partial unique on (chargeId, isActive=true) — each charge appears once.

## Key Operations

### Create Invoice
- Input: studentId, recipient info, billingProfileId, dates, initial lines
- Output: Invoice with computed totals
- Side Effect: Charges linked via InvoiceLines gain status=INVOICED

### Add/Update/Remove Lines
- Each change recalculates totals
- Remove = soft delete (isActive=false)
- Update discount only (cannot change amount)

### Void Invoice
- Status = VOID
- Charges return to PENDING

## Related Data

- **Student**: Optional link (null if "OTHER" recipient)
- **BillingProfile**: Optional fiscal data snapshot
- **Charges**: Via InvoiceLine (can be CHARGE-backed or MANUAL)
- **Payments**: Payments received on invoice
- **AfipInvoice**: Fiscal emission data (1:1)

## Workflows

See:
- [Invoice Generation Flow](../data-flows/invoice-generation.md)
- [Mutations: Invoices](../mutations/index.md)
- [Queries: Invoices](../queries/index.md)

## Service Methods

- `createInvoice(input, academyId)` — Create with initial lines
- `addInvoiceLine(input, academyId)` — Add a line
- `updateInvoiceLine(input, academyId)` — Update discount
- `removeInvoiceLine(lineId, academyId)` — Soft delete line
- `voidInvoice(invoiceId, academyId)` — Cancel invoice
- `findById(id, academyId)` — Get single
- `findAll(academyId, filter)` — List with filters
- `getStudentOverview(studentId, academyId)` — Summary

## Important Notes

1. **Totals are cache**: Backend computes from lines, never trust DB
2. **Soft deletes**: InvoiceLine.isActive flag preserves history
3. **Charge uniqueness**: Each charge appears max once (partial unique)
4. **Student optional**: Can invoice "OTHER" (non-student)
5. **BillingProfile optional**: But recommended for fiscal data

## Testing

```ts
describe('Invoices', () => {
  it('should calculate totals correctly', async () => {
    const invoice = await createInvoice({
      lines: [
        { originalAmount: 100, discountValue: 10, discountType: 'PERCENT' }
      ]
    });
    expect(invoice.finalAmount).toBe(90);
    expect(invoice.total).toBe(90);
  });

  it('should prevent duplicate charges', async () => {
    const inv = await createInvoice({ lines: [{ chargeId: 'c1' }] });
    expect(() => addLine(inv.id, { chargeId: 'c1' }))
      .toThrow('Charge already in invoice');
  });

  it('should recalculate on line removal', async () => {
    const inv = await createInvoice({
      lines: [
        { originalAmount: 100 },
        { originalAmount: 100 }
      ]
    });
    expect(inv.total).toBe(200);

    await removeLine(inv.lines[0].id);
    const updated = await findById(inv.id);
    expect(updated.total).toBe(100);
  });
});
```
