---
name: doc-plan
description: Use when someone asks to generate documentation from a feature plan, create documentation from an implementation plan, document a newly implemented feature, or prepare feature docs.
argument-hint: [feature-name]
disable-model-invocation: true
---

## What This Skill Does

Lee un plan de feature (FE o BE) y genera documentación completa lista para revisar y agregar a `/docs`.

**Autodetección**: Se adapta automáticamente según desde dónde se ejecuta:
- Desde `/web` → Lee `/web/docs/plans/[feature]-frontend.md`
- Desde `/be` → Lee `/be/docs/plans/[feature]-backend.md`

## Inputs

- Feature name (via argument, e.g., `teachers` o `invoice-payments`)
- Plan file (autodetectado según ubicación actual):
  - Si en `/web`: `/web/docs/plans/$FEATURE-NAME-frontend.md`
  - Si en `/be`: `/be/docs/plans/$FEATURE-NAME-backend.md`
- Project context from memory (documentation structure, existing patterns)

## Outputs

- Single markdown file: Generated and shown to user (preview, not written to disk yet)
- Contains: mutations, queries, data flows, decisions, module details, edge cases, testing recommendations
- User reviews in chat before running `/doc-add` to commit

## Steps

1. **Validate input**
   - Feature name provided? If not, ask user
   - Detect current project location: `/web` o `/be`
   - Buscar plan file en:
     - Si `/web`: `/web/docs/plans/$FEATURE-NAME-frontend.md`
     - Si `/be`: `/be/docs/plans/$FEATURE-NAME-backend.md`
   - Si no existe, pedir al usuario que cree el plan primero

2. **Read and analyze plan**
   - Read the plan file completely
   - Extract:
     - Feature name, description, why it matters
     - Mutations added (names, inputs, outputs, side effects, multi-tenant handling)
     - Queries added (names, inputs, outputs, filters)
     - Data flows affected or new flows created
     - Architectural decisions made
     - Module changes (new or updated)
     - Edge cases, constraints, error handling
     - Multi-tenant considerations (academyId filtering, etc.)

3. **Generate comprehensive documentation**
   - Create detailed markdown following template below
   - Include examples, code patterns, rationale
   - Cross-link to existing docs (mutations/index.md, queries/index.md, etc.)
   - Make it detailed enough to be the source of truth

4. **Output to user for review**
   - Show complete generated documentation in chat
   - Summary at top: how many mutations, queries, flows, decisions
   - Prompt: "Review above. If looks good, run `/doc-add $FEATURE-NAME`. Or ask me to refine."

## Documentation Template

```markdown
# Feature: $FEATURE-NAME

**Status**: Newly implemented
**Date**: [Today]
**Plan Reference**: `/be/docs/plans/$FEATURE-NAME/plan.md`

---

## Overview
[1-2 sentences describing the feature and why it matters]

---

## Mutations

[For each mutation added, include:]

### mutationName(input): OutputType
- **Purpose**: [What it does in 1 sentence]
- **Auth**: Required (SupabaseAuthGuard)
- **Input**:
  - `fieldName` (String!, optional, default): [Description of what this field is and why]
  - [repeat for all fields]
- **Output**: [Response type name]
- **Side Effects**: 
  - [What changes in DB]
  - [What other records are affected]
  - [Cascades or triggers]
- **Multi-Tenant**: 
  - Filters by: `user.academyId`
  - Ownership verified: [Yes/No, where]
- **Edge Cases**:
  - If [scenario 1]: [how handled, what exception/result]
  - If [scenario 2]: [how handled, what exception/result]
  - If [scenario 3]: [how handled, what exception/result]
- **Related**: [Links to related mutations/queries]
- **Example**:
  ```
  mutation {
    mutationName(input: {field: "value"}) {
      id
      field
    }
  }
  ```

[Repeat for each mutation]

---

## Queries

[For each query added, include:]

### queryName(input): OutputType
- **Purpose**: [What it retrieves and why]
- **Auth**: Required (SupabaseAuthGuard)
- **Input**:
  - `fieldName` (String!, optional): [Description]
  - [repeat for all fields]
- **Output**: [Response type]
- **Filters**: [Available filters and what they do]
- **Pagination**: [If applicable: page size, default limit, etc.]
- **Multi-Tenant**: 
  - Filters by: `user.academyId`
  - No cross-tenant data: [Confirm yes/no]
- **Performance**: [Any special considerations, indexes used, etc.]
- **Edge Cases**:
  - If [scenario]: [result]
  - [repeat]
- **Related**: [Links]
- **Example**:
  ```
  query {
    queryName(filter: {}) {
      id
      field
    }
  }
  ```

[Repeat for each query]

---

## Data Flows

[For each new flow or affected flow, include:]

### Flow Name: [Name]
**Triggered by**: [Which mutation/action starts it]
**Participants**: [Models/entities involved: Invoice, Payment, StudentCredit, etc.]

**Flow Steps**:
1. [Step 1 — what happens, which DB changes]
2. [Step 2 — what changes, effects]
3. [Step 3 — finalize, what's the end state]

**State Machine**:
```
STATE1 [action] → STATE2 [action] → STATE3
```

**Key Calculations**: [If any math/aggregations: formulas, examples]

**Edge Cases**:
- If [scenario 1]: [result, exception, fallback]
- If [scenario 2]: [result, exception, fallback]
- If [error condition]: [error type, message to user]
- If [boundary case]: [how handled]

**Audit Trail**: [What's logged for compliance/debugging]

**Related Flows**: [Links to other flows this connects to]

[Repeat for each flow]

---

## Architectural Decisions

[For each decision made in the plan, include:]

### Decision: [Decision Name]

**What**: [What we decided to do]

**Why**: [Rationale — business need, technical constraint, performance, etc.]

**Alternatives Considered**: 
- [Alternative 1]: [Why we rejected it]
- [Alternative 2]: [Why we rejected it]

**Impact**: 
- [Impact on system]
- [Impact on other modules]
- [Performance implications if any]

**Constraints**: [Any limitations or requirements this introduces]

**Trade-offs**: [What we gave up]

**Future Considerations**: [What might need to change later]

[Repeat for each decision]

---

## Module Documentation

[For each module touched, include:]

### Module: [ModuleName]

**New/Changed Components**:
- [Component 1]: [What changed and why]
- [Component 2]: [What changed and why]

**Related Entities**: [Student, Invoice, Charge, etc. — which models this module touches]

**New Operations**:
- [Operation name]: [Brief description]
- [repeat]

**Dependencies**: [Other modules this depends on, new or changed]

**Data Contracts**: [If interfaces/types changed, document]

**Backwards Compatibility**: [Is this breaking? Migration needed?]

---

## Edge Cases & Error Handling

[Comprehensive list of edge cases and how they're handled]

- **Case**: [Specific scenario]
  → **Handled by**: [Which code/function]
  → **Result**: [What user sees/what happens]
  → **Edge case type**: [Validation, race condition, cascade, etc.]

- **Error**: [Specific error condition]
  → **Exception type**: [BadRequestException, etc.]
  → **Message**: [User-facing error message]
  → **Recovery**: [Can user retry? What should they do?]

[Continue for all edge cases]

---

## Multi-Tenant Considerations

- **academyId Filter**: [Where applied, how enforced]
- **Ownership Verification**: [Which operations verify `assertOwnership`]
- **Data Isolation**: [Any special handling to prevent data leaks]
- **Feature Gates**: [Any operations behind feature flags?]
- **Cross-Academy Risks**: [Are there any? How mitigated?]

---

## Testing Recommendations

[Specific test cases to write]

- **Unit Tests**:
  - [Test case 1 — what it tests]
  - [Test case 2]
  - [Test case 3]

- **Integration Tests**:
  - [Test case 1 — involves multiple modules]
  - [Test case 2]

- **Multi-Tenant Tests**:
  - [Verify academy1 cannot read academy2 data]
  - [Verify filters work correctly]

- **Edge Case Tests**:
  - [Test scenario 1]
  - [Test scenario 2]

---

## Performance Considerations

[If applicable]

- **Database Queries**: [New indexes needed? Join complexity?]
- **Caching**: [Any data that should be cached?]
- **Rate Limits**: [Any operations that should be throttled?]
- **Async Jobs**: [Operations that should use Trigger.dev?]

---

## Related Documentation

- [Link to `/be/docs/mutations/index.md` if mutations were added]
- [Link to `/be/docs/queries/index.md` if queries were added]
- [Link to `/be/docs/data-flows/[flow-name].md` if new flows]
- [Link to `/be/docs/modules/[module-name].md` if module docs changed]
- [Link to `/be/docs/decisions/architectural.md` if decisions added]
- Plan file: [`/be/docs/plans/$FEATURE-NAME/plan.md`]
```

## Notes

- **Don't write to /docs yet** — That's what `/doc-add` does. This skill just generates preview.
- **Be comprehensive** — This doc is the source of truth for the feature. Include examples, edge cases, rationale.
- **Cross-link everything** — Link to mutations/queries/flows/modules/decisions so everything connects.
- **Multi-tenant everywhere** — Every mutation/query must explain academyId filtering.
- **If plan is sparse** — Generate best-effort docs with `[TODO: clarify...]` for missing details. Ask user to fill in.
- **Code examples** — Include GraphQL query/mutation examples showing real usage.
- **State machines** — Draw them for complex flows so intent is clear.
