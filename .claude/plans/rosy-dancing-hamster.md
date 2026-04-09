# Fix: Alinear implementación de avatar del guardian al patrón del teacher

## Context

La página de detalle de tutor (`/families/[familyId]/tutors/[tutorId]`) muestra un avatar de solo iniciales sin posibilidad de subir foto. El módulo de profesores ya tiene este flujo implementado completo (`AvatarUploaderDialog` + hook + hover overlay). El objetivo es replicar ese mismo patrón para guardianes.

El modelo `FamilyGuardian` en Prisma **no tiene** campo `avatarUrl` todavía. Tampoco está expuesto en la entidad GraphQL ni en el mapper.

---

## Cambios necesarios

### 1. Backend — Agregar `avatarUrl` al modelo `FamilyGuardian`

**`be/prisma/schema.prisma`** — agregar campo después de `emailNotifications`:
```prisma
avatarUrl          String?
```

Luego correr migración:
```bash
npm run prisma:migrate
# nombre sugerido: add_avatar_url_to_family_guardian
```

**`be/src/families/entities/guardian.entity.ts`** — agregar campo:
```ts
@Field({ nullable: true })
avatarUrl?: string;
```

**`be/src/families/dto/update-guardian.input.ts`** — agregar campo opcional:
```ts
@Field({ nullable: true })
@IsOptional()
@IsString()
avatarUrl?: string;
```

**`be/src/families/utils/guardian-mapper.util.ts`** — agregar al objeto retornado:
```ts
avatarUrl: prismaGuardian.avatarUrl ?? undefined,
```
(El tipo Prisma ya lo tendrá tras la migración y `prisma:generate`.)

### 2. Frontend — Tipos y Query

**`web/modules/families/types/index.ts`** — agregar a `GuardianDetail`:
```ts
avatarUrl?: string | null
```

**`web/modules/families/graphql/queries.ts`** — agregar en `GET_GUARDIAN`:
```graphql
avatarUrl
```

### 3. Frontend — Mutation para actualizar avatar

**`web/modules/families/graphql/mutations.ts`** — agregar nueva mutation:
```graphql
export const UPDATE_GUARDIAN_AVATAR = gql`
  mutation UpdateGuardianAvatar($input: UpdateGuardianInput!) {
    updateGuardian(updateGuardianInput: $input) {
      id
      avatarUrl
    }
  }
`
```
> Se reutiliza `updateGuardian` existente, que ya acepta `UpdateGuardianInput` (al que agregaremos `avatarUrl` en el paso 1).

### 4. Frontend — Hook `useUpdateGuardianAvatar`

Crear **`web/modules/families/hooks/use-update-guardian-avatar.ts`** (espejado de `use-update-teacher-avatar.ts`):
```ts
'use client'
import { useMutation } from '@apollo/client/react'
import { UPDATE_GUARDIAN_AVATAR } from '../graphql/mutations'
import { GET_GUARDIAN } from '../graphql/queries'

export function useUpdateGuardianAvatar({ guardianId }: { guardianId: string }) {
  const [mutate, { loading }] = useMutation(UPDATE_GUARDIAN_AVATAR, {
    refetchQueries: [{ query: GET_GUARDIAN, variables: { id: guardianId } }],
    awaitRefetchQueries: true,
  })

  const updateAvatar = async (avatarUrl: string) => {
    await mutate({ variables: { input: { id: guardianId, avatarUrl } } })
  }

  return { updateAvatar, loading }
}
```

### 5. Frontend — Actualizar `GuardianHeroCard`

**`web/modules/families/components/guardian-hero-card.tsx`**:
- Agregar prop `onAvatarEdit?: () => void`
- Agregar estado local `isAvatarHovered`
- Envolver `PersonAvatar` en un `div` clickeable con hover overlay (ícono `Edit2`), igual al patrón de `teacher-hero-card.tsx:32-48`
- Pasar `avatar={guardian.avatarUrl ?? undefined}` a `PersonAvatar`

### 6. Frontend — Cablear la página del tutor

**`web/app/(authenticated)/families/[familyId]/tutors/[tutorId]/page.tsx`**:
- Agregar estado: `const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)`
- Instanciar hook: `const { updateAvatar } = useUpdateGuardianAvatar({ guardianId: tutorId })`
- Handler: `const handleAvatarSuccess = async (url: string) => { await updateAvatar(url) }`
- Pasar `onAvatarEdit={() => setAvatarDialogOpen(true)}` a `<GuardianHeroCard>`
- Agregar al final del JSX:
  ```tsx
  <AvatarUploaderDialog
    open={avatarDialogOpen}
    onOpenChange={setAvatarDialogOpen}
    entityType="parent"
    entityId={tutorId}
    currentAvatar={guardian.avatarUrl}
    onSuccess={handleAvatarSuccess}
  />
  ```

> `entityType="parent"` es el valor correcto ya existente en el enum del componente. El archivo se sube a `parents/{tutorId}.{ext}` en Supabase Storage.

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `be/prisma/schema.prisma` | + campo `avatarUrl` en `FamilyGuardian` |
| `be/src/families/entities/guardian.entity.ts` | + `@Field avatarUrl` |
| `be/src/families/dto/update-guardian.input.ts` | + campo `avatarUrl` opcional |
| `be/src/families/utils/guardian-mapper.util.ts` | + mapeo de `avatarUrl` |
| `web/modules/families/types/index.ts` | + `avatarUrl` en `GuardianDetail` |
| `web/modules/families/graphql/queries.ts` | + `avatarUrl` en `GET_GUARDIAN` |
| `web/modules/families/graphql/mutations.ts` | + `UPDATE_GUARDIAN_AVATAR` |
| `web/modules/families/hooks/use-update-guardian-avatar.ts` | **nuevo** hook |
| `web/modules/families/components/guardian-hero-card.tsx` | + overlay + prop `onAvatarEdit` |
| `web/app/(authenticated)/families/[familyId]/tutors/[tutorId]/page.tsx` | + dialog + hook |

---

## Bug fix pendiente

**`web/modules/families/hooks/use-guardian-detail.ts`** — falta `avatarUrl` en dos lugares:

1. En `GetGuardianResponse` (interfaz interna del hook):
```ts
avatarUrl?: string | null
```

2. En el mapeo del objeto `guardian`:
```ts
avatarUrl: data.guardian.avatarUrl,
```

Sin esto, el avatar se guarda en DB y Supabase pero nunca llega al componente.

---

## Verificación

1. Correr migración y confirmar que la columna `avatar_url` aparece en `FamilyGuardian` en Prisma Studio.
2. Reiniciar el servidor backend y verificar que `guardian { avatarUrl }` aparece en el schema GraphQL.
3. En la UI, navegar a un tutor → el avatar debe mostrar hover con ícono de edición.
4. Click → dialog de subida → subir imagen → confirmar que el avatar actualiza en la card.
