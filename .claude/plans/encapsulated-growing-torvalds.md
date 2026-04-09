# Plan: Assign Students to Class + Query Students by Class

## Context

The `ClassStudent` join table already exists in Prisma with a `@@unique([classId, studentId])` constraint.  
The `classes` module already computes `studentCount` by fetching enrolled students, but there's no mutation to enroll students nor a query to list them.  
We need: one mutation (`assignStudentsToClass`) and one query (`classStudents`).

---

## Implementation Plan

### 1. DTO — `AssignStudentsToClassInput`

**File:** `src/classes/dto/assign-students-to-class.input.ts`

```ts
@InputType()
export class AssignStudentsToClassInput {
  @Field()
  classId: string;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  studentIds: string[];
}
```

---

### 2. Service — two new methods in `ClassesService`

**File:** `src/classes/classes.service.ts`

**`assignStudents(input, academyId)`**
1. Find the class, `assertOwnership(class.academyId, academyId)`.
2. Validate all students belong to the academy:
   ```ts
   const students = await this.prisma.student.findMany({
     where: { id: { in: input.studentIds }, academyId },
   });
   if (students.length !== input.studentIds.length)
     throw new BadRequestException("One or more students not found or do not belong to this academy");
   ```
3. Upsert enrollments using `createMany` with `skipDuplicates: true` (the `@@unique` constraint handles idempotency):
   ```ts
   await this.prisma.classStudent.createMany({
     data: input.studentIds.map(studentId => ({ classId: input.classId, studentId })),
     skipDuplicates: true,
   });
   ```
4. Return the updated class (re-fetch with students included so `studentCount` is accurate).

**`findStudentsByClass(classId, academyId)`**
1. Find the class, `assertOwnership(class.academyId, academyId)`.
2. Query enrolled students:
   ```ts
   const classStudents = await this.prisma.classStudent.findMany({
     where: { classId },
     include: { student: true },
   });
   return classStudents.map(cs => mapStudentToEntity(cs.student));
   ```

---

### 3. Resolver — two new operations in `ClassesResolver`

**File:** `src/classes/classes.resolver.ts`

```ts
@Mutation(() => Class)
assignStudentsToClass(
  @Args("assignStudentsToClassInput") input: AssignStudentsToClassInput,
  @CurrentUser() user: User,
) {
  return this.classesService.assignStudents(input, user.academyId);
}

@Query(() => [Student])
classStudents(
  @Args("classId") classId: string,
  @CurrentUser() user: User,
) {
  return this.classesService.findStudentsByClass(classId, user.academyId);
}
```

Note: `Student` GraphQL type needs to be imported from the students module.  
`StudentsService` does **not** need to be injected — we query `classStudent` with `include: { student: true }` directly in `ClassesService`.

---

### 4. Module — import Student entity

**File:** `src/classes/classes.module.ts`

No new imports needed — `ClassesService` already injects `PrismaService` which has access to all models.  
Verify that `Student` entity is exported/importable from the students module (it's a plain `@ObjectType` so it can just be imported directly in the resolver).

---

## Critical Files

| File | Change |
|------|--------|
| `src/classes/dto/assign-students-to-class.input.ts` | **New** — DTO |
| `src/classes/classes.service.ts` | Add `assignStudents` and `findStudentsByClass` methods |
| `src/classes/classes.resolver.ts` | Add `assignStudentsToClass` mutation and `classStudents` query |

---

## Reuse

- `assertOwnership` from `src/common/utils/`
- `mapStudentToEntity` from `src/students/utils/student-mapper.util.ts`
- `Student` entity from `src/students/entities/student.entity.ts`
- `PrismaService` already injected in `ClassesService`

---

## Verification

1. Run `npm run start:dev` — no compile errors.
2. Open GraphQL Playground (or Altair) with a valid JWT.
3. Test mutation:
   ```graphql
   mutation {
     assignStudentsToClass(assignStudentsToClassInput: {
       classId: "<valid-class-id>"
       studentIds: ["<student-id-1>", "<student-id-2>"]
     }) {
       id
       name
       studentCount
     }
   }
   ```
4. Test query:
   ```graphql
   query {
     classStudents(classId: "<valid-class-id>") {
       id
       firstName
       lastName
       email
     }
   }
   ```
5. Re-run the mutation with the same students — should succeed silently (idempotent via `skipDuplicates`).
6. Try assigning a student from a different academy — should throw `BadRequestException`.
