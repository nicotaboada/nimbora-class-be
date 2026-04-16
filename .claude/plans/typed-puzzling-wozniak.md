# Plan: Asignar Resp. Facturación desde el menú "..." del guardian

## Context
El backend ya tiene la mutation `updateGuardianBilling` implementada. Solo falta exponer la acción en el frontend dentro del dropdown "..." de cada fila de guardian en la sección de tutores de la familia.

La acción debe: mostrar loading toast → llamar la mutation → mostrar success/error toast y refetch.

---

## Archivos a modificar (frontend en `/web`)

1. **`modules/families/graphql/mutations.ts`** — agregar `UPDATE_GUARDIAN_BILLING`
2. **`modules/families/hooks/use-update-guardian-billing.ts`** — nuevo hook (crear)
3. **`modules/families/components/family-tutors-section.tsx`** — agregar item al DropdownMenu

---

## Cambios detallados

### 1. Agregar mutation GQL

```ts
// En mutations.ts — agregar al final
export const UPDATE_GUARDIAN_BILLING = gql`
  mutation UpdateGuardianBilling($input: UpdateGuardianBillingInput!) {
    updateGuardianBilling(input: $input) {
      id
      isResponsibleForBilling
    }
  }
`;
```

### 2. Crear hook `use-update-guardian-billing.ts`

Mismo patrón que `use-update-guardian-notifications.ts`:

```ts
export function useUpdateGuardianBilling(familyId: string) {
  const [updateMutation, { loading }] = useMutation(UPDATE_GUARDIAN_BILLING);

  const updateBilling = async (guardianId: string) => {
    const toastId = toastLoading('Actualizando responsable de facturación...');
    return updateMutation({
      variables: { input: { guardianId } },
      refetchQueries: [{ query: GET_FAMILY_DETAIL, variables: { id: familyId } }],
      awaitRefetchQueries: true,
    })
      .then(() => toastSuccess('Responsable de facturación actualizado', toastId))
      .catch(() => toastError('Error al actualizar el responsable de facturación', toastId));
  };

  return { updateBilling, loading };
}
```

### 3. Agregar item en el DropdownMenu

En `family-tutors-section.tsx`, dentro del `DropdownMenuContent` de cada guardian row, agregar **antes** de "Eliminar":

```tsx
{!guardian.isResponsibleForBilling && (
  <DropdownMenuItem
    className="text-gray-600"
    disabled={billingLoading}
    onClick={() => updateBilling(guardian.id)}
  >
    Asignar como Resp. facturación
  </DropdownMenuItem>
)}
```

El hook se instancia a nivel del componente: `const { updateBilling, billingLoading } = useUpdateGuardianBilling(family.id)`.

---

## Verificación

1. Abrir detalle de una familia con 2+ guardians
2. Click en "..." de un guardian que NO tiene "Resp. facturación"
3. Debe aparecer la opción "Asignar como Resp. facturación"
4. Al clickear: toast de loading → success → el badge "Resp. facturación" se mueve al guardian seleccionado
5. En el guardian que ya es responsable: la opción NO debe aparecer en el menú
