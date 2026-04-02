# Plan: Actualizar Información Personal de Profesor

## Contexto
El sheet `teacher-personal-info-sheet.tsx` ya existe con el formulario completo pero tiene la mutation sin implementar (`// TODO`). Este plan:
1. Cambia `birthYear: Int` → `birthDate: DateTime` en backend + frontend (requiere migración Prisma)
2. Conecta la mutation al backend
3. Mejora la UI/UX de labels y validaciones
4. Agrega sistema extensible de validadores de documentos (DNI Argentina)

---

## Archivos Críticos

### Backend
| Archivo | Acción |
|---|---|
| `prisma/schema.prisma` | `birthYear Int?` → `birthDate DateTime?` |
| `src/teachers/entities/teacher.entity.ts` | Cambiar campo `birthYear` → `birthDate` |
| `src/teachers/dto/create-teacher.input.ts` | Cambiar campo `birthYear` → `birthDate` |
| `src/teachers/dto/update-teacher.input.ts` | Cambiar campo `birthYear` → `birthDate` |

El `teachers.service.ts` **no requiere cambios** (usa spread `...input` / `...updateData`, sin referencias explícitas al campo).

### Frontend
| Archivo | Acción |
|---|---|
| `modules/teachers/utils/document-validators.ts` | **Crear** — sistema genérico de validadores |
| `modules/teachers/hooks/use-update-teacher-personal-info.ts` | **Crear** — hook de mutation con refetch |
| `modules/teachers/types/teacher.ts` | Cambiar `birthYear` → `birthDate`, actualizar schema Zod |
| `modules/teachers/graphql/queries.ts` | Cambiar `birthYear` → `birthDate` en `GET_TEACHER` |
| `modules/teachers/graphql/mutations.ts` | Cambiar `birthYear` → `birthDate` en return de `UPDATE_TEACHER` |
| `modules/teachers/components/teacher-personal-info-card.tsx` | Cambiar display de `birthYear` → `birthDate` |
| `modules/teachers/components/teacher-personal-info-sheet.tsx` | Cambiar campo, conectar mutation, cambios UI |

**Patrones a reutilizar:**
- `modules/teachers/hooks/use-toggle-teacher-status.ts` — patrón `useMutation` con `refetchQueries`
- `modules/teachers/graphql/queries.ts` → `GET_TEACHER` — query a refrescar
- `components/ui/date-picker-input.tsx` — API: `value?: Date`, `onChange: (date: Date | undefined) => void`

---

## Pasos de Implementación

### BE-1: Migración Prisma — `birthYear` → `birthDate`
Ejecutar `pnpm prisma migrate dev --name rename_birth_year_to_birth_date`. El SQL generado debe ser:
```sql
ALTER TABLE "Teacher" RENAME COLUMN "birthYear" TO "birthDate";
ALTER TABLE "Teacher" ALTER COLUMN "birthDate" TYPE TIMESTAMP(3);
```
En `schema.prisma`, cambiar:
```prisma
birthYear  Int?
```
→
```prisma
birthDate  DateTime?
```

### BE-2: Actualizar entidad `teacher.entity.ts`
```ts
// Antes:
@Field(() => Int, { nullable: true })
birthYear?: number;

// Después:
@Field({ nullable: true })
birthDate?: Date;
```
Quitar el import de `Int` si no se usa en otro campo.

### BE-3: Actualizar DTOs `create-teacher.input.ts` y `update-teacher.input.ts`
```ts
// Antes:
@IsOptional()
@IsInt({ message: "El año de nacimiento debe ser un número" })
@Field(() => Int, { nullable: true })
birthYear?: number;

// Después:
@IsOptional()
@IsDate()
@Field({ nullable: true })
birthDate?: Date;
```
Cambiar imports: quitar `IsInt`, agregar `IsDate`.

---

### FE-1: Crear sistema de validadores de documentos
**Archivo nuevo:** `modules/teachers/utils/document-validators.ts`

```ts
interface DocumentValidator {
  validate(rawDigits: string): boolean
  format(rawDigits: string): string
  errorMessage: string
  maxLength: number
}
```

Implementar `dniArgentinaValidator`:
- `maxLength`: 8
- `validate`: `/^\d{7,8}$/.test(raw)` — acepta 7 u 8 dígitos (DNI viejos tienen 7)
- `format`: convierte `"12345678"` → `"12.345.678"` (agrupar de derecha a izquierda: 3, 3, resto)
- `errorMessage`: `'El DNI debe tener 7 u 8 dígitos'`

```ts
export const documentValidators: Partial<Record<TeacherDocumentType, DocumentValidator>> = {
  [TeacherDocumentType.DNI]: dniArgentinaValidator,
}
```
Para agregar otro país/tipo: solo agregar una entrada al registro.

---

### FE-2: Actualizar `teacher.ts` — tipos y schema Zod

**Interface `Teacher`:** `birthYear?: number` → `birthDate?: string` (ISO string de GraphQL)

**Interface `UpdateTeacherPersonalInfoInput`:** `birthYear?: number` → `birthDate?: Date`

**Schema `updateTeacherPersonalInfoSchema`:**
```ts
// Antes:
birthYear: z.number().int().positive().optional(),

// Después:
birthDate: z.date().optional(),
```

Agregar `.superRefine()` para validación condicional de documento:
```ts
.superRefine((data, ctx) => {
  if (data.documentType && data.documentNumber) {
    const validator = documentValidators[data.documentType]
    if (validator && !validator.validate(data.documentNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validator.errorMessage,
        path: ['documentNumber'],
      })
    }
  }
})
```

---

### FE-3: Actualizar queries y mutations GraphQL

**`queries.ts`** — en `GET_TEACHER`, reemplazar `birthYear` por `birthDate`:
```graphql
query GetTeacher($id: String!) {
  teacher(id: $id) {
    id
    firstName
    lastName
    birthDate   # era birthYear
    gender
    documentType
    documentNumber
    ...
  }
}
```

**`mutations.ts`** — en `UPDATE_TEACHER`, expandir el return:
```graphql
mutation UpdateTeacher($input: UpdateTeacherInput!) {
  updateTeacher(updateTeacherInput: $input) {
    id
    firstName
    lastName
    birthDate   # era birthYear
    gender
    documentType
    documentNumber
    status
  }
}
```

---

### FE-4: Crear `use-update-teacher-personal-info.ts`
Siguiendo exactamente el patrón de `use-toggle-teacher-status.ts`:

```ts
export function useUpdateTeacherPersonalInfo(teacherId: string) {
  const [updateTeacherMutation, { loading }] = useMutation(UPDATE_TEACHER, {
    refetchQueries: [{ query: GET_TEACHER, variables: { id: teacherId } }],
  })

  async function updatePersonalInfo(data: UpdateTeacherPersonalInfoInput) {
    await updateTeacherMutation({
      variables: { input: { id: teacherId, ...data } },
    })
  }

  return { updatePersonalInfo, loading }
}
```

---

### FE-5: Actualizar `teacher-personal-info-card.tsx`
Cambiar la línea que muestra el año de nacimiento para mostrar `birthDate` formateado:
```ts
// Antes: teacher.birthYear
// Después: teacher.birthDate ? formatDate(teacher.birthDate) : '—'
// Usar formatDate de lib/utils/helpers.ts si existe, o format(new Date(teacher.birthDate), 'dd/MM/yyyy')
```

---

### FE-6: Actualizar `teacher-personal-info-sheet.tsx`

**A) Labels:**
- Remover `(opcional)` de Año de nacimiento, Género, Tipo de documento, Número de documento
- Agregar `<span className="text-red-500">*</span>` en Nombre y Apellido

**B) Validación del formulario:**
- `mode: 'onBlur'` → `mode: 'onSubmit'`
- Mantener `reValidateMode: 'onChange'`
- Botón: `disabled={!form.formState.isValid}` → `disabled={loading}`

**C) Campo `birthDate` — DatePickerInput:**
```tsx
defaultValues: {
  birthDate: teacher.birthDate ? new Date(teacher.birthDate) : undefined,
}

// En el render:
<DatePickerInput
  value={field.value}
  onChange={field.onChange}
  maxDate={new Date()}
  minDate={new Date('1900-01-01')}
/>
```

**D) Campo `documentNumber` con formateo condicional:**
```tsx
const watchedDocumentType = form.watch('documentType')
const documentValidator = watchedDocumentType ? documentValidators[watchedDocumentType] : undefined

// En el render del campo documentNumber:
<Input
  inputMode={documentValidator ? 'numeric' : 'text'}
  placeholder={documentValidator ? 'ej: 12.345.678' : 'ej: 12345678'}
  value={documentValidator ? documentValidator.format(field.value ?? '') : (field.value ?? '')}
  onChange={(e) => {
    if (documentValidator) {
      const digits = e.target.value.replace(/\D/g, '').slice(0, documentValidator.maxLength)
      field.onChange(digits)
    } else {
      field.onChange(e.target.value)
    }
  }}
/>
```

**E) Conectar mutation:**
```ts
const { updatePersonalInfo, loading } = useUpdateTeacherPersonalInfo(teacher.id)

const handleSubmit = async (data: UpdateTeacherPersonalInfoInput) => {
  try {
    await updatePersonalInfo(data)
    toast.success('Información personal actualizada')
    onSaved?.()
    handleOpenChange(false)
  } catch (_error) {
    toast.error('Error al actualizar información')
  }
}
```

---

## Verificación

1. **Labels**: Abrir sheet → sin "(opcional)", asterisco en nombre y apellido
2. **Validación al submit**: Borrar nombre → Guardar → error debajo del campo, no se llama mutation
3. **DatePicker fecha completa**: Seleccionar 15/03/1990 → se guarda fecha completa → card muestra "15/03/1990"
4. **DNI format**: Seleccionar tipo DNI → escribir `12345678` → se muestra `12.345.678` en tiempo real
5. **DNI inválido**: Ingresar `123` → Guardar → error "El DNI debe tener 7 u 8 dígitos"
6. **Guardar exitoso**: Datos válidos → Guardar → mutation ejecuta → card actualiza → sheet cierra
7. **Extensibilidad**: Para agregar PASSPORT validator, solo agregar entry en `documentValidators` en FE-1
