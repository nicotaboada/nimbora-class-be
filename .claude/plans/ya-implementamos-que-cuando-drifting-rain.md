# BillingProfile y fiscalización AFIP alineados al recipient de la Invoice

## Context

Recientemente se implementó que las Invoices internas de un student con familia se emiten al **guardian responsable** (`FamilyGuardian.isResponsibleForBilling = true`) — se capturan `recipientName/Email/Phone/Address` como snapshot sobre la Invoice.

El problema actual: el flujo de fiscalización AFIP ([bulk-create-afip-invoices.ts:142-148](src/trigger/bulk-create-afip-invoices.ts#L142-L148)) lee `invoice.billingProfile` directamente, pero:

1. [bulk-create-invoices.ts](src/trigger/bulk-create-invoices.ts) **nunca asigna** `billingProfileId` → siempre es `null`.
2. [BillingProfile](prisma/schema.prisma#L738-L775) vive solo en `Student` (`studentId?`). No hay forma de representar los datos fiscales del guardian.

Resultado: **toda factura AFIP emitida hoy cae a Consumidor Final** aunque el student tenga profile de RI/Mono, o aunque el guardian tenga DNI/CUIT cargado. Riesgo fiscal real.

**Objetivo:** alinear el receptor fiscal AFIP con el recipient interno de la Invoice (si internamente se facturó al padre, AFIP también), sin obligar a cargar un BillingProfile formal cuando el DNI inline del guardian ya alcanza.

---

## Decisiones de diseño

### Separación de dominio vs fiscalidad (razón estratégica: LATAM)

Se mantiene `BillingProfile` como modelo separado, **no** se inlinean campos fiscales en `Student`/`FamilyGuardian`. Motivo: el modelo fiscal es específico de cada país (AR: CUIT + condición IVA, CL: RUT, MX: RFC + régimen CFDI, etc.). Mezclar eso con el dominio rompe la portabilidad a LATAM.

- `Student` / `FamilyGuardian` = dominio universal. `documentType`/`documentNumber` queda porque es identificación personal, no fiscalidad.
- `BillingProfile` = modelo fiscal. Todo lo argentino-específico (CUIT, RI/Mono/CF, razón social, domicilio fiscal) vive acá. A futuro se extiende por país sin tocar dominio.

### Decisiones

1. **BillingProfile polimórfico**: agregar `guardianId?` junto a `studentId?`. Constraint: exactamente uno de los dos seteado. Cuando un student pertenece a una familia, el profile que cuenta es el del guardian responsable (menores no necesitan profile propio).

2. **BillingProfile es opt-in**: la mayoría de las academias no lo cargan. Con `documentType` + `documentNumber` inline en Student/Guardian alcanza para emitir Factura B/C identificada (90% de los casos). El BillingProfile se usa solo para:
   - Emitir Factura A (necesita `taxCondition` = RI/Mono + CUIT)
   - Facturar a una empresa (razón social distinta del contacto)

3. **Resolución on-the-fly al emitir AFIP** (no snapshot en Invoice): Invoice no guarda `billingProfileId`. La resolución fiscal se hace en `bulk-create-afip-invoices.ts` usando `invoice.familyId` / `invoice.studentId`. Una sola fuente de verdad: el profile/docs actual del guardian/student al momento de emitir.

4. **Fallback chain al emitir AFIP** (en orden):
   - a. BillingProfile del receptor (guardian responsable si hay familyId, student si no) → habilita Factura A.
   - b. `documentType` + `documentNumber` inline del receptor → profile virtual Consumidor Final con DNI/CUIT → Factura B/C identificada.
   - c. Sin nada → Consumidor Final puro (docTipo=99, docNro=0) → Factura B/C sin identificación (comportamiento actual).

5. **UI** (solo se documenta, el cambio es backend-first): la academia nunca ve "BillingProfile" como concepto. El drawer "Datos fiscales" del student muestra:
   - Readonly: "Se facturará a [Padre responsable / Alumno]" con su DNI.
   - Toggle "Es empresa / Necesita Factura A" que expande un form con CUIT + condición fiscal + razón social. Guardar crea/actualiza un BillingProfile atrás de escena.
   - Si el student tiene familia, la edición fiscal se hace sobre el guardian, no el student.

6. **Migración**: mover BillingProfiles existentes de students con familia → FamilyGuardian responsable.

---

## Cambios de schema

**Archivo:** [prisma/schema.prisma](prisma/schema.prisma)

### `BillingProfile` (líneas 738-775)
```prisma
model BillingProfile {
  id         String  @id @default(cuid())
  academyId  String

  // Owner polimórfico: exactamente uno
  studentId  String?
  guardianId String?
  student    Student?        @relation(fields: [studentId],  references: [id], onDelete: Cascade)
  guardian   FamilyGuardian? @relation(fields: [guardianId], references: [id], onDelete: Cascade)

  // ... resto igual

  @@index([guardianId])
  // Constraint nivel DB para "uno de los dos":
  // Postgres CHECK constraint via migration raw SQL:
  //   CHECK ((studentId IS NOT NULL)::int + (guardianId IS NOT NULL)::int = 1)
}
```

### `FamilyGuardian` (líneas 255-293)
Agregar relación inversa:
```prisma
billingProfiles BillingProfile[]
```

### Migración SQL

```sql
ALTER TABLE "BillingProfile" ADD COLUMN "guardianId" TEXT;
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_guardianId_fkey"
  FOREIGN KEY ("guardianId") REFERENCES "FamilyGuardian"("id") ON DELETE CASCADE;
ALTER TABLE "BillingProfile" ALTER COLUMN "studentId" DROP NOT NULL;
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_owner_xor"
  CHECK ((("studentId" IS NOT NULL)::int + ("guardianId" IS NOT NULL)::int) = 1);
CREATE INDEX "BillingProfile_guardianId_idx" ON "BillingProfile"("guardianId");
```

### Data migration (en la misma migration, después del ALTER)

```sql
-- Para cada BillingProfile de un student que pertenece a una familia,
-- mover al guardian responsable de esa familia (o al primer guardian si no hay uno marcado).
UPDATE "BillingProfile" bp
SET "guardianId" = COALESCE(
    (SELECT g.id FROM "FamilyGuardian" g
     JOIN "Student" s ON s."familyId" = g."familyId"
     WHERE s.id = bp."studentId" AND g."isResponsibleForBilling" = true
     LIMIT 1),
    (SELECT g.id FROM "FamilyGuardian" g
     JOIN "Student" s ON s."familyId" = g."familyId"
     WHERE s.id = bp."studentId"
     ORDER BY g."createdAt" ASC
     LIMIT 1)
  ),
  "studentId" = NULL
WHERE bp."studentId" IN (SELECT id FROM "Student" WHERE "familyId" IS NOT NULL);
```

---

## Cambios de backend

### 1. Resolución fiscal on-the-fly

**Archivo nuevo:** [src/afip/utils/resolve-fiscal-recipient.util.ts](src/afip/utils/resolve-fiscal-recipient.util.ts)

Función pura que recibe `invoice` (con student, family, billingProfiles ya cargados) y devuelve:
```ts
{
  taxCondition: BillingTaxCondition;
  docType: BillingDocType;
  docNumber: string | null;
  displayName: string;
}
```

Lógica (fallback chain):
```
1. Si invoice.familyId:
   guardian = family.guardians.find(g => isResponsibleForBilling) ?? guardians[0]
   profile = guardian.billingProfiles.find(isDefault) ?? billingProfiles[0]
   if (profile) return from profile
   if (guardian.documentType && guardian.documentNumber)
     return { CONSUMIDOR_FINAL, guardian.documentType, guardian.documentNumber, ... }

2. Si invoice.studentId (sin familia o como fallback):
   profile = student.billingProfiles.find(isDefault) ?? billingProfiles[0]
   if (profile) return from profile
   // Student no tiene documentType inline hoy, solo BillingProfile

3. Fallback final:
   return { CONSUMIDOR_FINAL, CONSUMIDOR_FINAL, null, invoice.recipientName }
```

### 2. Integración en bulk-create-afip-invoices

**Archivo:** [src/trigger/bulk-create-afip-invoices.ts](src/trigger/bulk-create-afip-invoices.ts) (líneas 102-283)

Cambios:

a. **Include expandido** (líneas 112-116) — cargar relaciones necesarias:
```ts
const invoice = await prisma.invoice.findUnique({
  where: { id: invoiceId },
  include: {
    billingProfile: true, // mantener por compat
    student: { include: { billingProfiles: true } },
    family: {
      include: {
        guardians: {
          include: { billingProfiles: true },
        },
      },
    },
  },
});
```

b. **Reemplazar bloque 142-148** por:
```ts
const fiscal = resolveFiscalRecipient(invoice);
const recipientTaxCondition = fiscal.taxCondition;
const docType               = fiscal.docType;
const docNumber             = fiscal.docNumber;
```

c. El resto del flujo (`resolveCbteTipo`, emisión, snapshot al `AfipInvoice`) no cambia. El snapshot en `AfipInvoice.docType/docNumber/taxCondition/recipientName` ya existe y sigue siendo correcto — capturamos lo que se emitió realmente.

### 3. Bulk-create-invoices — **sin cambios**

[bulk-create-invoices.ts](src/trigger/bulk-create-invoices.ts) y [bulk-create-family-invoices.ts](src/trigger/bulk-create-family-invoices.ts) no tocan `billingProfileId`. La Invoice interna solo tiene `studentId`/`familyId` + snapshots de contacto. El link fiscal se deriva al emitir AFIP.

> Nota: Podemos deprecar `Invoice.billingProfileId` en un paso posterior si queda huérfano; por ahora se deja para no romper compat.

### 4. BillingProfile service & resolver

**Archivo:** [src/billing-profiles/billing-profiles.service.ts](src/billing-profiles/billing-profiles.service.ts)

Agregar métodos paralelos a los existentes:
- `upsertForGuardian(guardianId, input, academyId)`
- `findByGuardian(guardianId, academyId)`
- Validar ownership: el guardian debe pertenecer a la academia.

DTOs nuevos:
- `UpsertGuardianBillingProfileInput` (similar al existente para student, con `guardianId` en vez de `studentId`).

Resolver: agregar mutations/queries correspondientes (`upsertGuardianBillingProfile`, `guardianBillingProfiles`).

### 5. Entity `BillingProfile`

**Archivo:** [src/billing-profiles/entities/billing-profile.entity.ts](src/billing-profiles/entities/billing-profile.entity.ts)

- Hacer `studentId` nullable en la entity GraphQL.
- Agregar `guardianId?: string` como `@Field({ nullable: true })`.

### 6. Regla de negocio: student con familia no debe aceptar billingProfile nuevo

**Archivo:** [src/billing-profiles/billing-profiles.service.ts](src/billing-profiles/billing-profiles.service.ts) — método `upsert` (líneas 15-34).

Agregar validación:
```ts
const student = await this.prisma.student.findUnique({
  where: { id: studentId },
  select: { familyId: true },
});
if (student?.familyId) {
  throw new BadRequestException(
    "Student pertenece a una familia. Configurar el perfil fiscal en el guardian responsable."
  );
}
```

---

## Archivos críticos a modificar

| Archivo | Cambio |
|---|---|
| [prisma/schema.prisma](prisma/schema.prisma#L738-L775) | Agregar `guardianId?` a BillingProfile + relación inversa en FamilyGuardian |
| `prisma/migrations/.../migration.sql` (nuevo) | ALTER + CHECK constraint + data migration SQL |
| [src/afip/utils/resolve-fiscal-recipient.util.ts](src/afip/utils/resolve-fiscal-recipient.util.ts) | **NUEVO** — fallback chain |
| [src/trigger/bulk-create-afip-invoices.ts](src/trigger/bulk-create-afip-invoices.ts#L102-L283) | Expandir include + reemplazar líneas 142-148 |
| [src/billing-profiles/billing-profiles.service.ts](src/billing-profiles/billing-profiles.service.ts) | `upsertForGuardian`, `findByGuardian`, bloquear upsert a student-con-familia |
| [src/billing-profiles/billing-profiles.resolver.ts](src/billing-profiles/billing-profiles.resolver.ts) | Nuevas mutations/queries para guardian |
| [src/billing-profiles/entities/billing-profile.entity.ts](src/billing-profiles/entities/billing-profile.entity.ts) | `studentId` nullable + `guardianId?` field |
| [src/billing-profiles/dto/](src/billing-profiles/dto/) | Nuevo `UpsertGuardianBillingProfileInput` |

---

## Utilities y patterns existentes a reutilizar

- [resolveCbteTipo / resolveDocTipo / resolveCondicionIvaReceptor](src/afip/utils/resolve-cbte-tipo.ts) — sin cambios, siguen recibiendo `taxCondition` y `docType`.
- Resolución de guardian responsable: misma lógica que [bulk-create-invoices.ts:128-138](src/trigger/bulk-create-invoices.ts#L128-L138) y [bulk-create-family-invoices.ts:157-174](src/trigger/bulk-create-family-invoices.ts#L157-L174) — extraer a helper compartido `src/families/utils/resolve-billing-guardian.util.ts` y reutilizar en ambos flows.
- [assertOwnership](src/common/utils/) para validar academyId al resolver profiles de guardian.
- Snapshot en `AfipInvoice` (líneas 188-198 de bulk-create-afip-invoices.ts) — sin cambios.

---

## Verificación

### Migración
1. `npm run prisma:migrate` en entorno de dev con data de prueba.
2. Validar que BillingProfiles de students con familia fueron movidos al guardian correcto:
   ```sql
   SELECT bp.id, bp."studentId", bp."guardianId", s."familyId"
   FROM "BillingProfile" bp
   LEFT JOIN "Student" s ON s.id = bp."studentId";
   ```
   Esperado: `studentId IS NULL AND guardianId IS NOT NULL` para todos los que originalmente pertenecían a students con familia.
3. CHECK constraint: intentar insertar row con ambos seteados o ninguno → debe fallar.

### Flujo AFIP end-to-end (en HOMO)
Crear 4 escenarios de test:

1. **Student sin familia, sin BillingProfile, sin DNI inline** → debe emitir Factura B Consumidor Final (docTipo=99).
2. **Student sin familia, BillingProfile RI con CUIT** → Factura A.
3. **Student con familia, guardian responsable con BillingProfile Mono + CUIT** → Factura A al guardian.
4. **Student con familia, guardian responsable con solo DNI inline (sin BillingProfile)** → Factura B con DNI del guardian (docTipo=96).

Para cada uno:
- Crear charges con `POST /graphql` → `bulkCreateInvoices`.
- Emitir AFIP con `bulkCreateAfipInvoices`.
- Verificar `AfipInvoice.docType`, `docNumber`, `taxCondition`, `cbteTipo` contra lo esperado.

### Tests unitarios
- `resolve-fiscal-recipient.util.spec.ts` — cubrir las 4 ramas del fallback chain + edge cases (familia sin guardian, guardian sin profile ni DNI).
- `billing-profiles.service.spec.ts` — validar que `upsert` para student-con-familia lanza `BadRequestException`.

### Smoke test
- `npm run build` — type-check del diff de schema.
- `npm run test` — suite completa.

---

## Fuera de scope (siguiente iteración)

- Cambios de UI (bloquear selector del drawer cuando hay familia) — se coordina con el repo `web` separadamente.
- Deprecar `Invoice.billingProfileId` — ya queda huérfano después de este cambio, pero lo dejamos para no tocar más superficie en esta iteración.
- Soporte "Empresa / Factura A" custom en students sin familia (tercera opción del screenshot): ya queda habilitado naturalmente creando un BillingProfile RI con el CUIT de la empresa en el student.
