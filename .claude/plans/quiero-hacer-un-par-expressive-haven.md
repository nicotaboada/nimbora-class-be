# Plan: Email opcional en Student + Teacher opcional en Class

## Context

Dos cambios de schema alineados con el patrón ya existente de otras entidades:

1. **Student.email** es `NOT NULL` hoy, pero `Teacher.email` y `FamilyGuardian.email` ya son opcionales. Se quiere permitir alumnos sin email (caso común: menores de edad cuyos datos de contacto están en el tutor).
2. **Class.teacherId** es `NOT NULL` hoy. Se quiere permitir crear una clase sin profesor asignado todavía (se asigna después). El update ya lo soporta; solo falta el create y el schema.

Buen punto de partida: la infraestructura ya está lista para emails nulos. `assertEmailUniqueInAcademy` ya hace early-return si el email viene vacío ([email-uniqueness.util.ts:34](src/common/utils/email-uniqueness.util.ts#L34)), el service de students ya chequea `if (studentData.email)` antes de validar unicidad ([students.service.ts:26](src/students/students.service.ts#L26)), `UpdateClassInput.teacherId` ya es opcional ([update-class.input.ts:29-32](src/classes/dto/update-class.input.ts#L29-L32)), y el update del classes service ya valida teacher condicionalmente ([classes.service.ts:85-90](src/classes/classes.service.ts#L85-L90)). El constraint `@@unique([academyId, email])` en Postgres permite múltiples NULLs, así que no hay que tocarlo.

---

## Parte 1 — Student.email opcional

### Schema

**[prisma/schema.prisma:140](prisma/schema.prisma#L140)**
```prisma
email       String?   // antes: String
```

### Migration nueva
`prisma/migrations/<timestamp>_make_student_email_optional/migration.sql`:
```sql
ALTER TABLE "Student" ALTER COLUMN "email" DROP NOT NULL;
```
El índice único `Student_academyId_email_key` sigue funcionando con NULLs (Postgres permite varios).

### DTO
**[src/students/dto/create-student.input.ts:22-25](src/students/dto/create-student.input.ts#L22-L25)** — alinear con `UpdateStudentInput`:
```ts
@Field({ nullable: true })
@IsOptional()
@IsEmail({}, { message: "El email debe tener un formato válido" })
email?: string;
```

### Entity GraphQL
**[src/students/entities/student.entity.ts:19-20](src/students/entities/student.entity.ts#L19-L20)**:
```ts
@Field({ nullable: true })
email?: string;
```

### Mapper
**[src/students/utils/student-mapper.util.ts:21](src/students/utils/student-mapper.util.ts#L21)**:
```ts
email: prismaStudent.email ?? undefined,
```

### Service
**[src/students/students.service.ts:19-62](src/students/students.service.ts#L19-L62)** — no requiere cambios: `...studentData` pasará `email: undefined` cuando corresponda (Prisma lo acepta), y el guard `if (studentData.email)` para uniqueness ya existe.

### Bulk import

**[src/bulk-imports/types/student-import.types.ts:12,28](src/bulk-imports/types/student-import.types.ts#L12)** — hacer `email` nullable en `StudentImportRow` y `StudentImportResult`:
```ts
email: string | null;
```

**[src/bulk-imports/config/student-import.config.ts:57](src/bulk-imports/config/student-import.config.ts#L57)** — cambiar el flag (afecta solo el label "(Opcional)" en la plantilla XLSX generada):
```ts
required: false,
```

**[src/bulk-imports/validators/student-import.validator.ts:61,176-184](src/bulk-imports/validators/student-import.validator.ts#L61-L184)**:
- Quitar el `addError("Email", "Campo requerido")` de la línea 179. Dejar solo el check de formato cuando `rawEmail` existe.
- Cuando `email` es null, no insertar en `emailToRows` (saltearse el bloque de dedup intra-archivo y DB para esa fila).

**[src/trigger/bulk-import-students.ts:18,55,69](src/trigger/bulk-import-students.ts#L18-L69)**:
- `StudentImportPayloadRow.email: string | null`.
- `data.email: row.email` ya funciona con null.
- El retorno `{ email: row.email, studentId }` queda con email nullable — verificar que `runBulkImportTransaction` lo acepta (el tipo genérico `TMeta extends Record<string, unknown>` lo permite).

---

## Parte 2 — Class.teacherId opcional

### Schema

**[prisma/schema.prisma:312-313,330](prisma/schema.prisma#L312-L330)**:
```prisma
teacherId String?
teacher   Teacher? @relation(fields: [teacherId], references: [id])
```
El `@@index([teacherId])` sigue válido.

Nota: el `onDelete` actual es el default `RESTRICT` (ver [migration](prisma/migrations/20260402171941_add_class_table/migration.sql#L35)). Se mantiene — borrar un profesor con clases seguirá fallando; si más adelante se quiere `SET NULL` al borrar profesor, es un cambio aparte.

### Migration nueva
`prisma/migrations/<timestamp>_make_class_teacher_optional/migration.sql`:
```sql
ALTER TABLE "Class" ALTER COLUMN "teacherId" DROP NOT NULL;
```

### DTO
**[src/classes/dto/create-class.input.ts:23-25](src/classes/dto/create-class.input.ts#L23-L25)**:
```ts
@Field({ nullable: true })
@IsOptional()
@IsString()
teacherId?: string;
```

### Entity GraphQL
**[src/classes/entities/class.entity.ts:19-20](src/classes/entities/class.entity.ts#L19-L20)**:
```ts
@Field(() => Teacher, { nullable: true })
teacher?: Teacher;
```

### Service
**[src/classes/classes.service.ts:31-35](src/classes/classes.service.ts#L31-L35)** — copiar el patrón que ya usa `update` en [L85-L90](src/classes/classes.service.ts#L85-L90):
```ts
if (input.teacherId) {
  const teacher = await this.prisma.teacher.findUnique({
    where: { id: input.teacherId },
  });
  assertOwnership(teacher, academyId, "Profesor");
}
```

### Mapper
**[src/classes/utils/class-mapper.util.ts:10-16,26](src/classes/utils/class-mapper.util.ts#L10-L26)**:
```ts
type PrismaClassWithRelations = PrismaClass & {
  program: PrismaProgram;
  teacher: PrismaTeacher | null;
  students?: { id: string }[];
};

// en mapClassToEntity:
teacher: prismaClass.teacher ? mapTeacherToEntity(prismaClass.teacher) : undefined,
```
Los `include: { teacher: true }` actuales siguen funcionando — Prisma devolverá `null` cuando no haya teacher.

---

## Regenerar GraphQL schema

Al levantar el server, `src/schema.gql` se regenera automáticamente (autoSchemaFile). Tras los cambios:
- `Student.email: String!` → `String` (nullable)
- `CreateStudentInput.email: String!` → `String` (nullable)
- `Class.teacher: Teacher!` → `Teacher` (nullable)
- `CreateClassInput.teacherId: String!` → `String` (nullable)

---

## Archivos críticos a modificar

- [prisma/schema.prisma](prisma/schema.prisma) — Student.email + Class.teacherId + Class.teacher
- [src/students/dto/create-student.input.ts](src/students/dto/create-student.input.ts)
- [src/students/entities/student.entity.ts](src/students/entities/student.entity.ts)
- [src/students/utils/student-mapper.util.ts](src/students/utils/student-mapper.util.ts)
- [src/bulk-imports/types/student-import.types.ts](src/bulk-imports/types/student-import.types.ts)
- [src/bulk-imports/config/student-import.config.ts](src/bulk-imports/config/student-import.config.ts)
- [src/bulk-imports/validators/student-import.validator.ts](src/bulk-imports/validators/student-import.validator.ts)
- [src/trigger/bulk-import-students.ts](src/trigger/bulk-import-students.ts)
- [src/classes/dto/create-class.input.ts](src/classes/dto/create-class.input.ts)
- [src/classes/entities/class.entity.ts](src/classes/entities/class.entity.ts)
- [src/classes/classes.service.ts](src/classes/classes.service.ts)
- [src/classes/utils/class-mapper.util.ts](src/classes/utils/class-mapper.util.ts)
- 2 migrations nuevas bajo `prisma/migrations/`

---

## Verificación end-to-end

1. `npm run prisma:migrate` — aplica las 2 migrations nuevas.
2. `npm run prisma:generate` — regenera el Prisma client con los tipos nullable.
3. `npm run build` — confirma que no hay errores TS (el mapper de Class y el trigger de import son los puntos más sensibles al cambio de tipos).
4. `npm run start:dev` — verifica que el schema GraphQL se regenera sin romper.
5. Tests manuales vía GraphQL Playground:
   - **Crear Student sin email** → éxito, `student.email === null` en la respuesta.
   - **Crear Student con email** → éxito y chequeo de unicidad activo.
   - **Crear dos Students sin email en la misma academia** → ambos ok (índice único permite varios NULL).
   - **Crear Class sin teacherId** → éxito, `class.teacher === null`.
   - **Crear Class con teacherId de otra academia** → falla con 403 (assertOwnership sigue activo).
   - **Update Class reasignando teacher** → sigue funcionando igual.
6. Bulk import:
   - Subir XLSX con fila sin email y otra con email duplicado en archivo → el primero se importa ok, el segundo falla con "Email duplicado".
   - Descargar plantilla y verificar que la columna Email aparece como "(Opcional)".
