# Plan: Connect Guardian Notifications Toggle to Mutation

## Context
The `GuardianNotificationsCard` renders a `<Switch>` for email notifications but it's `disabled` — it only displays the current value and doesn't call any mutation. The backend already has `updateGuardianNotifications` mutation implemented and working. The frontend just needs the mutation definition, a hook, and the wire-up in the card component.

---

## Changes Required (frontend only — 3 files)

### 1. Add mutation constant
**File**: `web/modules/families/graphql/mutations.ts`

Add at the end:
```ts
export const UPDATE_GUARDIAN_NOTIFICATIONS = gql`
  mutation UpdateGuardianNotifications($input: UpdateGuardianNotificationsInput!) {
    updateGuardianNotifications(input: $input) {
      id
      emailNotifications
    }
  }
`
```

### 2. Create hook
**New file**: `web/modules/families/hooks/use-update-guardian-notifications.ts`

Follow the exact pattern of `use-update-guardian-contact-info.ts`:
```ts
'use client'

import { useMutation } from '@apollo/client/react'
import { toast } from 'sonner'
import { UPDATE_GUARDIAN_NOTIFICATIONS } from '../graphql/mutations'
import { GET_GUARDIAN } from '../graphql/queries'

export function useUpdateGuardianNotifications() {
  const [updateMutation, { loading }] = useMutation(
    UPDATE_GUARDIAN_NOTIFICATIONS,
    {
      onCompleted: () => {
        toast.success('Preferencias de notificaciones actualizadas')
      },
      onError: (error) => {
        toast.error('Error al actualizar las notificaciones')
        console.error('Error:', error)
      },
    }
  )

  const updateNotifications = (guardianId: string, emailNotifications: boolean) => {
    return updateMutation({
      variables: { input: { guardianId, emailNotifications } },
      refetchQueries: [
        { query: GET_GUARDIAN, variables: { id: guardianId } },
      ],
    })
  }

  return { updateNotifications, loading }
}
```

### 3. Wire up the card
**File**: `web/modules/families/components/guardian-notifications-card.tsx`

- Import and call `useUpdateGuardianNotifications`
- Remove `disabled` from `<Switch>`
- Add `onCheckedChange` handler
- Optionally disable during loading

```tsx
const { updateNotifications, loading } = useUpdateGuardianNotifications()

<Switch
  checked={guardian.emailNotifications}
  disabled={loading}
  onCheckedChange={(checked) => updateNotifications(guardian.id, checked)}
  className="ml-2 disabled:opacity-100 data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-gray-200"
/>
```

---

## Backend Note
No backend changes needed — `updateGuardianNotifications` mutation is already implemented in:
- Resolver: `be/src/families/families.resolver.ts:118-127`
- Service: `be/src/families/families.service.ts:350-365`
- Input DTO: `be/src/families/dto/update-guardian-notifications.input.ts`

---

## Verification
1. Toggle the switch ON → should call mutation, show `toast.success("Preferencias de notificaciones actualizadas")`
2. Toggle OFF → same success toast
3. Simulate error (e.g. bad network) → should show `toast.error`
4. Reload the page → toggled state should persist (data comes from `GET_GUARDIAN` refetch)
