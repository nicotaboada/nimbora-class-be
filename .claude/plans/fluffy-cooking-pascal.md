# Plan: Restaurar setFamilyStudents con la nueva arquitectura (FK directa)

## Context
La refactorización del modelo ya está **completa**: se eliminó la tabla `FamilyStudent` y se agregó `familyId?` directo en `Student`. El error fue eliminar la mutation `setFamilyStudents` del backend y el hook del frontend. La mutation debe seguir existiendo porque el UX permite seleccionar **múltiples estudiantes a la vez** y confirmar con un botón. La implementación interna cambia (ya no usa la join table), pero el contrato de API debe ser igual.

**Lo que hay que hacer:** restaurar `setFamilyStudents` en backend y frontend, adaptada al nuevo modelo con FK directa.

---

## Cambios por capa

### Estado actual (ya implementado)
- Schema: `FamilyStudent` eliminada, `Student.familyId` agregado ✅
- Migración aplicada ✅
- Mapper, service (findOne/findAll/create/familyStudents/availableStudentsForFamily), Student entity: actualizados ✅
- **Error**: se eliminó `setFamilyStudents` del service/resolver y se crearon `addStudentToFamily` / `removeStudentFromFamily` en su lugar ← esto hay que revertir

---

### 1. Backend — Restaurar `setFamilyStudents`

**`src/families/families.service.ts`**
- Eliminar `addStudentToFamily` y `removeStudentFromFamily`
- Restaurar `setFamilyStudents(familyId, studentIds[], academyId)` con la nueva lógica:

```typescript
async setFamilyStudents(familyId, studentIds, academyId) {
  // 1. Validar ownership de la familia
  const family = await this.prisma.family.findUnique({ where: { id: familyId } });
  assertOwnership(family, academyId, 'Family');

  // 2. Validar que todos los studentIds pertenezcan a la academia
  const students = await this.prisma.student.findMany({
    where: { id: { in: studentIds }, academyId },
  });
  if (students.length !== studentIds.length) {
    throw new BadRequestException('One or more students not found or do not belong to this academy');
  }

  // 3. Quitar familia a estudiantes que ya estaban pero no están en la nueva lista
  await this.prisma.student.updateMany({
    where: { familyId, id: { notIn: studentIds } },
    data: { familyId: null },
  });

  // 4. Asignar familia a los estudiantes de la nueva lista
  await this.prisma.student.updateMany({
    where: { id: { in: studentIds }, academyId },
    data: { familyId },
  });

  // 5. Retornar la familia actualizada
  return this.findOne(familyId, academyId);
}
```

**`src/families/families.resolver.ts`**
- Eliminar `addStudentToFamily` y `removeStudentFromFamily`
- Restaurar `setFamilyStudents` con el mismo contrato de antes:

```typescript
@Mutation(() => Family)
async setFamilyStudents(
  @Args('setFamilyStudentsInput') input: SetFamilyStudentsInput,
  @CurrentUser() user: User,
) {
  return this.familiesService.setFamilyStudents(input.familyId, input.studentIds, user.academyId);
}
```

**DTOs a limpiar:**
- Restaurar import de `SetFamilyStudentsInput` desde `./dto/add-students-to-family.input`
- Eliminar los imports de `AddStudentToFamilyInput` y `RemoveStudentFromFamilyInput` y `Student`
- Los archivos `add-student-to-family.input.ts` y `remove-student-from-family.input.ts` se pueden dejar o eliminar

---

### 2. Frontend — Restaurar mutation y hook

**`web/modules/families/graphql/mutations.ts`**
- Eliminar `ADD_STUDENT_TO_FAMILY` y `REMOVE_STUDENT_FROM_FAMILY`
- Restaurar `SET_FAMILY_STUDENTS`:

```graphql
mutation SetFamilyStudents($input: SetFamilyStudentsInput!) {
  setFamilyStudents(setFamilyStudentsInput: $input) {
    id name membersCount createdAt tags
    students { id firstName lastName classes { id name } }
    guardians { id firstName lastName relationship emailNotifications email phoneNumber }
  }
}
```

**`web/modules/families/hooks/use-set-family-students.ts`**
- Ya existe con la lógica correcta, no hay que tocarlo
- Los hooks `use-add-student-to-family.ts` y `use-remove-student-from-family.ts` se pueden eliminar ya que no se usan

---

### No hay que tocar
- `add-student-to-family-sheet.tsx` → sin cambios
- Queries GET_FAMILY, GET_FAMILIES, GET_FAMILY_STUDENTS, GET_AVAILABLE_STUDENTS_FOR_FAMILY → sin cambios
- Mapper, schema, migración → ya correctos

---

## Decisiones de diseño
- Si un estudiante ya pertenece a otra familia y es incluido en `setFamilyStudents`: se lo reasigna silenciosamente (el `updateMany` pisa el `familyId` sin rechazar).
- `availableStudentsForFamily` muestra solo estudiantes con `familyId: null`.

## Verificación
1. `npm run start:dev` — debe compilar sin errores
2. Probar en GraphQL Playground:
   - `setFamilyStudents({ familyId, studentIds: [...] })` → debe asignar múltiples estudiantes
   - `setFamilyStudents` con lista reducida → debe quitar el `familyId` a los que se removieron
   - `familyStudents(familyId)` → debe devolver solo estudiantes de esa familia
   - `availableStudentsForFamily` → solo estudiantes con `familyId: null`
3. Verificar `schema.gql`: debe existir `setFamilyStudents`, no deben existir `addStudentToFamily` ni `removeStudentFromFamily`
