# Plan: familiesForBulkInvoice Query

## Context

The "Crear Facturas en Masa" screen currently supports creating invoices per student via `studentsForBulkInvoice`. We need to add a parallel query that returns **families** grouped with their students and charges — so the UI can show the expandable family view seen in the screenshot. A family is included only if at least one of its students has a PENDING charge for the selected period.

The existing `bulkCreateInvoices` mutation doesn't need to change — it already takes `items: { studentId, chargeIds[] }[]`, so the frontend just flattens family → students when submitting.

---

## New Files

### 1. `src/bulk-operations/entities/family-bulk-invoice-preview.entity.ts`

Two `@ObjectType()` classes:

```ts
@ObjectType()
export class StudentBulkInvoiceInFamily {
  studentId: string;
  firstName: string;
  lastName: string;
  chargeCount: number;
  totalAmount: number;
  chargeIds: string[];
}

@ObjectType()
export class FamilyBulkInvoicePreview {
  familyId: string;
  familyName: string;
  studentCount: number;    // students that have matching charges
  totalAmount: number;     // sum across all students
  students: StudentBulkInvoiceInFamily[];
}
```

### 2. `src/bulk-operations/dto/paginated-families-for-bulk-invoice.output.ts`

```ts
@ObjectType()
export class PaginatedFamiliesForBulkInvoice extends Paginated(FamilyBulkInvoicePreview) {}
```

> **Note**: Reuse the existing `StudentsForBulkInvoiceInput` DTO for the input — same fields (`period`, `includePastDue`, `search`). No new input DTO needed.

---

## Modified Files

### 3. `src/bulk-operations/bulk-operations.service.ts`

Add method `findFamiliesForBulkInvoice(input, academyId, page, limit)`:

```ts
async findFamiliesForBulkInvoice(
  input: StudentsForBulkInvoiceInput,
  academyId: string,
  pageInput = 1,
  limitInput = 10,
): Promise<PaginatedFamiliesForBulkInvoice> {
  const { period, includePastDue, search } = input;
  const page = Math.max(1, pageInput);
  const limit = Math.min(Math.max(1, limitInput), 100);
  const skip = (page - 1) * limit;

  const chargesFilter: Prisma.ChargeWhereInput = {
    status: ChargeStatus.PENDING,
    periodMonth: includePastDue ? { lte: period } : period,
  };

  const familyWhere: Prisma.FamilyWhereInput = {
    academyId,
    students: { some: { charges: { some: chargesFilter } } },
  };

  if (search) {
    familyWhere.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { students: { some: { firstName: { contains: search, mode: "insensitive" } } } },
      { students: { some: { lastName: { contains: search, mode: "insensitive" } } } },
      { students: { some: { email: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [total, families] = await Promise.all([
    this.prisma.family.count({ where: familyWhere }),
    this.prisma.family.findMany({
      where: familyWhere,
      include: {
        students: {
          where: { charges: { some: chargesFilter } },
          include: { charges: { where: chargesFilter, select: { id: true, amount: true } } },
          orderBy: { firstName: "asc" },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
  ]);

  const data: FamilyBulkInvoicePreview[] = families.map((family) => {
    const students = family.students.map((student) => ({
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      chargeCount: student.charges.length,
      totalAmount: student.charges.reduce((sum, c) => sum + c.amount, 0),
      chargeIds: student.charges.map((c) => c.id),
    }));

    return {
      familyId: family.id,
      familyName: family.name,
      studentCount: students.length,
      totalAmount: students.reduce((sum, s) => sum + s.totalAmount, 0),
      students,
    };
  });

  const totalPages = Math.ceil(total / limit);
  return {
    data,
    meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
  };
}
```

### 4. `src/bulk-operations/bulk-operations.resolver.ts`

Add query:

```ts
@Query(() => PaginatedFamiliesForBulkInvoice, {
  name: "familiesForBulkInvoice",
  description: "Familias con charges pendientes para facturación masiva (paginado)",
})
async findFamiliesForBulkInvoice(
  @CurrentUser() user: User,
  @Args("input") input: StudentsForBulkInvoiceInput,
  @Args("page", { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
  @Args("limit", { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
): Promise<PaginatedFamiliesForBulkInvoice> {
  return this.bulkOperationsService.findFamiliesForBulkInvoice(input, user.academyId, page, limit);
}
```

---

## Critical Files

| File | Change |
|------|--------|
| `src/bulk-operations/bulk-operations.service.ts` | Add `findFamiliesForBulkInvoice` method |
| `src/bulk-operations/bulk-operations.resolver.ts` | Add `familiesForBulkInvoice` query |
| `src/bulk-operations/entities/family-bulk-invoice-preview.entity.ts` | New — two `@ObjectType` classes |
| `src/bulk-operations/dto/paginated-families-for-bulk-invoice.output.ts` | New — paginated wrapper |

**Reused (no changes):**
- `src/bulk-operations/dto/students-for-bulk-invoice.input.ts` — same input shape
- `src/bulk-operations/dto/bulk-create-invoices.input.ts` — mutation unchanged
- `Paginated()` generic from wherever it's currently imported

---

## Key Design Decisions

- **No new input DTO**: `StudentsForBulkInvoiceInput` has exactly the same fields needed (`period`, `includePastDue`, `search`). Reusing it avoids duplication.
- **Search spans family + students**: Matches family name OR any student name/email within the family.
- **Nested students in response**: The entity embeds `StudentBulkInvoiceInFamily[]` directly on each family — this is what the UI needs to render the expandable rows without extra fetches.
- **Mutation unchanged**: Frontend flattens `family.students[]` into `items: { studentId, chargeIds }[]` when calling `bulkCreateInvoices`.

---

## Verification

1. Start dev server: `npm run start:dev`
2. Open GraphQL playground and query:
```graphql
query {
  familiesForBulkInvoice(
    input: { period: "2026-06", includePastDue: false }
    page: 1
    limit: 10
  ) {
    data {
      familyId
      familyName
      studentCount
      totalAmount
      students {
        studentId
        firstName
        lastName
        chargeCount
        totalAmount
        chargeIds
      }
    }
    meta { total totalPages }
  }
}
```
3. Verify only families with at least one student with PENDING charges for the period appear.
4. Test `includePastDue: true` — should accumulate past months.
5. Test `search: "Taboada"` — should match family name and student names.
