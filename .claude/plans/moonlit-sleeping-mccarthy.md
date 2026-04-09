# Plan: Guardian Detail Page

## Context
Implement the guardian/tutor detail page at `/families/[familyId]/tutors/[tutorId]`. The page is a sub-level below family detail, accessible from both the families table (clicking a guardian) and from the family detail page (clicking a guardian in the tutors section). The backend already has a `guardian(id: String!)` query that returns all necessary fields. UI is similar to teacher detail but with a different layout (two-column sidebar).

## Route
`/app/(authenticated)/families/[familyId]/tutors/[tutorId]/page.tsx` — directory does not exist yet, must be created.

## Layout (from mockup)
- **No tabs** — single "Overview" view (no Finanzas tab for guardians)
- **`grid grid-cols-[300px_1fr]`** layout:
  - **Left sidebar**: hero card (avatar + name + relationship + status toggle) + "Contacto Rápido" (WhatsApp + Email buttons) + "Estudiantes Vinculados"
  - **Right main**: "Información de Contacto" card + "Información Personal" card + "Preferencias de Notificaciones" card

---

## Files to Create / Modify

### 1. `lib/config/routes.ts` — add guardian route
```ts
GUARDIAN_DETAIL: (familyId: string, tutorId: string) => `/families/${familyId}/tutors/${tutorId}`,
```

### 2. `modules/families/graphql/queries.ts` — add GET_GUARDIAN
```gql
query Guardian($id: String!) {
  guardian(id: $id) {
    id
    firstName
    lastName
    relationship
    birthDate
    gender
    documentType
    documentNumber
    email
    phoneCountryCode
    phoneNumber
    address
    city
    state
    country
    postalCode
    familyId
    emailNotifications
    isActive
    createdAt
    students {
      id
      firstName
      lastName
      classes { id name }
    }
  }
}
```

### 3. `modules/families/types/index.ts` — add GuardianDetail interface
```ts
export interface GuardianStudentSummary {
  id: string
  firstName: string
  lastName: string
  classes: { id: string; name: string }[]
}

export interface GuardianDetail {
  id: string
  firstName: string
  lastName: string
  relationship: string
  birthDate?: string
  gender?: string
  documentType?: string
  documentNumber?: string
  email?: string
  phoneCountryCode?: string
  phoneNumber?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  familyId: string
  emailNotifications: boolean
  isActive: boolean
  createdAt: string
  students: GuardianStudentSummary[]
}
```

### 4. `modules/families/hooks/use-guardian-detail.ts` — new hook
Wraps `useQuery(GET_GUARDIAN, { variables: { id: tutorId } })` and returns `{ guardian: GuardianDetail | null, loading, error, refetch }`. Pattern mirrors `use-family-detail.ts`.

### 5. Components in `modules/families/components/` — new files

#### `guardian-page-header.tsx`
Uses `DetailPageHeader`. Breadcrumb: `Familias → [familyName] (href: ROUTES.FAMILY_DETAIL(familyId)) → [guardianName]`. No tabs (single view, no tab bar needed — or pass empty tabs array).

#### `guardian-hero-card.tsx`
Left sidebar card. Avatar (PersonAvatar with initials), name, relationship badge, "Estado del Tutor" label + Switch (isActive). Pattern from `TeacherHeroCard` but simpler (no status button, use Switch like `FamilyTutorsSection`).

#### `guardian-quick-contact-card.tsx`
Left sidebar card. "Contacto Rápido" with WhatsApp button (disabled if no phone) and Email button (disabled if no email). Reuse button styles from `FamilyTutorsSection`.

#### `guardian-students-card.tsx`
Left sidebar card. "Estudiantes Vinculados" list. Each student: PersonAvatar + name + optional class chips. Data comes from `guardian.students`.

#### `guardian-contact-info-card.tsx`
Right main. "Información de Contacto" card with edit pencil. Fields: Email, Teléfono (`phoneCountryCode phoneNumber`), Dirección, Ciudad. Pattern from `TeacherContactInfoCard` (but simpler — no geo display, just text fields).

#### `guardian-personal-info-card.tsx`
Right main. "Información Personal" card with edit pencil. Fields: Nombre, Apellido, Relación, Fecha de nacimiento, Tipo de documento, Número de documento. Use same label helpers as `TeacherPersonalInfoCard` (`getGenderLabel`, `getDocumentTypeLabel` from `lib/constants`). Add `getRelationshipLabel` for GuardianRelationship enum.

#### `guardian-notifications-card.tsx`
Right main. "Preferencias de Notificaciones" card. Single row: Mail icon + "Notificaciones por Email" label + description + Switch. Read-only for now (no mutation wired up initially).

### 6. `app/(authenticated)/families/[familyId]/tutors/[tutorId]/page.tsx` — new page
```tsx
'use client'
// React.use(params) to get { familyId, tutorId }
// useGuardianDetail(tutorId) for guardian data
// GET_FAMILY query (already exists) for family.name (for breadcrumb)
// PageLoader while loading
// Layout: sticky header with GuardianPageHeader, then grid grid-cols-[300px_1fr]
```

### 7. `modules/families/components/family-tutors-section.tsx` — make guardian names clickable
Add `Link` from `next/link` around the guardian name `<p>` using `ROUTES.GUARDIAN_DETAIL(family.id, guardian.id)`. Pattern: the whole row or just the name becomes a link.

---

## Key Reused Patterns / Utilities
- `DetailPageHeader` — `components/common/detail-page-header.tsx`
- `PersonAvatar` — `components/common/person-avatar.tsx`
- `SectionCard` — `components/common/section-card.tsx`
- `PageLoader` — `components/common/page-loader.tsx`
- `getFullName` — `lib/utils/helpers`
- `Gender`, `DocumentType` enums + label helpers — `lib/constants`
- `GuardianRelationship` enum — `modules/families/enums/guardian-relationship.enum.ts`
- Card/CardHeader/CardContent — `components/ui/card`
- Switch — `components/ui/switch`
- Badge — `components/ui/badge`

---

## Verification
1. Navigate to `/families` → click a family → in the tutors section, click a guardian name → should land on `/families/[familyId]/tutors/[tutorId]`
2. Page shows: correct breadcrumb with family name and guardian name
3. Left sidebar: avatar with initials, name, relationship badge, status toggle, quick contact buttons, linked students list
4. Right main: all three info cards with correct field values from the backend
5. `PageLoader` shows while data is loading; graceful error message if query fails
6. No console TypeScript errors
