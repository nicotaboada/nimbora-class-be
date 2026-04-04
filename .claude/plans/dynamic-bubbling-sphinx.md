# Plan: updateClass Mutation

## Context
Agregar la mutation `updateClass` al módulo de clases. Debe aceptar los mismos campos que `createClass` (name, programId, teacherId, startDate, endDate, capacity) más dos campos adicionales: `description` y `code`.

- `code` ya existe en el schema de Prisma y en la entidad GraphQL.
- `description` NO existe en Prisma ni en la entidad → requiere migration.

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `prisma/schema.prisma` | Agregar `description String?` al model `Class` |
| `src/classes/entities/class.entity.ts` | Agregar `description?: string` |
| `src/classes/utils/class-mapper.util.ts` | Mapear `description` |
| `src/classes/dto/update-class.input.ts` | **Crear** nuevo DTO |
| `src/classes/classes.service.ts` | Agregar método `update()` |
| `src/classes/classes.resolver.ts` | Agregar mutation `updateClass` |

## Pasos

### 1. Schema Prisma — agregar `description`
En `prisma/schema.prisma`, model `Class`, agregar después de `code  String?`:
```prisma
description String?
```
Luego correr: `npm run prisma:migrate`

### 2. Entity — agregar `description`
En `src/classes/entities/class.entity.ts`, agregar campo:
```ts
@Field({ nullable: true })
description?: string;
```

### 3. Mapper — mapear `description`
En `src/classes/utils/class-mapper.util.ts`, agregar al objeto retornado:
```ts
description: prismaClass.description ?? undefined,
```

### 4. DTO — crear `UpdateClassInput`
Crear `src/classes/dto/update-class.input.ts`:
```ts
@InputType()
export class UpdateClassInput {
  @Field()
  @IsString()
  id: string;

  // Mismos campos que CreateClassInput (todos opcionales)
  @Field({ nullable: true })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200)
  name?: string;

  @Field({ nullable: true })
  @IsOptional() @IsString()
  programId?: string;

  @Field({ nullable: true })
  @IsOptional() @IsString()
  teacherId?: string;

  @Field({ nullable: true })
  @IsOptional()
  startDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  endDate?: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional() @IsInt() @Min(1)
  capacity?: number;

  // Campos adicionales
  @Field({ nullable: true })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @Field({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  code?: string;
}
```

### 5. Service — agregar `update()`
En `src/classes/classes.service.ts`, agregar método:
```ts
async update(id: string, input: UpdateClassInput, academyId: string): Promise<ClassEntity> {
  // Verificar ownership de la clase
  const existing = await this.prisma.class.findUnique({ where: { id } });
  assertOwnership(existing, academyId, "Clase");

  // Si cambia programa, verificar ownership
  if (input.programId) {
    const program = await this.prisma.program.findUnique({ where: { id: input.programId } });
    assertOwnership(program, academyId, "Programa");
  }

  // Si cambia profesor, verificar ownership
  if (input.teacherId) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id: input.teacherId } });
    assertOwnership(teacher, academyId, "Profesor");
  }

  const { id: _, ...data } = input;

  const cls = await this.prisma.class.update({
    where: { id },
    data,
    include: {
      program: true,
      teacher: { include: { contactInfo: true } },
      students: { select: { id: true } },
    },
  });

  return mapClassToEntity(cls);
}
```

### 6. Resolver — agregar mutation
En `src/classes/classes.resolver.ts`, agregar:
```ts
@Mutation(() => ClassEntity)
updateClass(
  @Args("updateClassInput") updateClassInput: UpdateClassInput,
  @CurrentUser() user: User,
): Promise<ClassEntity> {
  return this.classesService.update(updateClassInput.id, updateClassInput, user.academyId);
}
```

## Verificación
1. `npm run prisma:migrate` — migración exitosa
2. `npm run start:dev` — servidor sin errores
3. GraphQL Playground: ejecutar `mutation { updateClass(updateClassInput: { id: "...", name: "Nuevo nombre", description: "desc", code: "ABC" }) { id name description code } }`
4. Verificar que no se pueda actualizar una clase de otra academia (ownership check)
