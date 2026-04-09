# Plan: Fix PersonAvatar `size` prop

## Context
`PersonAvatar` (`components/common/person-avatar.tsx`) already exists and is the correct component to use throughout the app. It's already wired in `FamilyTutorsSection` and `AvatarGroup`. However, the `size` prop is declared in the TypeScript interface but **never applied in the render output** — so all avatars render at the same default size regardless of what's passed.

## What needs to change

### 1. Fix `PersonAvatar` to apply the `size` prop

**File:** `web/components/common/person-avatar.tsx`

Add a size map and apply it to both variants:

```ts
const sizeClasses = {
  sm: 'size-7',   // 28px — used in AvatarGroup (matches +N counter h-7 w-7)
  md: 'size-8',   // 32px — default
  lg: 'size-10',  // 40px — used in list/detail contexts
}
```

- `default` variant: pass `sizeClasses[size]` into `cn('shrink-0', sizeClasses[size], className)` on `<Avatar>`
- `simple` variant: replace hardcoded `size-8` with `sizeClasses[size]`

### 2. Guardian hero card
`web/modules/families/components/guardian-hero-card.tsx` passes `h-16 w-16` directly as `className`. This overrides the Avatar size and works fine as-is — no change needed since `className` already overrides the size class.

## Files to modify
- `web/components/common/person-avatar.tsx` — only file needing changes

## Verification
- Families table: guardians column shows small (`sm`) stacked avatars matching the `+N` counter size
- Family detail tutor list: `PersonAvatar` without size prop uses `md` (32px) by default
- Guardian hero card: `className="h-16 w-16"` still overrides correctly
