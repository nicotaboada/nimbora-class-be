# Plan: Replace Family Detail Mock with Real GraphQL Query

## Context
The family detail page (`/families/[familyId]`) currently shows hardcoded mock data from `family-detail.mock.ts`. The backend already exposes a `family(id: String!): Family!` query in the `FamiliesResolver` that returns full family info including students (with their classes), guardians (with relationship, email, phone), and tags. This plan wires the frontend to that real query.

## Files to Modify/Create

### 1. Add `GET_FAMILY` query
**File:** `web/modules/families/graphql/queries.ts` — append alongside existing `GET_FAMILIES`

```graphql
export const GET_FAMILY = gql`
  query GetFamily($id: String!) {
    family(id: $id) {
      id
      name
      membersCount
      createdAt
      tags
      students {
        id
        firstName
        lastName
        classes {
          id
          name
        }
      }
      guardians {
        id
        firstName
        lastName
        relationship
        emailNotifications
        email
        phoneNumber
      }
    }
  }
`
```

### 2. Create hook `use-family-detail.ts`
**File:** `web/modules/families/hooks/use-family-detail.ts` (new file, new `hooks/` folder)

Uses `useQuery` from `@apollo/client/react`, following the same pattern as `modules/classes/hooks/use-class.ts`.

Maps the GraphQL response to `FamilyDetail` type:
- `tutorCount` → `guardians.length`
- `studentCount` → `students.length`
- `guardian.receivesMail` → `guardian.emailNotifications`
- `guardian.phone` → `guardian.phoneNumber`
- `guardian.isActive` → `true` (not available in backend yet)
- `student.enrolledClasses` → `student.classes.map(c => c.name)`
- `student.relationship` → `""` (not in backend student summary yet)
- `student.status` → `"ACTIVE"` (not in backend student summary yet)
- `financialSummary` → `{ totalBalance: 0, pendingBalance: 0, totalPaid: 0 }` (not in backend yet)
- `notes` → `[]` (not in backend yet)

### 3. Update family detail page
**File:** `web/app/(authenticated)/families/[familyId]/page.tsx`

Replace:
```ts
import { familyDetailMock } from 'modules/families/mocks/family-detail.mock'
// ...
const family = familyDetailMock
```
With:
```ts
import { useFamilyDetail } from 'modules/families/hooks/use-family-detail'
// ...
const { family, loading } = useFamilyDetail(familyId)
if (loading || !family) return <LoadingSpinner /> // or null
```

## Notes
- The `FamilyDetail` frontend type has extra fields (`financialSummary`, `notes`, `student.status`, `student.relationship`) not yet in the backend entity. These get safe defaults for now, to be filled in future iterations.
- No backend changes needed — the `family` query already exists in the resolver.

## Verification
1. Run `npm run start:dev` in `/be` — backend must be running
2. Navigate to `/families/[any-real-family-id]` in the web app
3. Verify the family name, guardians list (with relationship badge and receivesMail toggle), and students list (with enrolled classes) render with real data from the DB
4. Confirm no TypeScript errors (`npm run build` in `/web`)
