# Technical Decisions

Code-level implementation choices and rationale.

## 1. Mapper Functions Over Direct Exposure

**Decision**: Convert Prisma models to GraphQL entities via mapper functions.

**Why**:
- **Security**: Don't expose sensitive fields to API
- **Flexibility**: Change DB schema without breaking API
- **Clarity**: Explicit mapping shows intent

**Example**:
```ts
// mappers/student-mapper.ts
export function mapStudentToEntity(prisma: Student): StudentEntity {
  return {
    id: prisma.id,
    firstName: prisma.firstName,
    lastName: prisma.lastName,
    email: prisma.email,
    status: prisma.status,
    // Don't expose: internalNotes, suspectFlags, etc.
  };
}
```

---

## 2. Separate DTOs for Create/Update

**Decision**: Use different DTOs for create vs. update.

**Why**:
- **create**: Requires firstName, lastName, email
- **update**: Only allows updating firstName, lastName (not email, immutable)
- **Type safety**: DTO defines exactly what's allowed

**Example**:
```ts
@InputType()
export class CreateStudentInput {
  @Field()
  @IsString()
  firstName: string;

  @Field()
  @IsEmail()
  email: string; // Required
}

@InputType()
export class UpdateStudentInput {
  @Field()
  @IsString()
  id: string; // Required

  @Field({ nullable: true })
  @IsString()
  firstName?: string; // Optional

  // No email field (immutable)
}
```

---

## 3. isActive Flag Over Hard Delete

**Decision**: Use `isActive: Boolean` for soft deletes instead of deleting records.

**Why**:
- **Audit**: Can see what was deleted and when
- **Reversible**: Can "undelete" if needed
- **Queries**: Filter with `where: { isActive: true }`
- **History**: Keep complete record

**Example** (InvoiceLine):
```ts
// Remove line
await InvoiceLine.update({
  where: { id: lineId },
  data: { isActive: false }
});

// List only active lines
const activeLines = await InvoiceLine.findMany({
  where: {
    invoiceId,
    isActive: true
  }
});
```

---

## 4. Enums in Database

**Decision**: Use PostgreSQL enums for status fields.

**Why**:
- **Type safety**: Database enforces valid values
- **Efficiency**: Storage-efficient
- **GraphQL**: Exported as scalar type
- **Consistency**: No typos ("PENDING" vs "pending")

**Prisma**:
```prisma
enum ChargeStatus {
  PENDING
  PAID
  CANCELLED
  INVOICED
}

model Charge {
  status ChargeStatus @default(PENDING)
}
```

**GraphQL**:
```ts
@registerEnumType(ChargeStatus, {
  name: 'ChargeStatus'
})
enum ChargeStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  INVOICED = 'INVOICED',
}
```

---

## 5. Partial Unique Indexes

**Decision**: Use partial unique constraints for conditional uniqueness.

**Why**:
- **Enforce constraints**: InvoiceLine can have only 1 active per Charge
- **Allow history**: Soft-deleted lines don't count
- **Database-level**: Enforced by Postgres, not app code

**SQL**:
```sql
CREATE UNIQUE INDEX uniq_active_charge_invoiceline
ON "InvoiceLine" ("chargeId")
WHERE "chargeId" IS NOT NULL AND "isActive" = true;
```

**Result**: Each Charge appears max once per Invoice (while active).

---

## 6. Service vs. Resolver Responsibilities

**Decision**: Service handles business logic, Resolver handles HTTP/GraphQL.

**Why**:
- **Testable**: Service logic can be unit tested without GraphQL
- **Reusable**: Service can be called from multiple sources (resolvers, tasks, etc.)
- **Separation**: Resolver extracts args, Service implements logic

**Example**:
```ts
// ← Resolver (HTTP/GraphQL concerns)
@Resolver()
export class StudentsResolver {
  @Mutation(() => Student)
  createStudent(
    @Args('input') input: CreateStudentInput,
    @CurrentUser() user: User
  ) {
    return this.service.create(input, user.academyId); // ← delegate to service
  }
}

// ← Service (Business logic)
@Injectable()
export class StudentsService {
  async create(input: CreateStudentInput, academyId: string) {
    // Validate, compute, save
    return await this.prisma.student.create({
      data: { ...input, academyId }
    });
  }
}
```

---

## 7. Prisma Relations Over Manual JOINs

**Decision**: Use Prisma relations and `include`/`select` rather than manual joins.

**Why**:
- **Type safety**: TypeScript knows related objects
- **Automatic**: Prisma handles the SQL
- **Efficient**: Can request only needed fields via `select`

**Example**:
```ts
// ✅ GOOD (Prisma handles join)
const invoice = await Invoice.findUnique({
  where: { id },
  include: {
    lines: { where: { isActive: true } },
    payments: { where: { status: 'APPROVED' } }
  }
});

// ❌ AVOID (manual query)
const invoice = await raw(`
  SELECT i.*, il.*, p.*
  FROM Invoice i
  LEFT JOIN InvoiceLine il ON ...
  LEFT JOIN Payment p ON ...
`);
```

---

## 8. Zod for Runtime Validation

**Decision**: Use Zod schemas for runtime validation of untrusted data.

**Why**:
- **Type guard**: At runtime, check data matches schema
- **Messages**: Custom error messages
- **Parsing**: Can transform data during validation

**Example**:
```ts
const periodMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM');

const schema = z.object({
  studentId: z.string().uuid(),
  periodMonth: periodMonthSchema,
  includeOverdue: z.boolean().optional().default(false)
});

const validated = schema.parse(input);
```

---

## 9. Try-Catch for Prisma Errors

**Decision**: Catch Prisma errors and convert to GraphQL errors.

**Why**:
- **Graceful**: Don't expose raw DB errors
- **User-friendly**: Map to meaningful messages
- **Type-safe**: Prisma has known error codes

**Example**:
```ts
try {
  return await this.prisma.student.create({
    data: { ...input, academyId }
  });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new BadRequestException('Email already in use');
    }
  }
  throw error;
}
```

---

## 10. Indexes on Frequently Filtered Fields

**Decision**: Always index fields used in WHERE clauses.

**Why**:
- **Performance**: Queries are fast even with millions of rows
- **Scaling**: Without indexes, queries degrade

**Critical indexes**:
```prisma
model Invoice {
  id String @id
  academyId String @index        // ← Always filter by academyId
  studentId String? @index       // ← Often filter by student
  status String @index           // ← Often filter by status
  @@index([academyId, status])   // ← Composite index for common filter
}
```

---

## 11. PrismaService Singleton

**Decision**: Inject single PrismaService instance into all modules.

**Why**:
- **One connection**: Reuse DB connection pool
- **Cleanup**: Single service manages disconnection
- **Testable**: Can mock PrismaService in tests

**Setup**:
```ts
@Module({
  providers: [PrismaService]
})
export class AppModule {}

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}
  // Use this.prisma for all queries
}
```

---

## 12. Custom Decorators for Validation

**Decision**: Create `@CurrentUser()` decorator to extract user from request.

**Why**:
- **Reusable**: Every resolver can use it
- **Type-safe**: Returns `User` type
- **DRY**: No manual token parsing

**Implementation**:
```ts
@Injectable()
export class CurrentUserDecorator {
  static create(): ParameterDecorator {
    return createParamDecorator((_, ctx: ExecutionContext) => {
      const request = ctx.switchToHttp().getRequest();
      return request.user; // From SupabaseAuthGuard
    })();
  }
}

// Usage
@Query()
getStudents(@CurrentUser() user: User) {
  return this.service.findAll(user.academyId);
}
```

---

## Related

- [Architectural Decisions](./architectural.md) — High-level design
- [Database Design](./database.md) — Schema decisions
