# Plan: Add `removeStudentFromClass` Mutation

## Context

The frontend calls "desinscribir estudiante de clase" (unsubscribe student from class), but no such mutation exists. The error shows `students.service.ts:131` (`prisma.student.delete`) being called — meaning the frontend was accidentally hitting the **delete student** mutation instead of a class-enrollment removal. That fails with a FK constraint because the student has related `Charge` records.

The real fix is to add a dedicated `removeStudentFromClass` mutation that deletes the `ClassStudent` join-table row only.

## What to add

### 1. Service method — `classes.service.ts`

Add `removeStudentFromClass(classId, studentId, academyId)` after `assignStudents`:

```ts
async removeStudentFromClass(
  classId: string,
  studentId: string,
  academyId: string,
): Promise<ClassEntity> {
  // Verify class belongs to academy
  const cls = await this.prisma.class.findUnique({ where: { id: classId } });
  assertOwnership(cls, academyId, "Clase");

  // Delete the single ClassStudent join row
  await this.prisma.classStudent.delete({
    where: { classId_studentId: { classId, studentId } },
  });

  // Return updated class
  const updatedClass = await this.prisma.class.findUnique({
    where: { id: classId },
    include: {
      program: true,
      teacher: { include: { contactInfo: true } },
      students: { select: { id: true } },
    },
  });

  return mapClassToEntity(updatedClass!);
}
```

### 2. Resolver mutation — `classes.resolver.ts`

Add after `assignStudentsToClass`:

```ts
@Mutation(() => ClassEntity)
removeStudentFromClass(
  @Args("classId") classId: string,
  @Args("studentId") studentId: string,
  @CurrentUser() user: User,
): Promise<ClassEntity> {
  return this.classesService.removeStudentFromClass(classId, studentId, user.academyId);
}
```

No new DTO needed — args are plain strings.

## Critical files

- [src/classes/classes.service.ts](src/classes/classes.service.ts) — add `removeStudentFromClass` method (~line 252, after `assignStudents`)
- [src/classes/classes.resolver.ts](src/classes/classes.resolver.ts) — add `removeStudentFromClass` mutation (~line 63, after `assignStudentsToClass`)

## Verification

1. Run `npm run start:dev`
2. In GraphQL playground, call:
   ```graphql
   mutation {
     removeStudentFromClass(classId: "...", studentId: "...")  {
       id
       students { id }
     }
   }
   ```
3. Confirm the student no longer appears in `classStudents` query
4. Confirm the student record still exists in `students` query (was NOT deleted)
