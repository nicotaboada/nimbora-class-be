# Plan: Mutation `assignStudentsToFamily`

## Context
Se necesita una mutation GraphQL que permita asignar una lista de estudiantes a una familia. La relación familia-estudiante ya existe en el schema de Prisma como tabla join explícita (`FamilyStudent`) con unique constraint en `[familyId, studentId]`. No existe el módulo `/src/families/` — hay que crearlo desde cero.

## Objetivo
Mutation `assignStudentsToFamily(input: AssignStudentsToFamilyInput): Family` que:
1. Verifica que la familia pertenece a la academia del usuario (multi-tenant)
2. Verifica que todos los estudiantes pertenecen a la misma academia
3. Crea registros `FamilyStudent` para cada studentId (skipDuplicates para idempotencia)
4. Retorna la familia con sus estudiantes actualizados

---

## Archivos a crear

### `/src/families/dto/assign-students-to-family.input.ts`
```ts
@InputType()
export class AssignStudentsToFamilyInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  familyId: string;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  studentIds: string[];
}
```

### `/src/families/entities/family.entity.ts`
```ts
@ObjectType()
export class Family {
  @Field()
  id: string;
  @Field()
  academyId: string;
  @Field()
  name: string;
  @Field(() => [String])
  tags: string[];
  @Field(() => Status)
  status: Status;
  @Field()
  createdAt: Date;
  @Field()
  updatedAt: Date;
}
```

### `/src/families/utils/family-mapper.util.ts`
Función `mapFamilyToEntity(prismaFamily): Family` — mapea modelo Prisma → tipo GraphQL.

### `/src/families/families.service.ts`
Método `assignStudents(input: AssignStudentsToFamilyInput, academyId: string): Promise<Family>`:
1. `findUnique` de la familia → `assertOwnership(family.academyId, academyId)`
2. Verificar que todos los studentIds existen y pertenecen a la academia:
   ```ts
   const students = await this.prisma.student.findMany({
     where: { id: { in: studentIds }, academyId },
   });
   if (students.length !== studentIds.length) throw new BadRequestException(...)
   ```
3. `createMany` con `skipDuplicates: true`:
   ```ts
   await this.prisma.familyStudent.createMany({
     data: studentIds.map(studentId => ({
       familyId, studentId, academyId,
     })),
     skipDuplicates: true,
   });
   ```
4. Retornar la familia mapeada

### `/src/families/families.resolver.ts`
```ts
@Resolver(() => Family)
@UseGuards(SupabaseAuthGuard)
export class FamiliesResolver {
  @Mutation(() => Family)
  assignStudentsToFamily(
    @Args('input') input: AssignStudentsToFamilyInput,
    @CurrentUser() user: User,
  ) {
    return this.familiesService.assignStudents(input, user.academyId);
  }
}
```

### `/src/families/families.module.ts`
Importa `PrismaModule`, provee `FamiliesResolver` y `FamiliesService`.

### Registrar en `/src/app.module.ts`
Agregar `FamiliesModule` al array `imports`.

---

## Archivos críticos a modificar
- [src/app.module.ts](src/app.module.ts) — agregar `FamiliesModule`

## Archivos a referenciar (patrones)
- [src/students/students.service.ts](src/students/students.service.ts) — patrón de assertOwnership y mappers
- [src/common/utils/tenant-validation.ts](src/common/utils/tenant-validation.ts) — `assertOwnership`
- [prisma/schema.prisma](prisma/schema.prisma) — líneas 217-260 (Family, FamilyStudent)

---

## Verificación
1. Levantar servidor: `npm run start:dev`
2. En GraphQL Playground ejecutar:
```graphql
mutation {
  assignStudentsToFamily(input: {
    familyId: "<uuid>",
    studentIds: ["<uuid1>", "<uuid2>"]
  }) {
    id
    name
  }
}
```
3. Verificar que la tabla `FamilyStudent` tiene los registros creados (Prisma Studio: `npm run prisma:studio`)
4. Ejecutar la mutation dos veces con los mismos datos → no debe fallar (idempotente por `skipDuplicates`)
5. Probar con un studentId de otra academia → debe lanzar `BadRequestException`
