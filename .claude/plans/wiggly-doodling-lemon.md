# Plan: PersonalInfo — Entidad compartida

## Context

Student, Teacher y FamilyGuardian comparten campos de identidad personal, pero están duplicados y desincronizados:

| Campo           | Student | Teacher | FamilyGuardian |
|-----------------|---------|---------|----------------|
| firstName       | ✅      | ✅      | ✅             |
| lastName        | ✅      | ✅      | ✅             |
| birthDate       | ❌      | ✅      | ✅             |
| documentType    | ❌      | ✅      | ✅             |
| documentNumber  | ❌      | ✅      | ✅             |

**Tutor** no existe como modelo — `TUTOR` es solo un valor del enum `GuardianRelationship` en FamilyGuardian.

---

## Opciones de diseño

### ❌ Opción A — Modelo Prisma `PersonalInfo` (relación)
Crear tabla `PersonalInfo` y que Student/Teacher/FamilyGuardian tengan un FK `personalInfoId`.

**Impacto: ALTO — rompe TODO**
- Migration compleja: hay que migrar datos existentes de firstName/lastName a la nueva tabla
- Todas las mutations de create/update cambian de estructura (input anidado)
- Todas las queries cambian de estructura (respuesta anidada con JOIN)
- No hay beneficio real: una PersonalInfo no se comparte entre entidades

### ✅ Opción B — Campos flat en Prisma + PersonalInfo como tipo GraphQL compartido
Mantener los campos directamente en cada modelo (Prisma plano), pero crear un `@ObjectType` y `@InputType` `PersonalInfo` en la capa GraphQL. Las entidades devuelven `personalInfo: PersonalInfo` como campo anidado, y los DTOs aceptan `personalInfo: PersonalInfoInput`.

**Impacto: MEDIO — rompe la forma de la API (breaking change para el frontend)**
- Migration solo para Student (additive: agregar birthDate, documentType, documentNumber)
- Queries cambian: `student.firstName` → `student.personalInfo.firstName`
- Mutations cambian: input ahora tiene `personalInfo: { firstName, ... }`
- Teacher y FamilyGuardian también se actualizan para ser consistentes
- Código DRY: un solo @ObjectType y @InputType compartido

### ✅ Opción C — Solo agregar campos faltantes a Student (mínimo impacto)
Agregar `birthDate`, `documentType`, `documentNumber` a Student en Prisma. No tocar Teacher ni FamilyGuardian. No crear tipo GraphQL compartido.

**Impacto: BAJO — zero breaking changes**
- Migration simple (additive, campos opcionales)
- Los campos existentes de Teacher y FamilyGuardian quedan intactos
- Se actualiza entity, DTOs y mapper de Student únicamente
- Los campos quedan duplicados a nivel código, pero cada modelo es independiente

---

## Recomendación

**Opción B** si el frontend puede absorber el breaking change (es el momento más barato para hacerlo).  
**Opción C** si no quieres tocar el frontend ahora y solo necesitas que Student tenga los campos.

---

## Plan de implementación (Opción B)

### 1. Crear tipos GraphQL compartidos
Nuevo módulo/directorio `src/common/personal-info/`:
- `personal-info.type.ts` — `@ObjectType() PersonalInfo`
- `personal-info.input.ts` — `@InputType() PersonalInfoInput`
- Campos: firstName, lastName, birthDate (DateTime, nullable), documentType (DocumentType enum, nullable), documentNumber (String, nullable)

### 2. Migración Prisma
Agregar a `Student` en `schema.prisma`:
```prisma
birthDate      DateTime?
documentType   DocumentType?
documentNumber String?
```
Ejecutar `npm run prisma:migrate`.

### 3. Actualizar módulo Student
- `src/students/entities/student.entity.ts` → agregar campo `personalInfo: PersonalInfo` (calculado)
- `src/students/dto/create-student.input.ts` → agregar campo `personalInfo: PersonalInfoInput`
- `src/students/dto/update-student.input.ts` → agregar campo `personalInfo?: PersonalInfoInput`
- `src/students/utils/student-mapper.util.ts` → mapear campos planos a objeto `personalInfo`
- `src/students/students.service.ts` → aplanar `personalInfo` al escribir en Prisma

### 4. Actualizar módulo Teacher
- Misma estructura: `personalInfo: PersonalInfo` en entity, `personalInfo: PersonalInfoInput` en DTOs
- El mapper mapea los campos existentes (birthDate, documentType, documentNumber) al objeto personalInfo

### 5. Actualizar módulo FamilyGuardian
- Idem, mapear los campos existentes al tipo compartido

### Archivos críticos
- `prisma/schema.prisma` (lines 137–162: Student model)
- `src/students/entities/student.entity.ts`
- `src/students/dto/create-student.input.ts`
- `src/students/dto/update-student.input.ts`
- `src/students/utils/student-mapper.util.ts`
- `src/students/students.service.ts`
- `src/teachers/entities/teacher.entity.ts`
- `src/teachers/dto/create-teacher.input.ts`
- `src/teachers/dto/update-teacher.input.ts`
- `src/teachers/utils/teacher-mapper.util.ts`
- `src/families/entities/family-guardian.entity.ts` (o equivalente)

### Verificación
1. `npm run prisma:migrate` sin errores
2. `npm run start:dev` compila sin errores TypeScript
3. Playground GraphQL: query de student devuelve `personalInfo { firstName lastName }`
4. Mutation `createStudent` acepta `personalInfo: { firstName, lastName }`
5. Mutation `createTeacher` acepta `personalInfo: { firstName, lastName, birthDate, documentType, documentNumber }`
