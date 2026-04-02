# Plan: Página de Detalle del Profesor

## Contexto

Construir la página `/teachers/[id]` accesible desde la tabla de profesores. El backend tiene un modelo Teacher mínimo que necesita extenderse con `email`, `birthYear`, `gender`, `documentType` y `documentNumber`. El diseño (Subframe) difiere del patrón de students: no hay sidebar — usa un header sticky con breadcrumb + tabs integrados, y el contenido es full-width centrado (`max-w-1024px`).

---

## Layout final (basado en diseño Subframe)

```
┌─────────────────────────────────────────────────────┐  ← sticky header
│  👥 Profesores  >  Nico Taboada                      │  ← breadcrumb
│  [Acerca de]  Clases                                 │  ← tabs underline
└─────────────────────────────────────────────────────┘
                  max-w-[1024px] centrado
┌──────────────────────────────────────────────────────┐
│  [Avatar + nombre + badge] | [Email + WA] | [Switch] │  ← card 3 cols
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│  Información Personal   [Editar]                     │
│  Nombre | Apellido | Año nac | Género | Doc type+num │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│  Información de Contacto   [Editar]                  │
│  Email | Teléfono                                    │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│  Etiquetas   [Agregar]                               │
│  (placeholder)                                       │
└──────────────────────────────────────────────────────┘
```

---

## BE-1: Extender modelo Prisma

**Archivo:** `/be/prisma/schema.prisma`

Agregar al model `Teacher`:
```prisma
email          String?
birthYear      Int?
gender         Gender?
documentType   DocumentType?
documentNumber String?
```

Agregar enums nuevos:
```prisma
enum Gender {
  MALE
  FEMALE
  OTHER
  NOT_SPECIFIED
}

enum DocumentType {
  DNI
  PASSPORT
  NIE
  OTHER
}
```

Correr: `npx prisma migrate dev --name add-teacher-extended-fields`

---

## BE-2: Actualizar entity y DTOs del backend

**Entity** `/be/src/teachers/entities/teacher.entity.ts`:
- Agregar `email`, `birthYear`, `gender`, `documentType`, `documentNumber` como `@Field(...)` opcionales

**DTOs:**
- `/be/src/teachers/dto/create-teacher.input.ts`: agregar los 5 campos opcionales
- `/be/src/teachers/dto/update-teacher.input.ts`: agregar los 5 campos opcionales

---

## FE-0: Crear componente Switch

**Crear** `/web/components/ui/switch.tsx`

Wrapper sobre `@radix-ui/react-switch` (ya instalado). Patrón idéntico a los otros wrappers Radix del proyecto:
```tsx
import * as SwitchPrimitive from '@radix-ui/react-switch'
// Root + Thumb con clases Tailwind, exportar como Switch
```

---

## FE-1: Actualizar tipos y GraphQL del frontend

**Tipos** `/web/modules/teachers/types/teacher.ts`:
- Agregar `enum TeacherGender { MALE | FEMALE | OTHER | NOT_SPECIFIED }`
- Agregar `enum TeacherDocumentType { DNI | PASSPORT | NIE | OTHER }`
- Extender `Teacher` con: `email?`, `birthYear?`, `gender?`, `documentType?`, `documentNumber?`
- Extender `UpdateTeacherInput` con los mismos campos

**Query** `/web/modules/teachers/graphql/queries.ts`:
- Actualizar `GET_TEACHER` incluyendo `email birthYear gender documentType documentNumber`

---

## FE-2: Crear hook de toggle de estado

**Crear** `/web/modules/teachers/hooks/use-toggle-teacher-status.ts`

```ts
// Usa UPDATE_TEACHER mutation
// Alterna: ENABLED ↔ DISABLED
// Retorna: { toggleStatus, loading }
```

---

## FE-3: Crear TeacherPageHeader (breadcrumb + tabs integrados)

**Crear** `/web/modules/teachers/components/teacher-page-header.tsx`

El diseño tiene breadcrumb + tabs en el mismo bloque sticky (diferente al patrón de students que los separa). Implementar con componentes existentes:

```tsx
// Contenedor sticky con bg-white shadow-sm
<div className="sticky top-0 z-10 bg-white shadow-sm">
  {/* Breadcrumb row */}
  <div className="flex items-center gap-2 px-8 py-4">
    <Users className="h-4 w-4 text-muted-foreground" />
    <Link href="/teachers">
      <span className="text-sm font-medium text-muted-foreground">Profesores</span>
    </Link>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
    <span className="text-sm font-medium text-foreground">{teacherName}</span>
  </div>
  {/* Tabs row */}
  <div className="border-b px-8">
    <TabsList ...>  {/* shadcn Tabs underline style */}
      <TabsTrigger value="about">Acerca de</TabsTrigger>
      <TabsTrigger value="classes">Clases</TabsTrigger>
    </TabsList>
  </div>
</div>
```

Props: `teacherName: string`, `activeTab: string`, `onTabChange: (tab: string) => void`

> Este componente vive dentro del módulo teachers porque es específico de esta página.

---

## FE-4: Crear TeacherHeroCard (card principal horizontal)

**Crear** `/web/modules/teachers/components/teacher-hero-card.tsx`

3 columnas separadas por divisores verticales:

```
Col 1: StudentAvatar (size-24) + nombre + Badge (Activo/Inactivo)
Col 2: Button Email (mailto, disabled si !email) + Button WhatsApp (wa.me, disabled si !phoneNumber)
Col 3: "Profesor Habilitado" label + <Switch checked={isEnabled} onCheckedChange={toggleStatus} /> + caption
```

```tsx
<div className="flex w-full gap-8 rounded-md border bg-white px-8 py-8 shadow-sm items-stretch">
  {/* col 1 */}
  <div className="flex grow flex-col items-center justify-center gap-4"> ... </div>
  <div className="w-px bg-border" />
  {/* col 2 */}
  <div className="flex grow flex-col items-center justify-center gap-3"> ... </div>
  <div className="w-px bg-border" />
  {/* col 3 */}
  <div className="flex grow flex-col items-center justify-center gap-4"> ... </div>
</div>
```

Props: `teacher: Teacher`, `onToggleStatus: (checked: boolean) => void`, `loading: boolean`

---

## FE-5: Crear cards de información

### `/web/modules/teachers/components/teacher-personal-info-card.tsx`
Card con header "Información Personal" + botón "Editar" (disabled) + grid de campos:
- Columna 1: Nombre, Año de nacimiento
- Columna 2: Apellido, Género (label en español)
- Columna 3: Tipo de documento + Número de documento

Patrón de campo:
```tsx
<div className="flex flex-col gap-1">
  <span className="text-xs text-muted-foreground">Nombre</span>
  <span className="text-sm">{teacher.firstName ?? '—'}</span>
</div>
```

### `/web/modules/teachers/components/teacher-contact-info-card.tsx`
Card "Información de Contacto" + botón "Editar" (disabled):
- Email, Teléfono — mismo patrón de campo

### `/web/modules/teachers/components/teacher-tags-card.tsx`
Card "Etiquetas" + botón "Agregar" (disabled). Placeholder vacío.

---

## FE-6: Crear componentes de tabs

### `/web/modules/teachers/components/teacher-about-tab.tsx`
```tsx
<div className="space-y-6">
  <TeacherPersonalInfoCard teacher={teacher} />
  <TeacherContactInfoCard teacher={teacher} />
  <TeacherTagsCard />
</div>
```
(Cards apiladas en columna, ancho completo — como en el diseño)

### `/web/modules/teachers/components/teacher-classes-tab.tsx`
Empty state con `<Empty />` de `components/ui/empty.tsx`.

---

## FE-7: Construir página de detalle

**Actualizar** `/web/app/(authenticated)/teachers/[id]/page.tsx`

```tsx
'use client'

// useQuery(GET_TEACHER, { variables: { id } })
// const [activeTab, setActiveTab] = useState('about')
// const { toggleStatus, loading } = useToggleTeacherStatus(teacher)

<div className="flex h-full w-full flex-col bg-neutral-50">
  {/* Header sticky con breadcrumb + tabs */}
  <TeacherPageHeader
    teacherName={getTeacherFullName(teacher)}
    activeTab={activeTab}
    onTabChange={setActiveTab}
  />

  {/* Contenido scrollable */}
  <div className="flex w-full flex-col items-start grow overflow-y-auto">
    <div className="flex w-full max-w-[1024px] flex-col gap-6 px-8 py-8 mx-auto">
      <TabsContent value="about">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="space-y-6">
            <TeacherHeroCard teacher={teacher} onToggleStatus={toggleStatus} loading={loading} />
            <TeacherAboutTab teacher={teacher} />
          </div>
        </motion.div>
      </TabsContent>
      <TabsContent value="classes">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <TeacherClassesTab />
        </motion.div>
      </TabsContent>
    </div>
  </div>
</div>
```

---

## Archivos a modificar/crear

| Paso | Archivo | Acción |
|------|---------|--------|
| BE-1 | `/be/prisma/schema.prisma` | Modificar |
| BE-2 | `/be/src/teachers/entities/teacher.entity.ts` | Modificar |
| BE-2 | `/be/src/teachers/dto/create-teacher.input.ts` | Modificar |
| BE-2 | `/be/src/teachers/dto/update-teacher.input.ts` | Modificar |
| FE-0 | `/web/components/ui/switch.tsx` | Crear |
| FE-1 | `/web/modules/teachers/types/teacher.ts` | Modificar |
| FE-1 | `/web/modules/teachers/graphql/queries.ts` | Modificar |
| FE-2 | `/web/modules/teachers/hooks/use-toggle-teacher-status.ts` | Crear |
| FE-3 | `/web/modules/teachers/components/teacher-page-header.tsx` | Crear |
| FE-4 | `/web/modules/teachers/components/teacher-hero-card.tsx` | Crear |
| FE-5 | `/web/modules/teachers/components/teacher-personal-info-card.tsx` | Crear |
| FE-5 | `/web/modules/teachers/components/teacher-contact-info-card.tsx` | Crear |
| FE-5 | `/web/modules/teachers/components/teacher-tags-card.tsx` | Crear |
| FE-6 | `/web/modules/teachers/components/teacher-about-tab.tsx` | Crear |
| FE-6 | `/web/modules/teachers/components/teacher-classes-tab.tsx` | Crear |
| FE-7 | `/web/app/(authenticated)/teachers/[id]/page.tsx` | Modificar |

---

## Componentes reutilizados

- `StudentAvatar` — `components/common/student-avatar.tsx`
- `Tabs/TabsList/TabsTrigger/TabsContent` — `components/ui/tabs.tsx`
- `Card` / `Badge` / `Button` / `Separator` — `components/ui/`
- `Switch` (nuevo wrapper) — `components/ui/switch.tsx`
- `motion/react` — animación de tab content
- `getTeacherFullName()` — `modules/teachers/types/teacher.ts`
- `UPDATE_TEACHER` mutation — `modules/teachers/graphql/mutations.ts`

---

## Verificación

1. `pnpm dev` → click en un profesor en la tabla → carga `/teachers/[id]`
2. Header sticky: breadcrumb "Profesores > [nombre]" con ícono Users
3. Tabs en header: "Acerca de" activo por defecto con underline
4. Hero card: 3 columnas, botones Email/WA disabled si no hay datos
5. Switch habilitar/deshabilitar: cambia el status en DB y se refleja en tabla
6. Tab "Clases": empty state
7. `pnpm lint:fix && pnpm prettier:fix`
