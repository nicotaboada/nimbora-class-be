# Architectural Decisions

High-level design choices and their rationale.

## 1. Module-Based Architecture

**Decision**: Organize code by feature modules (students, invoices, fees, etc.), not layers.

**Why**:
- Modules are self-contained and reusable
- Easy to find all code related to a feature
- Reduces dependency chaos
- Clear separation of concerns
- Can be tested independently

**Structure**:
```
/src/[feature]
  ├── [feature].module.ts
  ├── [feature].resolver.ts
  ├── [feature].service.ts
  ├── /dto
  ├── /entities
  └── /utils
```

**Alternative Considered**: Layer-based (/resolvers, /services, /entities)
- Would mix unrelated code
- Makes finding feature logic harder

---

## 2. Soft Deletes Over Hard Deletes

**Decision**: Use `isActive` flags and status enums instead of hard deletion.

**Why**:
- Audit trail: Can see what was removed and when
- Reversible: Can reactivate if needed
- Compliance: Some jurisdictions require record keeping
- Data recovery: Can restore accidentally deleted records
- Reporting: Can include historical data

**Examples**:
- InvoiceLine: `isActive` flag
- Payment: `status = VOID`
- StudentCredit: `status = VOID`
- Invoice: `status = VOID`

**Trade-off**: Takes more storage, but audit trail is worth it.

---

## 3. Cache Fields with Backend Computation

**Decision**: Invoice.total, subtotal, etc. are cache fields computed in backend, never trusted from DB.

**Why**:
- Ensures consistency (no stale calculations)
- Protects against accidental DB corruption
- Easy to debug (recompute and compare)
- Meets accounting standards (computed, not user-entered)

**How**:
```ts
function calculateInvoiceTotals(invoice: Invoice) {
  const activeLines = invoice.lines.filter(l => l.isActive);
  const total = activeLines.reduce((sum, line) => sum + line.finalAmount, 0);
  // ... compute other fields
  return { subtotal, totalDiscount, total, paidAmount, balance };
}
```

**Never do this**:
```ts
// ❌ WRONG
const total = invoice.total; // Don't trust DB value
```

---

## 4. Separate Charge Model

**Decision**: Create a Charge model as instance of Fee, rather than invoicing Fees directly.

**Why**:
- **Cost snapshots**: Fee.cost can change; Charge preserves what student owed
- **Decoupling**: Fee is template; Charge is instance
- **Flexibility**: Can have multiple charges per fee per student
- **Audit trail**: Shows exactly what was charged when
- **Complex logic**: Some fees are one-off, some recurring, some periodic

**Alternative Considered**: Direct Fee → Invoice
- Would couple Fee updates to historical data
- Hard to track cost changes
- Inflexible for different fee types

---

## 5. Separate AfipInvoice Model

**Decision**: Create AfipInvoice as separate entity (1:1 with Invoice), not embed AFIP data in Invoice.

**Why**:
- **Decoupling**: Business logic (Invoice) separate from compliance (AFIP)
- **Flexibility**: Can emit to AFIP after Invoice created
- **Status tracking**: EMITTING → EMITTED → ERROR
- **Debugging**: Save request/response JSON on error
- **Optional**: AFIP can be disabled per academy

**Alternative Considered**: Embed AFIP fields in Invoice
- Would bloat Invoice model
- Every invoice needs AFIP status (even if disabled)
- Harder to test Invoice logic without AFIP

---

## 6. Multi-Tenant by academyId

**Decision**: Every model has explicit `academyId` field. Filter all queries by academyId.

**Why**:
- **Safety**: Prevents cross-tenant data leaks
- **Clarity**: Easy to audit multi-tenancy
- **Performance**: Can index by academyId
- **Simplicity**: No complex tenant resolution logic

**Rule**:
```ts
// ALWAYS filter by academyId
Invoice.findMany({
  where: {
    academyId: user.academyId, // ← required
    // ... other filters
  }
})

// ALWAYS verify ownership when reading by ID
const invoice = await Invoice.findUnique({ where: { id } });
assertOwnership(invoice.academyId, user.academyId);
```

---

## 7. Async Jobs via Trigger.dev

**Decision**: Use Trigger.dev for long-running tasks (invoice generation, AFIP emission, etc.).

**Why**:
- **Timeouts**: Tasks can run longer than HTTP requests
- **Retries**: Built-in exponential backoff
- **Monitoring**: Dashboard to track job progress
- **Scaling**: Offload from main server
- **Reliability**: Guaranteed execution (doesn't lose jobs)

**Examples**:
- Bulk invoice generation
- Bulk AFIP fiscalization
- Email sending

**Alternative Considered**: Background workers (Bull, etc.)
- Requires separate infrastructure
- More complex to manage
- Trigger.dev is SaaS (managed)

---

## 8. Enum-Based Status Fields

**Decision**: Use enums for status/categorical fields instead of strings.

**Why**:
- **Type safety**: TypeScript catches invalid values
- **Consistency**: No typos ("PENDING" vs "pending")
- **Database**: Enum in PostgreSQL is efficient
- **GraphQL**: Exported as scalar type

**Examples**:
```ts
enum StudentStatus { ENABLED, DISABLED }
enum ChargeStatus { PENDING, PAID, CANCELLED, INVOICED }
enum InvoiceStatus { ISSUED, PAID, PARTIALLY_PAID, VOID }
enum PaymentStatus { PENDING_REVIEW, APPROVED, REJECTED, VOID }
```

---

## 9. DTOs with class-validator

**Decision**: Validate all inputs with DTOs and class-validator decorators.

**Why**:
- **Automatic**: NestJS validates before resolver runs
- **Reusable**: DTOs define schema and validation rules
- **Type-safe**: TypeScript knows input shape
- **Messages**: Custom error messages

**Example**:
```ts
@InputType()
export class CreateStudentInput {
  @Field()
  @IsString()
  @MinLength(1)
  firstName: string;

  @Field()
  @IsEmail()
  email: string;
}
```

---

## 10. Prisma as ORM

**Decision**: Use Prisma instead of TypeORM or raw SQL.

**Why**:
- **Type safety**: Generated types from schema
- **Migrations**: Declarative schema with migrations
- **DX**: Simple query syntax
- **Introspection**: GraphQL schema from models
- **Prisma Studio**: Visual DB explorer

**Trade-off**: Lock-in to Prisma, but it's the best solution for this project.

---

## 11. GraphQL Over REST

**Decision**: Use Apollo GraphQL, not REST API.

**Why**:
- **Flexibility**: Client asks for exactly what it needs
- **Type safety**: Schema is source of truth
- **Single endpoint**: One URL for all operations
- **Real-time ready**: Subscriptions possible
- **Frontend codegen**: Can generate TypeScript from schema

**Alternative Considered**: REST
- Would need many endpoints
- Over-fetching (return more data than needed)
- Under-fetching (return less, need multiple requests)

---

## 12. Supabase Auth

**Decision**: Use Supabase for authentication and JWT tokens.

**Why**:
- **Managed**: Don't implement auth from scratch
- **Social login**: GitHub, Google, etc.
- **JWT**: Stateless, scalable
- **Secure**: Supabase handles secrets
- **Row-level security**: Can add RLS policies

**How**:
- User signs in via Supabase
- Gets JWT token
- Sends token in requests
- Backend verifies JWT via SupabaseAuthGuard

---

## 13. Partial Unique Constraint on InvoiceLine

**Decision**: Use partial unique constraint `[chargeId, isActive]` to enforce 1 active charge per invoice.

**Why**:
- **Prevents duplicates**: Each charge appears only once (while active)
- **Allows history**: Soft-deleted lines don't count toward uniqueness
- **SQL-level**: Enforced by database, not application code

**SQL**:
```sql
CREATE UNIQUE INDEX uniq_active_charge_invoiceline
ON "InvoiceLine" ("chargeId")
WHERE "chargeId" IS NOT NULL AND "isActive" = true;
```

---

## 14. Mapper Functions

**Decision**: Use mapper utilities to convert Prisma models → GraphQL entities.

**Why**:
- **Clean separation**: DB models ≠ API models
- **Type safety**: Explicit mapping
- **Reusable**: One mapper, multiple places
- **Audit trail**: Can see what's exposed to client

**Example**:
```ts
function mapStudentToEntity(prismaStudent: Student): StudentEntity {
  return {
    id: prismaStudent.id,
    firstName: prismaStudent.firstName,
    // Don't expose sensitive fields
  };
}
```

---

## 15. Cascade Deletes

**Decision**: Use cascade deletes for child records when parent is deleted.

**Why**:
- **Referential integrity**: No orphaned records
- **Simplicity**: One delete cascades
- **Cleanup**: No manual cleanup needed

**Examples**:
- InvoiceLine cascades when Invoice deleted
- Payment cascades when Invoice deleted
- AfipInvoice cascades when Invoice deleted

**Why not for Charges**: Charges can exist without Invoice (not yet invoiced).

---

## Key Principles

1. **Safety First**: Multi-tenant filtering, soft deletes, audit trails
2. **Auditability**: Can see who did what when
3. **Decoupling**: Separate concerns (Invoice ≠ AFIP ≠ Fee)
4. **Type Safety**: TypeScript everywhere, enums for status
5. **Simplicity**: Use frameworks/tools that do their job well

---

## Related

- [Technical Decisions](./technical.md) — Code-level decisions
- [Database Decisions](./database.md) — Schema design rationale
