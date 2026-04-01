---
name: doc-add
description: Agrega documentación generada por /doc-plan a /docs, actualiza índices y cross-links. Funciona en FE y BE.
argument-hint: [feature-name]
disable-model-invocation: true
---

## What This Skill Does

Toma la documentación generada por `/doc-plan` y la agrega a `/docs/features/[feature-name].md`, actualizando índices y cross-links.

**Autodetección**: Se adapta automáticamente según desde dónde se ejecuta:
- Desde `/web` → Agrega a `/web/docs/features/`
- Desde `/be` → Agrega a `/docs/features/`

**Prerequisite**: Ejecutar `/doc-plan $FEATURE-NAME` primero y revisar el output.

## Inputs

- Feature name (via argument)
- Documentation from previous `/doc-plan` run (user should paste or have it fresh in context)
- Docs structure at `/docs/` (autodetectado: `/web/docs/` o `/docs/`)

## Outputs

- Creates: `/docs/features/$FEATURE-NAME.md` (comprehensive feature doc)
- Updates:
  - `/docs/DOCUMENTATION_INDEX.md` (adds to feature list)
  - `/docs/README.md` (if appropriate)
  - `/docs/mutations/index.md` (adds mutations to summary table)
  - `/docs/queries/index.md` (adds queries to summary table)
  - Project memory at `/~/.claude/projects/.../be/memory/` (logs new feature docs)
- Adds cross-links in relevant `/docs/modules/` docs if module was changed

## Steps

1. **Validate prerequisite**
   - Feature name provided? If not, ask user
   - Documentation generated? Ask user: "Did you run `/doc-plan $FEATURE-NAME` and review the output?"
   - If not, stop and direct to `/doc-plan` first

2. **Confirm documentation content**
   - Ask user to paste or confirm the documentation is ready
   - Quick sanity check: Does it have Mutations/Queries/Data Flows sections?
   - If missing, ask user to run `/doc-plan` again with more detail

3. **Create feature documentation file**
   - Write to `/docs/features/$FEATURE-NAME.md`
   - Use exactly the content from `/doc-plan` output
   - Confirm file was created with no errors

4. **Update mutations/index.md**
   - If doc contains Mutations section:
     - Extract mutation names
     - Add to the "### Mutations" section at top of mutations/index.md
     - Format: `### mutationName` with link to `/docs/features/$FEATURE-NAME.md#mutationname`
     - Update summary table with count and feature name
   - If no mutations, skip this step

5. **Update queries/index.md**
   - If doc contains Queries section:
     - Extract query names
     - Add to "### Queries" section
     - Format: `### queryName` with link to feature doc
     - Update summary table
   - If no queries, skip

6. **Update DOCUMENTATION_INDEX.md**
   - Find "## Features" section (or create if missing)
   - Add entry: `- [$FEATURE-NAME](./features/$FEATURE-NAME.md) — [one-line description]`
   - Update feature count stat: `| Features | N | ✅ Complete |`

7. **Update module docs (if applicable)**
   - If doc mentions module changes:
     - Read `/docs/modules/$MODULE-NAME.md`
     - Add link or reference to new feature doc
     - Example: "See also [Feature X](../features/$FEATURE-NAME.md)"
   - If module doc doesn't exist and feature doc mentions new module:
     - Ask user: "Should we create `/docs/modules/$MODULE-NAME.md`?"

8. **Update project memory**
   - Add entry to `/~/.claude/projects/.../be/memory/documentation_created.md`
   - Log: Feature name, what was documented (mutations, queries, flows, decisions, etc.), date

9. **Update README.md** (if appropriate)
   - If feature is a major data flow (e.g., Payment Processing, Invoice Generation):
     - Add to "## Quick Navigation by Task" section
     - Example: "**I want to understand payments?** → [Payment Processing Feature](./features/payment-processing.md)"

10. **Verify and confirm**
    - List all files modified
    - Summary: "✅ Documentation added! Feature: $FEATURE-NAME, Mutations: N, Queries: N, Flows: N"
    - Prompt: "Run `git status` to see changes, then create a commit with `/commit` or similar."

## Verification Checklist

Before marking complete, verify:

- [ ] `/docs/features/$FEATURE-NAME.md` exists and has all sections
- [ ] `/docs/DOCUMENTATION_INDEX.md` lists the feature
- [ ] `/docs/mutations/index.md` updated if mutations were added
- [ ] `/docs/queries/index.md` updated if queries were added
- [ ] `/docs/modules/[module].md` updated if module was touched
- [ ] Project memory logged the new feature
- [ ] All cross-links are correct (no 404s)
- [ ] Summary table counts are accurate

## File Path Reference

All paths relative to project root:

```
/docs/
├── features/
│   └── $FEATURE-NAME.md ← NEW FILE HERE
├── mutations/index.md ← UPDATE
├── queries/index.md ← UPDATE
├── DOCUMENTATION_INDEX.md ← UPDATE
├── README.md ← UPDATE (optional)
└── modules/
    └── [module].md ← UPDATE (if touched)
```

## Notes

- **This skill commits changes** — Don't do anything else until user reviews
- **One feature at a time** — Each `/doc-add` handles one feature
- **Always link back** — Feature doc should link to plan file, mutations, queries, modules
- **Update indexes thoroughly** — Every new mutation/query/module should appear in indexes
- **Cross-links critical** — Make sure navigation works (test clicking links)
- **If module doc doesn't exist** — Offer to create basic skeleton doc
- **Backwards compatible** — Adding docs doesn't change code, so no breaking changes
