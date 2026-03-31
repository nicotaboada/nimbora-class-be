# Backend Documentation

Complete documentation of the Nimbora SaaS backend. Everything is documented here for reference and onboarding.

## 📋 Table of Contents

### Getting Started
- [Architecture Overview](./architecture/overview.md) — High-level architecture decisions and patterns
- [Project Setup](./architecture/setup.md) — Development environment setup

### Data & Schema
- [Database Schema](./schema/schema.md) — Complete Prisma schema analysis
- [Entity Relationships](./schema/relationships.md) — Data model and relationships
- [Multi-Tenant Architecture](./schema/multi-tenant.md) — How tenancy is enforced

### API
- [GraphQL Mutations](./mutations/index.md) — Complete list of mutations by module
- [GraphQL Queries](./queries/index.md) — Complete list of queries by module
- [Input & Output Types](./types/index.md) — DTOs and response types

### Workflows
- [Data Flows](./data-flows/index.md) — Key business workflows
  - [Invoice Generation](./data-flows/invoice-generation.md)
  - [Payment Processing](./data-flows/payment-processing.md)
  - [AFIP Fiscalization](./data-flows/afip-fiscalization.md)
  - [Fee Management](./data-flows/fee-management.md)

### Modules
- [Students Module](./modules/students.md)
- [Fees Module](./modules/fees.md)
- [Charges Module](./modules/charges.md)
- [Invoices Module](./modules/invoices.md)
- [Payments Module](./modules/payments.md)
- [AFIP Module](./modules/afip.md)
- [Billing Profiles Module](./modules/billing-profiles.md)

### Decisions
- [Technical Decisions](./decisions/technical.md) — Why we chose certain patterns
- [Architectural Decisions](./decisions/architectural.md) — High-level design decisions
- [Database Design](./decisions/database.md) — Schema design rationale

### Integration
- [AFIP Integration](./integration/afip.md) — Argentina tax authority integration
- [Supabase Auth](./integration/auth.md) — Authentication setup
- [Trigger.dev](./integration/trigger-dev.md) — Async job framework

---

## Quick Navigation by Task

**I want to understand how...**
- ...invoices are created? → [Invoice Generation Flow](./data-flows/invoice-generation.md)
- ...payments work? → [Payment Processing](./data-flows/payment-processing.md)
- ...fees are assigned? → [Fee Management](./data-flows/fee-management.md)
- ...AFIP fiscalization works? → [AFIP Fiscalization](./data-flows/afip-fiscalization.md)

**I want to add/modify...**
- ...a mutation? → [GraphQL Mutations](./mutations/index.md)
- ...a query? → [Queries](./queries/index.md)
- ...a database table? → [Schema](./schema/schema.md)
- ...a feature? → See [Modules](#modules) section

**I want to know why...**
- ...we did X instead of Y? → [Technical Decisions](./decisions/technical.md)

---

## Key Principles

1. **Multi-Tenant**: Every query filters by `academyId`. No data leaks.
2. **Soft Deletes**: Use `isActive` flags and status enums instead of hard deletes.
3. **Cache Fields**: Invoice totals are computed in backend, not trusted from DB.
4. **Audit Trail**: Keep records for compliance and debugging.
5. **Async Jobs**: Use Trigger.dev for long-running tasks.

---

## File Structure

```
/docs
├── README.md                          # This file
├── /schema                            # Database schema
│   ├── schema.md                      # Complete schema breakdown
│   ├── relationships.md               # Entity relationships
│   └── multi-tenant.md                # Tenant isolation
├── /mutations                         # GraphQL mutations
│   └── index.md                       # All mutations by module
├── /queries                           # GraphQL queries
│   └── index.md                       # All queries by module
├── /types                             # Input/Output types
│   └── index.md
├── /data-flows                        # Business workflows
│   ├── index.md
│   ├── invoice-generation.md
│   ├── payment-processing.md
│   ├── fee-management.md
│   └── afip-fiscalization.md
├── /modules                           # Module-specific docs
│   ├── students.md
│   ├── fees.md
│   ├── charges.md
│   ├── invoices.md
│   ├── payments.md
│   ├── afip.md
│   └── billing-profiles.md
├── /architecture                      # System design
│   ├── overview.md
│   ├── setup.md
│   └── layers.md
├── /integration                       # External services
│   ├── afip.md
│   ├── auth.md
│   └── trigger-dev.md
└── /decisions                         # Design decisions
    ├── technical.md
    ├── architectural.md
    └── database.md
```

---

## Latest Updates

**When adding new features:**
1. Create/update the relevant `.md` file in this docs folder
2. Update this README with links
3. Add to the appropriate section (Modules, Data Flows, etc.)

**When making decisions:**
1. Document the decision in `/decisions`
2. Include "Why?" section with reasoning
3. Link from relevant docs

---

## Contributing to Docs

Keep these principles when documenting:
- **Be specific**: "We use soft deletes because..." (not just "We use soft deletes")
- **Include examples**: Code samples for complex flows
- **Link everything**: Cross-reference related docs
- **Update on change**: If code changes, update docs immediately
- **Explain decisions**: Not just what, but why

---

## Quick Reference

### Most Important Docs
- **New to the project?** → [Architecture Overview](./architecture/overview.md)
- **Need to understand data flow?** → [Data Flows](./data-flows/index.md)
- **Adding a mutation?** → [GraphQL Mutations](./mutations/index.md)
- **Wondering why we did X?** → [Architectural Decisions](./decisions/architectural.md)
- **Working on invoices?** → [Invoice Generation](./data-flows/invoice-generation.md)
- **Working on AFIP?** → [AFIP Fiscalization](./data-flows/afip-fiscalization.md)

### Checklists for Common Tasks

**Adding a new field to a model**
- [ ] Update Prisma schema
- [ ] Run `prisma migrate dev`
- [ ] Update GraphQL entity (@Field decorator)
- [ ] Update DTO if input/output changed
- [ ] Update mapper function
- [ ] Update tests

**Adding a new mutation**
- [ ] Create DTO (input/output)
- [ ] Create mutation in resolver
- [ ] Implement in service
- [ ] Add multi-tenant check (academyId filter)
- [ ] Write tests
- [ ] Document in [mutations/index.md](./mutations/index.md)

**Adding a new query**
- [ ] Create output type/entity if needed
- [ ] Create query in resolver
- [ ] Implement in service
- [ ] Add multi-tenant filter
- [ ] Write tests
- [ ] Document in [queries/index.md](./queries/index.md)

---

**Last Updated**: 2026-03-31
