# Plan: Reusable EntityStatusBadge Component

## Context
The app renders "Activo/Inactivo" status chips in 6 places, each with its own inline Tailwind overrides on the base `<Badge>`. There is no shared component. There are also minor inconsistencies (label "Desactivado" vs "Inactivo", hardcoded "Activo" in teacher hero card, slightly different sizes/colors). The goal is to extract a single shared `EntityStatusBadge` component and replace all usages.

---

## New Component

**Path:** `web/components/common/entity-status-badge.tsx`

```tsx
import { Badge } from '@/components/ui/badge'
import { Status } from '@/gql/graphql' // or wherever the enum is imported from

interface EntityStatusBadgeProps {
  status?: Status        // for places that have the Status enum
  isActive?: boolean     // for places that only have a boolean (guardian card)
}

export function EntityStatusBadge({ status, isActive }: EntityStatusBadgeProps) {
  const active = status !== undefined
    ? status === Status.ENABLED
    : (isActive ?? false)

  return (
    <Badge
      variant={active ? 'default' : 'secondary'}
      className={
        active
          ? 'bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800 hover:bg-green-100'
          : 'bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100'
      }
    >
      {active ? 'Activo' : 'Inactivo'}
    </Badge>
  )
}
```

---

## Files to Modify (6 replacements)

| File | Current code | Replace with |
|---|---|---|
| `modules/students/components/students-table.tsx` | Inline Badge with green/gray classes | `<EntityStatusBadge status={student.status} />` |
| `modules/teachers/components/teachers-table.tsx` | Identical inline Badge copy | `<EntityStatusBadge status={teacher.status} />` |
| `modules/students/components/student-profile-card.tsx` | Inline Badge with isActive | `<EntityStatusBadge status={student.status} />` |
| `modules/teachers/components/teacher-hero-card.tsx` | Hardcoded `<Badge>Activo</Badge>` (BUG) | `<EntityStatusBadge status={teacher.status} />` |
| `modules/families/components/family-students-section.tsx` | Inline Badge, `text-xs h-6 rounded-full` | `<EntityStatusBadge status={student.status} />` |
| `modules/families/components/guardian-students-card.tsx` | Inline Badge with `isActive` boolean, label "Desactivado" | `<EntityStatusBadge isActive={student.isActive} />` |

Notes:
- `guardian-students-card.tsx` uses `student.isActive: boolean` (from `GuardianDetail` GraphQL type, not the `Status` enum) → use `isActive` prop
- "Desactivado" label in guardian card will be normalized to "Inactivo" for consistency
- Teacher hero card bug (always shows "Activo") will be fixed by passing `status={teacher.status}`

---

## Verification

1. Run `npm run dev` in `/web`
2. Navigate to Students list → status chips should look the same (green Activo / gray Inactivo)
3. Navigate to Teachers list → same
4. Navigate to a Student detail page → profile card chip should work
5. Navigate to a Teacher detail page → hero card should now reflect actual status instead of always showing Activo
6. Navigate to a Family detail page → both the students section table and guardian students card should show consistent chips
7. Run `npm run lint` to verify no type errors
