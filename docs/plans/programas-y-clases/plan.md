# Plan: Módulo de Programas y Clases

## Context

Se necesita modelar la estructura de clases de la academia: idiomas predefinidos, programas (niveles) creados por academia, y clases como instancias específicas de un programa con profesor y fechas. Esta es la base del módulo Calendar (horarios) y de la relación estudiante → clase.

---

## Nuevos modelos Prisma

**Archivo:** `prisma/schema.prisma`

Agregar el enum `Language` junto a los demás enums:

```prisma
enum Language {
  ENGLISH
  SPANISH
  FRENCH
  ITALIAN
  PORTUGUESE
}
```

Agregar los dos modelos (después del bloque de Teacher):

```prisma
model Program {
  id          String   @id @default(uuid())
  name        String
  language    Language
  description String?
  status      Status   @default(ENABLED)
  academyId   String
  academy     Academy  @relation(fields: [academyId], references: [id])
  classes     Class[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([academyId])
}

model Class {
  id        String   @id @default(uuid())
  name      String
  programId String
  program   Program  @relation(fields: [programId], references: [id])
  teacherId String
  teacher   Teacher  @relation(fields: [teacherId], references: [id])
  startDate DateTime
  endDate   DateTime
  capacity  Int?
  code      String?
  academyId String
  academy   Academy  @relation(fields: [academyId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([academyId])
  @@index([programId])
  @@index([teacherId])
}
```

Agregar relaciones en modelos existentes:
- `Academy`: agregar `programs Program[]` y `classes Class[]`
- `Teacher`: agregar `classes Class[]`

---

## Archivos a crear

### Enum común

| Archivo | Descripción |
|---------|-------------|
| `src/common/enums/language.enum.ts` | `Language` enum con `registerEnumType` |

### Módulo Programs

| Archivo | Descripción |
|---------|-------------|
| `src/programs/entities/program.entity.ts` | `@ObjectType() Program` |
| `src/programs/entities/language-option.entity.ts` | `@ObjectType() LanguageOption { code: Language, label: string }` |
| `src/programs/entities/programs-by-language.entity.ts` | `@ObjectType() ProgramsByLanguage { language, programs[] }` |
| `src/programs/dto/create-program.input.ts` | `@InputType() CreateProgramInput { name, language, description? }` |
| `src/programs/utils/program-mapper.util.ts` | `mapProgramToEntity(prismaProgram): Program` |
| `src/programs/programs.service.ts` | `create`, `findOne`, `findAll` (agrupado por idioma) |
| `src/programs/programs.resolver.ts` | Mutations: `createProgram`. Queries: `programs`, `languages` |
| `src/programs/programs.module.ts` | imports: `[AuthModule]`, provides: `[ProgramsResolver, ProgramsService]`, exports: `[ProgramsService]` |

### Módulo Classes

| Archivo | Descripción |
|---------|-------------|
| `src/classes/entities/class.entity.ts` | `@ObjectType("Class") ClassEntity` con `program: Program` y `teacher: Teacher` anidados |
| `src/classes/dto/create-class.input.ts` | `name, programId, teacherId, startDate, endDate, capacity?` |
| `src/classes/dto/classes-filter.input.ts` | extiende `PaginationInput`, agrega `search?, status?, programId?` |
| `src/classes/dto/paginated-classes.output.ts` | `class PaginatedClasses extends Paginated(ClassEntity) {}` |
| `src/classes/utils/class-mapper.util.ts` | usa `mapProgramToEntity` + `mapTeacherToEntity` para los anidados |
| `src/classes/classes.service.ts` | `create` (valida ownership de program y teacher), `findAll` paginado |
| `src/classes/classes.resolver.ts` | Mutation: `createClass`. Query: `classes(filter?)` |
| `src/classes/classes.module.ts` | imports: `[AuthModule]`, provides: `[ClassesResolver, ClassesService]` |

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Agregar `Language` enum, `Program`, `Class`, relaciones en `Academy` y `Teacher` |
| `src/common/enums/index.ts` | Agregar `export { Language } from "./language.enum"` |
| `src/app.module.ts` | Importar y registrar `ProgramsModule` y `ClassesModule` |

---

## Implementación paso a paso

### BE-1 — Schema Prisma + migración

Editar `prisma/schema.prisma` con todos los cambios descritos arriba. Luego:

```bash
npx prisma migrate dev --name add_programs_classes
npx prisma generate
```

### BE-2 — Language enum

Crear `src/common/enums/language.enum.ts`:

```ts
import { registerEnumType } from "@nestjs/graphql";

export enum Language {
  ENGLISH = "ENGLISH",
  SPANISH = "SPANISH",
  FRENCH = "FRENCH",
  ITALIAN = "ITALIAN",
  PORTUGUESE = "PORTUGUESE",
}

registerEnumType(Language, { name: "Language" });
```

Agregar al final de `src/common/enums/index.ts`:
```ts
export { Language } from "./language.enum";
```

### BE-3 — Programs: entities + DTO

Crear `program.entity.ts`, `language-option.entity.ts`, `programs-by-language.entity.ts`, `create-program.input.ts`. Patrón idéntico a `teacher.entity.ts` y sus DTOs.

### BE-4 — Programs: mapper

```ts
// src/programs/utils/program-mapper.util.ts
import { Program as PrismaProgram } from "@prisma/client";
import { Program } from "../entities/program.entity";
import { Language } from "../../common/enums/language.enum";
import { Status } from "../../common/enums";

const statusMap: Record<string, Status> = {
  ENABLED: Status.ENABLED,
  DISABLED: Status.DISABLED,
};

const languageMap: Record<string, Language> = {
  ENGLISH: Language.ENGLISH,
  SPANISH: Language.SPANISH,
  FRENCH: Language.FRENCH,
  ITALIAN: Language.ITALIAN,
  PORTUGUESE: Language.PORTUGUESE,
};

export function mapProgramToEntity(p: PrismaProgram): Program {
  return {
    id: p.id,
    academyId: p.academyId,
    name: p.name,
    language: languageMap[p.language],
    description: p.description ?? undefined,
    status: statusMap[p.status] || Status.ENABLED,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
```

### BE-5 — ProgramsService

```ts
// findAll — agrupa en memoria (Prisma no soporta groupBy con objetos completos)
async findAll(academyId: string): Promise<ProgramsByLanguage[]> {
  const programs = await this.prisma.program.findMany({
    where: { academyId },
    orderBy: { name: "asc" },
  });

  const grouped = new Map<Language, Program[]>();
  for (const p of programs) {
    const lang = p.language as Language;
    if (!grouped.has(lang)) grouped.set(lang, []);
    grouped.get(lang)!.push(mapProgramToEntity(p));
  }

  return Array.from(grouped.entries()).map(([language, programs]) => ({
    language,
    programs,
  }));
}

// findOne — usado internamente por ClassesService para validar ownership
async findOne(id: string, academyId: string): Promise<Program> {
  const program = await this.prisma.program.findUnique({ where: { id } });
  return mapProgramToEntity(assertOwnership(program, academyId, "Program"));
}
```

### BE-6 — ProgramsResolver

```ts
const LANGUAGE_LABELS: Record<Language, string> = {
  [Language.ENGLISH]: "English",
  [Language.SPANISH]: "Spanish",
  [Language.FRENCH]: "French",
  [Language.ITALIAN]: "Italian",
  [Language.PORTUGUESE]: "Portuguese",
};

@Query(() => [LanguageOption], { name: "languages" })
languages(): LanguageOption[] {
  return Object.values(Language).map((code) => ({
    code,
    label: LANGUAGE_LABELS[code],
  }));
}

@Query(() => [ProgramsByLanguage], { name: "programs" })
programs(@CurrentUser() user: User): Promise<ProgramsByLanguage[]> {
  return this.programsService.findAll(user.academyId);
}

@Mutation(() => Program)
createProgram(
  @Args("createProgramInput") input: CreateProgramInput,
  @CurrentUser() user: User,
): Promise<Program> {
  return this.programsService.create(input, user.academyId);
}
```

### BE-7 — ProgramsModule

```ts
@Module({
  imports: [AuthModule],
  providers: [ProgramsResolver, ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
```

### BE-8 — Classes: entities + DTOs

Crear `class.entity.ts` usando `@ObjectType("Class")` para el nombre GraphQL pero `ClassEntity` como nombre TypeScript (evita colisión con keyword `class`):

```ts
@ObjectType("Class")
export class ClassEntity {
  @Field() id: string;
  @Field() academyId: string;
  @Field() name: string;
  @Field(() => Program) program: Program;
  @Field(() => Teacher) teacher: Teacher;
  @Field() startDate: Date;
  @Field() endDate: Date;
  @Field(() => Int, { nullable: true }) capacity?: number;
  @Field({ nullable: true }) code?: string;
  @Field() createdAt: Date;
  @Field() updatedAt: Date;
}
```

Crear `classes-filter.input.ts`:
```ts
@InputType()
export class ClassesFilterInput extends PaginationInput {
  @Field({ nullable: true }) @IsOptional() @IsString() search?: string;
  @Field({ nullable: true }) @IsOptional() programId?: string;
}
```

Crear `paginated-classes.output.ts`:
```ts
@ObjectType()
export class PaginatedClasses extends Paginated(ClassEntity) {}
```

### BE-9 — Classes: mapper

Importar ambos mappers de los módulos existentes:

```ts
import { mapTeacherToEntity } from "../../teachers/utils/teacher-mapper.util";
import { mapProgramToEntity } from "../../programs/utils/program-mapper.util";
```

### BE-10 — ClassesService

`create` valida ownership de `programId` y `teacherId` usando `PrismaService` directamente (sin importar otros módulos):

```ts
async create(input: CreateClassInput, academyId: string): Promise<ClassEntity> {
  const program = await this.prisma.program.findUnique({ where: { id: input.programId } });
  assertOwnership(program, academyId, "Program");

  const teacher = await this.prisma.teacher.findUnique({ where: { id: input.teacherId } });
  assertOwnership(teacher, academyId, "Teacher");

  const cls = await this.prisma.class.create({
    data: { ...input, academyId },
    include: { program: true, teacher: { include: { contactInfo: true } } },
  });
  return mapClassToEntity(cls);
}
```

`findAll` usa el patrón `Promise.all([count, findMany])` con `include` y construye `meta` igual que `FeesService` (incluyendo `totalPages`, `hasNextPage`, `hasPreviousPage`).

### BE-11 — ClassesResolver + ClassesModule

Patrón idéntico a `TeachersResolver` / `TeachersModule`. Solo importa `AuthModule`.

### BE-12 — Registrar en AppModule

Agregar `ProgramsModule` y `ClassesModule` al array `imports` de `AppModule`.

---

## Verificación

1. **Migración**: `npx prisma studio` → confirmar tablas `programs` y `classes` con columnas y FK correctas.
2. **Languages query**: `{ languages { code label } }` → 5 items, sin consulta DB.
3. **createProgram**: crear un programa y verificar que se guarda con `academyId` correcto.
4. **createClass**: crear una clase con `programId` válido → debe retornar `program` y `teacher` anidados.
5. **Cross-tenant**: pasar `programId` de otra academia → debe lanzar `NotFoundException`.
6. **programs query**: `{ programs { language programs { id name } } }` → agrupado por idioma.
7. **classes query**: `{ classes(filter: { search: "Nivel", page: 1, limit: 5 }) { data { name program { name } teacher { firstName } } meta { total totalPages } } }`.
