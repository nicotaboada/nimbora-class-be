# Plan: Información de Contacto Extendida (Teacher)

## Contexto

El Teacher tiene actualmente solo `email` y `phoneNumber` como campos planos. Se quiere expandir la información de contacto con: desglose del teléfono (código de país + número), dirección, país, estado/provincia, ciudad y código postal. La entidad `ContactInfo` se diseña separada del Teacher para ser reutilizada por Student, padres, etc. en el futuro.

---

## Arquitectura

### Decisión clave: entidad separada con FK opcional

Modelo `ContactInfo` con `teacherId?` (y en el futuro `studentId?`). Sigue el mismo patrón que `BillingProfile` ya existente en el proyecto.

El campo `email` y `phoneNumber` del Teacher se migran a `ContactInfo` (arquitectura limpia). Exige migración de datos Prisma.

### Librerías a instalar (Frontend)

- `libphonenumber-js` — solo lógica: parseo, validación y formateo de números. Sin UI propia.
- `@tanstack/react-query` — caching y estado de APIs REST (GeoNames)

---

## Backend

### BE-1: Actualizar `prisma/schema.prisma`

Agregar modelo `ContactInfo` y relación inversa en `Teacher`:

```prisma
model ContactInfo {
  id               String   @id @default(uuid())

  teacherId        String?  @unique
  teacher          Teacher? @relation(fields: [teacherId], references: [id], onDelete: Cascade)

  email            String?
  phoneCountryCode String?  // "+54"
  phoneNumber      String?  // "1112345678"

  address          String?
  country          String?  // código ISO "AR"
  state            String?  // "Buenos Aires"
  city             String?
  postalCode       String?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([teacherId])
}
```

En `Teacher`, agregar relación y eliminar `email` y `phoneNumber`:
```prisma
model Teacher {
  // ...campos existentes...
  // Eliminar: email String?, phoneNumber String?
  contactInfo ContactInfo?
}
```

### BE-2: Migración Prisma

```bash
cd be
npx prisma migrate dev --name add-contact-info-table
```

Nota: Si hay datos en email/phoneNumber de Teachers, la migración debe incluir un script de seed para mover esos datos a ContactInfo (o hacerlo manualmente).

### BE-3: Crear `be/src/contact-info/entities/contact-info.entity.ts`

```ts
@ObjectType()
export class ContactInfo {
  @Field() id: string
  @Field({ nullable: true }) email?: string
  @Field({ nullable: true }) phoneCountryCode?: string
  @Field({ nullable: true }) phoneNumber?: string
  @Field({ nullable: true }) address?: string
  @Field({ nullable: true }) country?: string
  @Field({ nullable: true }) state?: string
  @Field({ nullable: true }) city?: string
  @Field({ nullable: true }) postalCode?: string
  @Field() createdAt: Date
  @Field() updatedAt: Date
}
```

### BE-4: Crear `be/src/contact-info/dto/update-contact-info.input.ts`

```ts
@InputType()
export class UpdateContactInfoInput {
  @Field() teacherId: string
  @IsOptional() @IsEmail() @Field({ nullable: true }) email?: string
  @IsOptional() @Field({ nullable: true }) phoneCountryCode?: string
  @IsOptional() @Field({ nullable: true }) phoneNumber?: string
  @IsOptional() @Field({ nullable: true }) address?: string
  @IsOptional() @Field({ nullable: true }) country?: string
  @IsOptional() @Field({ nullable: true }) state?: string
  @IsOptional() @Field({ nullable: true }) city?: string
  @IsOptional() @Field({ nullable: true }) postalCode?: string
}
```

### BE-5: Actualizar `be/src/teachers/entities/teacher.entity.ts`

- Eliminar campos `email` y `phoneNumber` del `@ObjectType()`
- Agregar `@Field(() => ContactInfo, { nullable: true }) contactInfo?: ContactInfoEntity`

### BE-6: Actualizar `be/src/teachers/teachers.service.ts`

Agregar método `updateContactInfo`:

```ts
async updateContactInfo(input: UpdateContactInfoInput, academyId: string): Promise<Teacher> {
  const { teacherId, ...data } = input
  const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId } })
  assertOwnership(teacher, academyId, 'Teacher')

  await this.prisma.contactInfo.upsert({
    where: { teacherId },
    update: data,
    create: { teacherId, ...data },
  })

  const updated = await this.prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { contactInfo: true },
  })
  return mapTeacherToEntity(updated)
}
```

También actualizar `findOne` y `findAll` para incluir `contactInfo: true` en los queries.

### BE-7: Actualizar `be/src/teachers/teachers.resolver.ts`

Agregar mutation:

```ts
@Mutation(() => Teacher)
updateTeacherContactInfo(@Args('input') input: UpdateContactInfoInput, @CurrentAcademy() academyId: string) {
  return this.teachersService.updateContactInfo(input, academyId)
}
```

### BE-8: Actualizar `be/src/teachers/utils/teacher-mapper.util.ts`

Incluir mapeo del `contactInfo` anidado en la función `mapTeacherToEntity`.

---

## Frontend

### FE-1: Instalar librerías

```bash
cd web
pnpm add libphonenumber-js @tanstack/react-query
```

### FE-1.5: Crear servicio de GeoNames

**`lib/services/geonames.service.ts`**: Funciones para llamar a la API de GeoNames:

```ts
const GEONAMES_USERNAME = process.env.NEXT_PUBLIC_GEONAMES_USERNAME

export async function getCountries() {
  const res = await fetch(
    `https://www.geonames.org/childrenJSON?geonameId=6295630&username=${GEONAMES_USERNAME}`
  )
  const data = await res.json()
  return data.geonames.map((country) => ({
    value: country.countryCode,
    label: country.name,
    code: country.countryCode,
  }))
}

export async function getStates(countryCode: string) {
  // Buscar el geonameId del país primero, luego obtener sus hijos (states)
  const res = await fetch(
    `https://www.geonames.org/searchJSON?type=json&featureCode=PCLI&countryCode=${countryCode}&username=${GEONAMES_USERNAME}`
  )
  const data = await res.json()
  const countryGeoId = data.geonames[0]?.geonameId
  
  if (!countryGeoId) return []
  
  const statesRes = await fetch(
    `https://www.geonames.org/childrenJSON?geonameId=${countryGeoId}&username=${GEONAMES_USERNAME}`
  )
  const statesData = await statesRes.json()
  return statesData.geonames.map((state) => ({
    value: state.geonameId,
    label: state.name,
    code: state.geonameId,
  }))
}

export async function getCities(countryCode: string, stateGeonameId: number) {
  const res = await fetch(
    `https://www.geonames.org/childrenJSON?geonameId=${stateGeonameId}&username=${GEONAMES_USERNAME}`
  )
  const data = await res.json()
  return data.geonames
    .filter((city) => city.featureCode === 'PPL' || city.featureCode === 'PPLA')
    .map((city) => ({
      value: city.name,
      label: city.name,
    }))
}
```

### FE-1.6: Crear hooks de React Query

**`modules/teachers/hooks/use-geonames.ts`**:

```ts
import { useQuery } from '@tanstack/react-query'
import { getCountries, getStates, getCities } from 'lib/services/geonames.service'

export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: getCountries,
    staleTime: Infinity, // Nunca se vuelve stale (países no cambian)
  })
}

export function useStates(countryCode: string | undefined) {
  return useQuery({
    queryKey: ['states', countryCode],
    queryFn: () => getStates(countryCode!),
    enabled: !!countryCode, // Solo fetchear si hay countryCode
    staleTime: Infinity,
  })
}

export function useCities(countryCode: string | undefined, stateGeonameId: number | undefined) {
  return useQuery({
    queryKey: ['cities', countryCode, stateGeonameId],
    queryFn: () => getCities(countryCode!, stateGeonameId!),
    enabled: !!countryCode && !!stateGeonameId,
    staleTime: Infinity,
  })
}
```

### FE-2: Crear componente `components/common/phone-input/phone-input.tsx`

Componente reutilizable construido con Radix Select (misma UI/estilo que todos los selects del proyecto):
- Un `Select` de Radix para el código de país (bandera emoji + código, ej: 🇦🇷 +54)
- Un `Input` de Radix para el número
- Prop `value: { countryCode: string; number: string }` o un string E.164 que se parsea con `libphonenumber-js`
- Prop `onChange`
- El trigger del Select tiene el mismo aspecto que los demás selects del proyecto
- Nota: los países se muestran con bandera emoji hardcodeados en el componente (no vienen de GeoNames, porque GeoNames es para ciudades/estados)

### FE-3: Crear componente `components/ui/select-searchable.tsx`

Select de Radix mejorado con búsqueda/filtro integrado:
- Extiende el `Select` normal de Radix
- Al escribir en el trigger, filtra las opciones con `useMemo`
- Props: `value`, `onChange`, `options: { value, label }[]`, `placeholder`, `isLoading`, `disabled`
- Compatible con `FormField` de React Hook Form
- Renderiza loading state si está fetching

### FE-4: Crear componentes geo en `components/common/geo/`

**`country-select.tsx`**: Select de países con búsqueda:
- Usa el hook `useCountries()` para fetchear y cachear la lista
- Muestra bandera emoji + nombre
- Props: `value` (country code), `onChange`, `disabled`
- Usa el `SelectSearchable` de FE-3 internamente
- Se precarga cuando el sheet se abre (React Query automáticamente cachea)

**`state-select.tsx`**: Select de estados/provincias dependiente de país:
- Prop `countryCode` — cuando cambia, el hook `useStates()` automáticamente hace fetch
- Cuando `countryCode` cambia: resetear valor con `form.setValue('state', '')`
- Label en UI: "Provincia / Estado"
- Usa el `SelectSearchable` de FE-3 internamente
- Muestra loading mientras fetchea

**`city-select.tsx`**: Select de ciudades dependiente de estado:
- Prop `stateGeonameId` — cuando cambia, el hook `useCities()` automáticamente hace fetch
- Cuando `stateGeonameId` cambia: resetear valor con `form.setValue('city', '')`
- Usa el `SelectSearchable` de FE-3 internamente
- Muestra loading mientras fetchea

### FE-5: Crear `.env.local` con credenciales de GeoNames

```
NEXT_PUBLIC_GEONAMES_USERNAME=tu_username_aqui
```

Obtener username registrándose en https://www.geonames.org/login (gratis, sin API key necesaria)

### FE-6: Actualizar `web/modules/teachers/types/teacher.ts`

Agregar interface `ContactInfo`:
```ts
export interface ContactInfo {
  id: string
  email?: string
  phoneCountryCode?: string
  phoneNumber?: string
  address?: string
  country?: string
  state?: string
  city?: string
  postalCode?: string
}
```

Actualizar `Teacher` para reemplazar campos planos con la relación:
```ts
export interface Teacher {
  // Eliminar: email?: string, phoneNumber?: string
  contactInfo?: ContactInfo
  // ...resto igual
}
```

Actualizar `UpdateTeacherContactInfoInput` y `updateTeacherContactInfoSchema` con los nuevos campos. Validaciones:
- `email`: `z.string().email().min(1, 'Requerido')`
- `phoneNumber`: `z.string().regex(/^\d*$/).optional()`
- `postalCode`: `z.string().regex(/^\d*$/).optional()`
- El resto: `z.string().optional()`

### FE-7: Agregar mutation en `web/modules/teachers/graphql/mutations.ts`

```ts
export const UPDATE_TEACHER_CONTACT_INFO = gql`
  mutation UpdateTeacherContactInfo($input: UpdateContactInfoInput!) {
    updateTeacherContactInfo(input: $input) {
      id
      contactInfo {
        id email phoneCountryCode phoneNumber
        address country state city postalCode
      }
    }
  }
`
```

### FE-8: Actualizar query `GET_TEACHER` en `web/modules/teachers/graphql/queries.ts`

Incluir `contactInfo { ... }` en el fragmento del teacher.

### FE-9: Crear hook `web/modules/teachers/hooks/use-update-teacher-contact-info.ts`

Sigue el patrón de `use-toggle-teacher-status.ts`:
- `useMutation(UPDATE_TEACHER_CONTACT_INFO)`
- `refetchQueries: [{ query: GET_TEACHER, variables: { id: teacherId } }]`
- `onCompleted`: `toast.success`
- `onError`: `toast.error`

### FE-10: Actualizar `web/modules/teachers/components/teacher-contact-info-sheet.tsx`

Expandir el formulario existente con los campos nuevos:

```
Email (requerido)           [Input]
───── Teléfono ─────
  País [PhoneInput Select]   Número [Input]
───── Ubicación ─────
  Dirección                   [Input]
  País                        [CountrySelect] ← precargado al abrir, con búsqueda
  Provincia/Estado            [StateSelect] ← dependiente del país, loading while fetching
  Ciudad                      [CitySelect] ← dependiente del estado, loading while fetching
  Código Postal               [Input numérico]
```

Notas de implementación del sheet:
- Sheet se abre → `useCountries()` automáticamente fetchea y cachea (primera vez) o reutiliza cache
- `defaultValues` lee de `teacher.contactInfo`
- `handleSubmit` invoca el hook `useUpdateTeacherContactInfo`
- Cuando `country` cambia: resetear `state` y `city` con `form.setValue()`
- Cuando `state` cambia: resetear `city`
- Selects muestran loading state mientras fetchean con React Query

### FE-11: Actualizar `web/modules/teachers/components/teacher-contact-info-card.tsx`

Expandir la card para mostrar los campos nuevos:

```
Email | Teléfono (formateado: +54 11 1234-5678)
País  | Provincia
Ciudad | Código Postal
Dirección (ancho completo si existe)
```

Reemplazar referencias a `teacher.email` y `teacher.phoneNumber` por `teacher.contactInfo?.email`, etc.

---

## Archivos críticos a modificar

| Archivo | Cambio |
|---|---|
| `be/prisma/schema.prisma` | Nuevo modelo ContactInfo + relación en Teacher |
| `be/src/teachers/entities/teacher.entity.ts` | Agregar campo contactInfo |
| `be/src/teachers/teachers.service.ts` | Método updateContactInfo + include contactInfo en queries |
| `be/src/teachers/teachers.resolver.ts` | Mutation updateTeacherContactInfo |
| `be/src/teachers/utils/teacher-mapper.util.ts` | Incluir contactInfo en mapeo |
| `web/modules/teachers/types/teacher.ts` | Interface ContactInfo + schema Zod actualizado |
| `web/modules/teachers/graphql/mutations.ts` | Mutation UPDATE_TEACHER_CONTACT_INFO |
| `web/modules/teachers/graphql/queries.ts` | Incluir contactInfo en GET_TEACHER |
| `web/modules/teachers/components/teacher-contact-info-sheet.tsx` | Formulario expandido + mutation conectada |
| `web/modules/teachers/components/teacher-contact-info-card.tsx` | Mostrar campos nuevos |
| `lib/services/geonames.service.ts` | **NUEVO** — Llamadas a API de GeoNames |
| `web/modules/teachers/hooks/use-geonames.ts` | **NUEVO** — Hooks de React Query para countries, states, cities |
| `web/components/ui/select-searchable.tsx` | **NUEVO** — Select de Radix con búsqueda integrada |
| `web/components/common/phone-input/phone-input.tsx` | **NUEVO** — Radix Select para país + Input para número |
| `web/components/common/geo/country-select.tsx` | **NUEVO** — Usa useCountries() |
| `web/components/common/geo/state-select.tsx` | **NUEVO** — Usa useStates() |
| `web/components/common/geo/city-select.tsx` | **NUEVO** — Usa useCities() |

---

## Verificación

1. **Backend**: Levantar el servidor, ejecutar `updateTeacherContactInfo` en el GraphQL playground con un teacher existente
2. **GeoNames**: Registrarse en https://www.geonames.org/login, habilitar API, copiar username al `.env.local`
3. **Frontend**: Abrir la página de detalle de un teacher → click en el lápiz de "Información de Contacto"
   - Verificar que al abrir el sheet, el Select de Países ya está cargado (primera carga puede tomar 1-2s)
   - Seleccionar "Argentina" → verificar que automáticamente se carga la lista de provincias
   - Seleccionar "Buenos Aires" → verificar que se carga la lista de ciudades
   - Completar todos los campos → guardar
   - Verificar que la card se actualiza con los nuevos datos
4. **Caching**: Abrir el sheet de nuevo → los datos deben cargarse al instante (sin latencia)
5. **Validación**: Intentar guardar sin email → debe mostrar error. Email inválido → debe mostrar error.
