# Plan: Families Module — Paginated Query

## Context
The `Family`, `FamilyGuardian`, and `FamilyStudent` models already exist in the Prisma schema but there is no NestJS module, resolver, or service for them. The UI (screenshot) needs a paginated, searchable list of families. This plan covers creating the full families feature module with a single paginated query.

---

## Scope
Only the **paginated families query** is being built. No mutations (create/update/delete) are in scope.

---

## Files to Create

### 1. `src/families/entities/family.entity.ts`
GraphQL `@ObjectType` mapping the `Family` Prisma model:
- `id`, `academyId`, `name`, `tags` (`[String]`), `status` (reuse existing `Status` enum), `createdAt`, `updatedAt`
- Also expose counts: `guardianCount` and `studentCount` (nullable `Int`) for the UI table columns

### 2. `src/families/dto/paginated-families.output.ts`
```ts
@ObjectType()
export class PaginatedFamilies extends Paginated(Family) {}
```
Reuses the generic factory at `src/common/dto/paginated.output.ts`.

### 3. `src/families/utils/family-mapper.util.ts`
`mapFamilyToEntity(prismaFamily, guardianCount?, studentCount?)` — maps Prisma row → GraphQL entity.

### 4. `src/families/families.service.ts`
`findAll(academyId, page, limit, search?)`:
- `where: { academyId }` + optional `name: { contains: search, mode: 'insensitive' }`
- `Promise.all([count, findMany])` with `skip/take`, `orderBy: { createdAt: 'desc' }`
- Include `_count: { select: { guardians: true, students: true } }` in `findMany` to get member counts in one query
- Returns `{ data: Family[], meta: PaginationMeta }`

### 5. `src/families/families.resolver.ts`
```ts
@Query(() => PaginatedFamilies, { name: 'families' })
findAll(@CurrentUser() user, @Args page, limit, search?)
```
All standard guards: `@UseGuards(SupabaseAuthGuard)`.

### 6. `src/families/families.module.ts`
Registers `FamiliesResolver` + `FamiliesService`, imports `AuthModule`.

---

## Files to Modify

### `src/app.module.ts`
Add `FamiliesModule` to `imports[]`.

---

## Key Implementation Details

- **Search filter**: `name: { contains: search, mode: 'insensitive' }` on `Family`
- **Member counts**: Use Prisma `_count` in `findMany` — avoids N+1 queries
- **Status enum**: Already defined as `Status` in `src/common/enums/status.enum.ts` — reuse it
- **Multi-tenant**: Always filter `where: { academyId }` and never expose raw Prisma objects
- **Paginated factory**: `src/common/dto/paginated.output.ts` → `Paginated(Family)`

---

## Verification
1. Start dev server: `npm run start:dev`
2. Open GraphQL playground (usually `http://localhost:3000/graphql`)
3. Run query:
```graphql
query {
  families(page: 1, limit: 10, search: "Taboada") {
    data {
      id
      name
      tags
      status
      guardianCount
      studentCount
    }
    meta {
      total
      page
      totalPages
      hasNextPage
    }
  }
}
```
4. Verify multi-tenant: response only returns families for the authenticated user's `academyId`
