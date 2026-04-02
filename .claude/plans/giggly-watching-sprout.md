# Plan: Feature Avatar Uploader

## Context
El profesor tiene un avatar con un hint de edición (hover con Edit2) en TeacherHeroCard, pero no hay infraestructura real para subir fotos. El backend no tiene `avatarUrl` en la entidad Teacher. Se necesita un componente reutilizable (para teachers, students, parents en el futuro) que muestre un modal con drop zone para subir imagen a Supabase Storage y luego guardar la URL via GraphQL.

## Decisiones tomadas
- **Modal centrado (Dialog)**, no Sheet lateral — el diseño lo muestra así. No existe `dialog.tsx` en el proyecto, hay que crearlo.
- **Upload directo a Supabase** desde el frontend con el browser client existente (`lib/supabase/client.ts`)
- **Sin crop/resize** — validación simple: max 5MB, formatos JPG/PNG/WebP
- **URL guardada en la tabla** `teachers.avatarUrl` via la mutation `updateTeacher` existente
- **Path en bucket**: `teachers/{teacherId}` (sobrescribe en cada upload)

## Pasos de implementación

### 1. Backend — agregar campo avatarUrl
**Archivos a modificar:**
- `/Users/nicolastaboada/Desktop/Proyectos SaaS/nimbora-class/be/src/teachers/entities/teacher.entity.ts` — agregar `@Column({ nullable: true }) avatarUrl?: string;`
- `/Users/nicolastaboada/Desktop/Proyectos SaaS/nimbora-class/be/src/teachers/dto/update-teacher.input.ts` — agregar `@Field({ nullable: true }) avatarUrl?: string;`

> Nota: Después hay que correr la migración de DB en el backend.

### 2. Frontend — Dialog UI primitive
**Nuevo archivo:** `components/ui/dialog.tsx`
- Wrappear `@radix-ui/react-dialog` con el mismo patrón que los otros primitivos del proyecto (sheet.tsx, alert-dialog.tsx)
- Exportar: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `DialogClose`

### 3. Frontend — Hook de upload
**Nuevo archivo:** `lib/hooks/use-upload-avatar.ts`
- Usa `createBrowserClient` de `lib/supabase/client.ts`
- Recibe `file: File`, `entityType: 'teacher' | 'student' | 'parent'`, `entityId: string`
- Sube al path `{entityType}s/{entityId}` en el bucket `avatars`
- Retorna la URL pública
- Valida: max 5MB, formatos `image/jpeg | image/png | image/webp`

```ts
// Signature
function useUploadAvatar(): {
  upload: (file: File, entityType: string, entityId: string) => Promise<string>
  uploading: boolean
  error: string | null
}
```

### 4. Frontend — Componente AvatarUploaderDialog (reutilizable)
**Nuevo archivo:** `components/common/avatar-uploader-dialog.tsx`

Props:
```ts
interface AvatarUploaderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: 'teacher' | 'student' | 'parent'
  entityId: string
  currentAvatar?: string | null
  onSuccess: (avatarUrl: string) => void
}
```

Estados del modal (2 vistas):
- **Sin imagen seleccionada**: Drop zone con icono upload, texto "Arrastra y suelta tu foto" y link "o buscar archivo"
- **Con imagen seleccionada**: Preview circular + link "Seleccionar nueva foto"

**Drop zone — patrón nativo** (igual que `modules/settings/academia/components/academy-logo-card.tsx`):
- Sin librería externa — usa `onDragOver`, `onDragLeave`, `onDrop` nativos de React
- `input type="file"` oculto con `accept="image/jpeg,image/png,image/webp"`
- Click en el área → `inputRef.current?.click()`
- Al soltar/seleccionar archivo: valida y muestra preview con `URL.createObjectURL`
- Estado `isDragging` para cambiar estilos del borde (igual que el card de academia)
- Botón "Guardar": llama `useUploadAvatar.upload()`, luego llama `onSuccess(url)`
- Botón "Cancelar": cierra y resetea estado

### 5. Frontend — Tipos Teacher
**Archivo:** `modules/teachers/types/teacher.ts`
- Agregar `avatarUrl?: string | null` al interface `Teacher`

### 6. Frontend — GraphQL
**Archivo:** `modules/teachers/graphql/queries.ts`
- Agregar `avatarUrl` al fragment/fields de `GET_TEACHER` y `GET_TEACHERS`

**Archivo:** `modules/teachers/graphql/mutations.ts`
- Agregar `avatarUrl` a los campos devueltos en `UPDATE_TEACHER`

### 7. Frontend — Hook de mutation para avatar
**Nuevo archivo:** `modules/teachers/hooks/use-update-teacher-avatar.ts`
- Wrappea `useMutation(UPDATE_TEACHER)` con solo `{ id, avatarUrl }`
- Hace refetch de `GET_TEACHER` con el id del teacher

### 8. Frontend — Conectar TeacherHeroCard
**Archivo:** `modules/teachers/components/teacher-hero-card.tsx`
- Agregar prop: `onAvatarEdit?: () => void`
- Conectar el click en el área del avatar (ya tiene el hover con Edit2) al handler
- Pasar `avatar={teacher.avatarUrl}` a `StudentAvatar` (ya soporta imágenes)

### 9. Frontend — Conectar todo en la página del teacher
**Archivo:** `app/(authenticated)/teachers/[id]/page.tsx`
- Agregar estado: `const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)`
- Render `<AvatarUploaderDialog>` con `entityType="teacher"`, `entityId={teacherId}`
- En `onSuccess`: llamar `useUpdateTeacherAvatar.update({ id: teacherId, avatarUrl })`
- Pasar `onAvatarEdit={() => setAvatarDialogOpen(true)}` al `TeacherHeroCard`

## Supabase Storage — setup manual requerido
Antes de implementar, crear en el dashboard de Supabase:
1. Nuevo bucket llamado `avatars` (público)
2. Policy: `INSERT` para usuarios autenticados, `SELECT` para todos

## Archivos a crear
- `components/ui/dialog.tsx`
- `components/common/avatar-uploader-dialog.tsx`
- `lib/hooks/use-upload-avatar.ts`
- `modules/teachers/hooks/use-update-teacher-avatar.ts`

## Archivos a modificar
- `be/src/teachers/entities/teacher.entity.ts`
- `be/src/teachers/dto/update-teacher.input.ts`
- `modules/teachers/types/teacher.ts`
- `modules/teachers/graphql/queries.ts`
- `modules/teachers/graphql/mutations.ts`
- `modules/teachers/components/teacher-hero-card.tsx`
- `app/(authenticated)/teachers/[id]/page.tsx`

## Verificación
1. Crear el bucket `avatars` en Supabase (público)
2. Ir al detalle de un profesor
3. Hacer hover sobre el avatar → ver icono Edit2
4. Hacer click → se abre modal con drop zone
5. Drag & drop o click "buscar archivo" → seleccionar JPG/PNG
6. Ver preview circular
7. Click "Guardar" → se sube a Supabase, se guarda URL en DB
8. Modal se cierra, avatar actualizado en la card
9. Refrescar página → avatar persiste
