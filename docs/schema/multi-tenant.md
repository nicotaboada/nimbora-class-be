# Multi-Tenant Architecture

How tenancy is enforced at the database and application level.

## Concept

**Tenant = Academy**

Each Academy is a separate customer with its own data. Users belong to one academy. Data is never shared between academies.

## Database Structure

Every model has `academyId` field:

```prisma
model Student {
  id        String   @id
  academyId String   // FK → Academy
  academy   Academy  @relation(fields: [academyId], references: [id])
  // ...
}

model Invoice {
  id        String   @id
  academyId String   // FK → Academy
  academy   Academy  @relation(fields: [academyId], references: [id])
  // ...
}

model User {
  id        String   @id
  academyId String   // FK → Academy
  academy   Academy  @relation(fields: [academyId], references: [id])
  // ...
}
```

**Directly**: Student, Invoice, Fee, Charge, Payment, etc. have direct `academyId` FK.

**Indirectly**: Through parent. E.g., InvoiceLine has `invoiceId` → Invoice.academyId.

## Application Layer

### JWT Token Contains academyId

Supabase JWT is extended with academy info:

```ts
interface CurrentUser {
  id: string; // supabaseUserId
  academyId: string; // user's academy
  role: UserRole;
}
```

### Every Query Must Filter by academyId

```ts
// ✅ CORRECT
const invoices = await Invoice.findMany({
  where: {
    academyId: user.academyId, // ← required
    studentId: "s1", // optional, additional filters
  }
});

// ❌ WRONG (data leak!)
const invoices = await Invoice.findMany({
  where: {
    studentId: "s1", // forgetting academyId filter
  }
});
```

### Verify Ownership When Reading by ID

When reading a single record by ID, always verify it belongs to the user's academy:

```ts
const invoice = await Invoice.findUnique({ where: { id } });
if (!invoice) throw new NotFoundException();

// ← This is critical!
assertOwnership(invoice.academyId, user.academyId);

return invoice;
```

**Why?** Without this check, user could guess another academy's invoice ID.

**assertOwnership function**:
```ts
export function assertOwnership(
  recordAcademyId: string,
  userAcademyId: string
): void {
  if (recordAcademyId !== userAcademyId) {
    throw new UnauthorizedException(
      'You do not have access to this resource'
    );
  }
}
```

### Auto-Set academyId on Create

When creating records, always set academyId:

```ts
// ✅ CORRECT
const student = await Student.create({
  data: {
    firstName: input.firstName,
    lastName: input.lastName,
    academyId: user.academyId, // ← auto-set
  }
});

// ❌ WRONG (allow user to specify any academy)
const student = await Student.create({
  data: {
    ...input,
    // missing academyId, user could trick it
  }
});
```

## Multi-Tenant Patterns

### Pattern 1: Direct Field Access

User directly filters/creates with their academyId:

```ts
// Resolver
async findOne(id: string, user: User) {
  return this.service.findOne(id, user.academyId);
}

// Service
async findOne(id: string, academyId: string) {
  const record = await Model.findUnique({ where: { id } });
  assertOwnership(record.academyId, academyId);
  return record;
}
```

**Used by**: Students, Invoices, Fees, Payments, etc.

### Pattern 2: Relationship via Parent

Some records access parent's academyId indirectly:

```
InvoiceLine → Invoice.academyId
Charge → Student.academyId (via Student → Academy)
```

Still must verify ownership:

```ts
async findOne(lineId: string, academyId: string) {
  const line = await InvoiceLine.findUnique({
    where: { id: lineId },
    include: { invoice: true }
  });
  assertOwnership(line.invoice.academyId, academyId);
  return line;
}
```

### Pattern 3: Pagination with Tenant Filter

When listing records:

```ts
const students = await Student.findMany({
  where: {
    academyId: user.academyId, // ← tenant filter
    status: StudentStatus.ENABLED, // optional app filter
  },
  skip: (page - 1) * limit,
  take: limit,
});
```

## Feature Flags

Feature gates are per-academy:

```prisma
model AcademyFeature {
  id        String @id
  academyId String
  key       String // "AFIP", "PAYMENTS"
  enabled   Boolean

  @@unique([academyId, key])
}
```

Check before allowing feature:

```ts
const isAfipEnabled = await AcademyFeature.findUnique({
  where: {
    academyId_key: {
      academyId: user.academyId,
      key: "AFIP"
    }
  }
});

if (!isAfipEnabled?.enabled) {
  throw new ForbiddenException('AFIP feature not enabled');
}
```

## Database Indexes

Always index academyId for performance:

```prisma
model Student {
  id        String @id
  academyId String
  // ...
  @@index([academyId]) // ← critical for queries
}

model Invoice {
  id        String @id
  academyId String
  // ...
  @@index([academyId])
  @@index([academyId, status]) // multi-field for filtering by status
}
```

## Potential Issues & Safeguards

### Issue 1: Forgot academyId Filter

```ts
// ❌ WRONG
const invoices = await Invoice.findMany({
  where: { studentId: "s1" }
});
```

**Risk**: Returns invoices from ANY academy.

**Safeguard**: Code review, linting rule to enforce.

**Fix**:
```ts
// ✅ CORRECT
const invoices = await Invoice.findMany({
  where: {
    academyId: user.academyId,
    studentId: "s1"
  }
});
```

### Issue 2: Forgot assertOwnership on Read

```ts
// ❌ WRONG
async findOne(id: string, academyId: string) {
  return await Invoice.findUnique({ where: { id } });
  // No ownership check!
}
```

**Risk**: User can read any invoice by guessing IDs.

**Safeguard**: Code review, tests for multi-tenancy.

**Fix**:
```ts
// ✅ CORRECT
async findOne(id: string, academyId: string) {
  const invoice = await Invoice.findUnique({ where: { id } });
  assertOwnership(invoice.academyId, academyId);
  return invoice;
}
```

### Issue 3: Forgot to Auto-Set academyId

```ts
// ❌ WRONG
const student = await Student.create({
  data: input // user could set academyId to another academy
});
```

**Risk**: Create records in other academies.

**Safeguard**: Always set from user context.

**Fix**:
```ts
// ✅ CORRECT
const student = await Student.create({
  data: {
    ...input,
    academyId: user.academyId
  }
});
```

## Testing Multi-Tenancy

Always test cross-tenant scenarios:

```ts
describe('Multi-tenancy', () => {
  it('should not allow reading another academy\'s invoices', async () => {
    // Create invoice in academy1
    const invoice = await createInvoice(academy1.id);

    // Try to read as user from academy2
    const user2 = { academyId: academy2.id };

    expect(() => findInvoice(invoice.id, user2))
      .toThrow(UnauthorizedException);
  });
});
```

## Audit Trail

Knowing which academy owns a record is critical for auditing:

```ts
// Can easily identify data ownership
console.log(`Invoice ${id} belongs to academy ${invoice.academyId}`);

// Can segment logs by academy
const academyInvoices = await Invoice.findMany({
  where: { academyId },
  orderBy: { createdAt: 'desc' }
});
```

## Summary

| Requirement | How We Enforce |
|-------------|---|
| Data isolation | academyId on every model + index |
| Query filtering | Always include academyId in where |
| ID-based reads | assertOwnership check |
| Creates | Auto-set from user.academyId |
| Feature gates | AcademyFeature table |
| Performance | academyId indexes on all models |
| Testing | Cross-tenant test cases |

## Related

- [Architecture: Multi-Tenant](../decisions/architectural.md#6-multi-tenant-by-academyid)
- [Schema Overview](./schema.md)
