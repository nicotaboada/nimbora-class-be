# Plan: Módulo Familias — Schema Prisma

## Context

Se necesita un nuevo módulo de Familias para agrupar guardianes (tutores/padres) con estudiantes. Una familia es la unidad raíz que vincula múltiples guardianes y estudiantes bajo un nombre común, con notas y etiquetas. Este plan cubre solo el schema Prisma (primera fase).

---

## Decisiones de diseño

| Pregunta | Decisión | Razón |
|---|---|---|
| Contacto del guardián | Campos embebidos flat en `FamilyGuardian` | La alternativa correcta sería una entidad `Person` genérica con `ContactInfo`, pero es un refactor grande que involucra Teacher + Student. Se deja para después. |
| Tags | `String[]` en `Family` + GIN index manual | Son labels simples, no entidades; no necesitan normalización |
| Enum de relación guardián | Nuevo enum `GuardianRelationship` | Semánticamente distinto al enum de relación estudiante |
| Enum de relación estudiante | Nuevo enum `FamilyStudentRelationship` | Conjunto diferente de valores (HIJO/HIJA vs PADRE/MADRE) |
| Link directo guardián→estudiante | No modelado (inferido vía Family) | Prematuro; un pivot de 3 vías puede agregarse después si se necesita |
| `academyId` en tablas pivot | Sí en todas | Consistente con el codebase; permite queries scoped sin joins |
| `status` en Family | Sí (`Status` enum existente) | Las familias pueden archivarse como unidad |

---

## Nuevos Enums (agregar en la sección de enums del schema)

```prisma
enum GuardianRelationship {
  PADRE
  MADRE
  ABUELO
  ABUELA
  TIO
  TIA
  TUTOR
  OTRO
}
```

---

## Nuevos Modelos

### `Family`
```prisma
model Family {
  id        String   @id @default(uuid())
  academyId String
  academy   Academy  @relation(fields: [academyId], references: [id])

  name      String
  tags      String[]
  status    Status   @default(ENABLED)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  guardians FamilyGuardian[]
  students  FamilyStudent[]

  @@index([academyId])
  // NOTA: Agregar GIN index manualmente en migration SQL:
  // CREATE INDEX "Family_tags_idx" ON "Family" USING GIN ("tags");
}
```

### `FamilyGuardian`
```prisma
model FamilyGuardian {
  id               String               @id @default(uuid())
  academyId        String
  academy          Academy              @relation(fields: [academyId], references: [id])

  familyId         String
  family           Family               @relation(fields: [familyId], references: [id], onDelete: Cascade)

  // Información personal
  firstName        String
  lastName         String
  relationship     GuardianRelationship
  birthDate        DateTime?
  documentType     DocumentType?
  documentNumber   String?

  // Información de contacto (embebida flat)
  email            String?
  phoneCountryCode String?
  phoneNumber      String?
  address          String?
  city             String?
  state            String?
  country          String?
  postalCode       String?

  // Preferencias
  emailNotifications Boolean @default(true)
  status             Status  @default(ENABLED)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([familyId])
  @@index([academyId])
}
```

### `FamilyStudent` (pivot)
```prisma
model FamilyStudent {
  id        String  @id @default(uuid())
  academyId String
  academy   Academy @relation(fields: [academyId], references: [id])

  familyId  String
  family    Family  @relation(fields: [familyId], references: [id], onDelete: Cascade)

  studentId String
  student   Student @relation(fields: [studentId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([familyId, studentId])
  @@index([familyId])
  @@index([studentId])
  @@index([academyId])
}
```

---

## Back-relations en modelos existentes

### En `Academy`:
```prisma
families        Family[]
familyGuardians FamilyGuardian[]
familyStudents  FamilyStudent[]
```

### En `Student`:
```prisma
families FamilyStudent[]
```

---

## Archivos a modificar

- `prisma/schema.prisma` — agregar enums + modelos + back-relations

---

## Verificación

1. `npm run prisma:generate` — debe compilar sin errores
2. `npm run prisma:migrate` — crea la migración y la aplica
3. Agregar manualmente en el SQL de la migración generada:
   ```sql
   CREATE INDEX "Family_tags_idx" ON "Family" USING GIN ("tags");
   ```
4. `npm run prisma:studio` — verificar que las tablas existen con los campos correctos
