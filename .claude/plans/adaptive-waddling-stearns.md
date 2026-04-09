# Plan: GuardianRelationship TypeScript Enum (Frontend)

## Context
The `GuardianRelationship` values are currently defined inline as a Zod `z.enum([...])` inside `types/index.ts`. This means components can't import the enum values — they have to manually cast with verbose union types (as seen in `family-tutors-section.tsx:65-73`). The goal is to extract it into a proper TypeScript `enum` so it can be imported anywhere.

## Changes

### 1. Create the enum file
**New file:** `web/modules/families/enums/guardian-relationship.enum.ts`

```ts
export enum GuardianRelationship {
  PADRE = 'PADRE',
  MADRE = 'MADRE',
  ABUELO = 'ABUELO',
  ABUELA = 'ABUELA',
  TIO = 'TIO',
  TIA = 'TIA',
  TUTOR = 'TUTOR',
  OTRO = 'OTRO',
}
```

### 2. Update `types/index.ts`
**File:** `web/modules/families/types/index.ts`

- Import `GuardianRelationship` from the new enum file
- Replace the local `const GuardianRelationship = z.enum([...])` with `z.nativeEnum(GuardianRelationship)`
- Re-export `GuardianRelationship` so existing imports from `../types` continue to work

```ts
import { GuardianRelationship } from '../enums/guardian-relationship.enum'
export { GuardianRelationship }

// In createGuardianSchema:
relationship: z.nativeEnum(GuardianRelationship),
```

### 3. Update `family-tutors-section.tsx`
**File:** `web/modules/families/components/family-tutors-section.tsx`

Replace the inline union cast at lines 65-73:
```ts
// Before
relationship: editingGuardian.relationship as
  | 'PADRE' | 'MADRE' | 'ABUELO' | 'ABUELA'
  | 'TIO' | 'TIA' | 'TUTOR' | 'OTRO',

// After
relationship: editingGuardian.relationship as GuardianRelationship,
```

Add import at the top:
```ts
import { GuardianRelationship } from '../enums/guardian-relationship.enum'
```

## Verification
- `GuardianRelationship` is importable from `../enums/guardian-relationship.enum` and from `../types`
- Zod schema still validates correctly via `z.nativeEnum`
- `family-tutors-section.tsx` no longer has the verbose inline union cast
- TypeScript compiles without errors
