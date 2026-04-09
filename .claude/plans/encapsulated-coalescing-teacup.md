# Plan: Create Family Sheet

## Context
The Families page has a "+ Nueva Familia" button that currently does nothing. The user wants a sheet that opens when clicking the button, with a single field for the family name. This requires both a backend `createFamily` mutation and a frontend sheet component.

---

## Backend Changes

### 1. DTO: `be/src/families/dto/create-family.input.ts` (NEW)
```ts
@InputType()
export class CreateFamilyInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;
}
```

### 2. Service: `be/src/families/families.service.ts`
Add `create(input: CreateFamilyInput, academyId: string)`:
```ts
async create(input: CreateFamilyInput, academyId: string): Promise<Family> {
  const family = await this.prisma.family.create({
    data: { name: input.name, academyId },
    include: { students: { include: { student: true } }, guardians: true },
  });
  return mapFamilyToEntity(family);
}
```

### 3. Resolver: `be/src/families/families.resolver.ts`
Add mutation:
```ts
@Mutation(() => Family)
createFamily(
  @Args('createFamilyInput') input: CreateFamilyInput,
  @CurrentUser() user: User,
) {
  return this.familiesService.create(input, user.academyId);
}
```

No migration needed — `Family` model already exists in Prisma schema.

---

## Frontend Changes

### 4. Mutations: `web/modules/families/graphql/mutations.ts` (NEW)
```ts
export const CREATE_FAMILY = gql`
  mutation CreateFamily($input: CreateFamilyInput!) {
    createFamily(createFamilyInput: $input) {
      id
      name
      membersCount
      createdAt
    }
  }
`
```

### 5. Types: update `web/modules/families/types/index.ts`
Add Zod schema and form type:
```ts
export const createFamilySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
})
export type CreateFamilyFormInput = z.infer<typeof createFamilySchema>
```

### 6. Sheet: `web/modules/families/components/create-family-sheet.tsx` (NEW)
Follows the `create-student-sheet.tsx` pattern exactly:
- Props: `{ open, onOpenChange, onFamilyCreated? }`
- `useMutation(CREATE_FAMILY)`
- `useForm` with zodResolver and `createFamilySchema`
- On success: `toast.success`, call `onFamilyCreated?.()`, close sheet
- On close: `form.reset()` + `form.clearErrors()`
- Single `FormField` for `name`

### 7. Page: `web/app/(authenticated)/families/page.tsx`
- Add `useState` for `isCreateSheetOpen`
- Wire `onClick` on "+ Nueva Familia" button
- Add `<CreateFamilySheet>` component with `onFamilyCreated={() => refetch()}`

---

## Verification
1. Start backend: `npm run start:dev` — check GraphQL schema includes `createFamily` mutation
2. Open Families page → click "+ Nueva Familia" → sheet opens
3. Submit with a name → family appears in the list
4. Submit with empty name → validation error shown inline
