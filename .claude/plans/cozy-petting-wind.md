# Plan: Add search filter to `classStudents` query

## Context
The `classStudents` GraphQL query returns paginated students enrolled in a class. The frontend table needs to filter by student name. Currently the query accepts only `classId`, `page`, and `limit` — no search support.

## Approach
Add an optional `search` string arg to the resolver and propagate it to the service where it's applied as a Prisma `where` filter on the `student` relation. No new DTO needed — `search` follows the same flat scalar arg pattern as `page` and `limit`.

---

## Changes

### 1. `src/classes/classes.resolver.ts` — lines 65-73

Add `search` arg between `limit` and `@CurrentUser()`:

```ts
@Query(() => PaginatedClassStudents)
classStudents(
  @Args("classId") classId: string,
  @Args("page", { type: () => Int, defaultValue: 1 }) page: number,
  @Args("limit", { type: () => Int, defaultValue: 10 }) limit: number,
  @Args("search", { nullable: true }) search: string | undefined,
  @CurrentUser() user: User,
): Promise<PaginatedClassStudents> {
  return this.classesService.findStudentsByClass(classId, user.academyId, page, limit, search);
}
```

---

### 2. `src/classes/classes.service.ts` — `findStudentsByClass` (line 254)

**A. Method signature** — add optional `search?`:
```ts
async findStudentsByClass(
  classId: string,
  academyId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
): Promise<PaginatedClassStudents> {
```

**B. Replace flat `where: { classId }` with a shared `where` variable**, built before `Promise.all`:
```ts
const where: Prisma.ClassStudentWhereInput = {
  classId,
  ...(search && {
    student: {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ],
    },
  }),
};

const [total, classStudents] = await Promise.all([
  this.prisma.classStudent.count({ where }),
  this.prisma.classStudent.findMany({
    where,
    include: { student: true },
    skip,
    take,
    orderBy: { createdAt: "asc" },
  }),
]);
```

Need to add `Prisma` to imports at top of service file if not already present.

---

## Backward Compatibility
- `search` is optional → existing callers unaffected
- When `search` is `undefined`, the spread is falsy → `where` stays `{ classId }` (same as before)
- `count` and `findMany` now share the same `where` object → consistent pagination

## Verification
1. Start dev server: `npm run start:dev`
2. Query `classStudents(classId: "...", page: 1, limit: 10)` → should return same results as before
3. Query `classStudents(classId: "...", search: "alice")` → should only return students whose firstName or lastName contains "alice" (case-insensitive)
4. Query with search + pagination → confirm `meta.total` reflects filtered count, not full count
