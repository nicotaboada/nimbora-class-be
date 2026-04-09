# Plan: Family Detail Page (Mock UI)

## Context
The families list page exists with mock data but has no detail page. The user wants to build the full family detail page as a UI mockup (no backend calls) matching the provided screenshot, and add a link from the families table to this page.

## What to Build

### 1. Expand types & mocks
**File:** `web/modules/families/types/index.ts`
- Add `FamilyGuardian` (full): id, firstName, lastName, relationship, email, phone, avatarUrl, receivesMail, isActive
- Add `FamilyStudent` (full): id, firstName, lastName, relationship, enrolledClasses: string[], status (ACTIVE | INACTIVE), avatarUrl
- Add `FamilyNote`: id, content, createdAt, authorName
- Add `FamilyDetail` interface: id, name, createdAt, tutorCount, studentCount, tags: string[], financialSummary (totalBalance, pendingBalance, totalPaid), guardians: FamilyGuardian[], students: FamilyStudent[], notes: FamilyNote[]

**File:** `web/modules/families/mocks/family-detail.mock.ts` (new file)
- Export `familyDetailMock: FamilyDetail` matching the screenshot (Familia Taboada, 2 tutors, 2 students, tags, financials, no notes)

### 2. Update families table — add link on name
**File:** `web/modules/families/components/families-table.tsx`
- Wrap `family.name` in `<Link href={ROUTES.FAMILY_DETAIL(family.id)}>` with `className="hover:underline font-medium"`

### 3. Create detail components
All in `web/modules/families/components/`:

**`family-info-card.tsx`**
- Card with icon + "Información de Familia" title
- Shows: Nombre de Familia (big text), Fecha de Creación, Tutores count, Estudiantes count

**`family-financial-card.tsx`**
- Card with `$` icon + "Resumen Financiero" title
- Rows: Balance Total (neutral), Saldo Pendiente (red), Total Pagado (green)

**`family-tags-card.tsx`**
- Card with tag icon + "Etiquetas" title + `+` button (no-op for now)
- Renders badge chips for each tag

**`family-tutors-section.tsx`**
- Section header: shield icon + "Tutores / Guardianes" + count + "Agregar Tutor" button (no-op)
- For each guardian: Avatar, name, relationship badge, "Recibe mails" toggle (local state), Email button, WhatsApp button, 3-dot menu

**`family-students-section.tsx`**
- Section header: graduation icon + "Estudiantes" + count + "Agregar Estudiante" button (no-op)
- Table: #, Estudiante (avatar + name), Relación, Clases Inscriptas (badges), Estado (green/gray badge), 3-dot menu

**`family-notes-section.tsx`**
- Section header: doc icon + "Notas de la Familia" + "+ Agregar Nota" (no-op)
- Empty state: envelope icon + "No hay notas todavía" + subtitle

### 4. Implement detail page
**File:** `web/app/(authenticated)/families/[familyId]/page.tsx`
- Use `React.use(params)` to get `familyId`
- Use `familyDetailMock` (ignore familyId for now)
- Layout: `mx-auto w-full max-w-7xl`
- `<DetailHeader>` breadcrumb: Familias → family.name, no action buttons
- Two-column grid `grid-cols-[300px_1fr] gap-6`:
  - Left: `FamilyInfoCard`, `FamilyFinancialCard`, `FamilyTagsCard` stacked
  - Right: `FamilyTutorsSection`, `FamilyStudentsSection`, `FamilyNotesSection` stacked

## Critical Files
- `web/modules/families/types/index.ts` — expand types
- `web/modules/families/mocks/family-detail.mock.ts` — new mock
- `web/modules/families/components/families-table.tsx` — add link on name
- `web/modules/families/components/family-info-card.tsx` — new
- `web/modules/families/components/family-financial-card.tsx` — new
- `web/modules/families/components/family-tags-card.tsx` — new
- `web/modules/families/components/family-tutors-section.tsx` — new
- `web/modules/families/components/family-students-section.tsx` — new
- `web/modules/families/components/family-notes-section.tsx` — new
- `web/app/(authenticated)/families/[familyId]/page.tsx` — implement

## Reuse
- `<DetailHeader>` from `components/layouts/detail-header.tsx`
- `<PersonAvatar>` from `components/common/person-avatar.tsx`
- `ROUTES.FAMILY_DETAIL` from `lib/config/routes.ts`
- shadcn: `Card`, `CardContent`, `Badge`, `Button`, `Separator`, `Switch`, `Table`, `Avatar`
- `lucide-react` icons

## Verification
1. Run `npm run dev` in `web/`
2. Navigate to `/families` → click family name → lands on `/families/[id]`
3. Detail page renders with left sidebar (info, financial, tags) and right content (tutors, students, notes)
4. Visual match to screenshot
