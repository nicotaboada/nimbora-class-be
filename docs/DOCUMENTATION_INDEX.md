# Documentation Index

Complete list of all documentation created.

## 📁 Structure

```
/docs
├── README.md (THIS IS YOUR START HERE)
├── DOCUMENTATION_INDEX.md (You are here)
├── /schema
│   ├── schema.md (TODO: Full schema breakdown)
│   ├── relationships.md (TODO: Entity relationships)
│   └── multi-tenant.md ✅ DONE
├── /mutations
│   └── index.md ✅ DONE (25 mutations documented)
├── /queries
│   └── index.md ✅ DONE (21 queries documented)
├── /data-flows
│   ├── index.md ✅ DONE
│   ├── fee-management.md ✅ DONE
│   ├── invoice-generation.md ✅ DONE
│   ├── payment-processing.md ✅ DONE
│   └── afip-fiscalization.md ✅ DONE
├── /modules
│   ├── invoices.md ✅ DONE
│   ├── students.md (TODO)
│   ├── fees.md (TODO)
│   ├── charges.md (TODO)
│   ├── payments.md (TODO)
│   ├── afip.md (TODO)
│   └── billing-profiles.md (TODO)
├── /architecture
│   ├── overview.md (TODO)
│   ├── setup.md (TODO)
│   └── layers.md (TODO)
├── /integration
│   ├── afip.md (TODO)
│   ├── auth.md (TODO)
│   └── trigger-dev.md (TODO)
└── /decisions
    ├── architectural.md ✅ DONE (15 decisions)
    ├── technical.md ✅ DONE (12 decisions)
    └── database.md (TODO)
```

---

## ✅ Completed Documentation

### Data Flows (Complete)
1. **[Fee Management](./data-flows/fee-management.md)** — How fees are created and assigned
2. **[Invoice Generation](./data-flows/invoice-generation.md)** — How invoices are created and modified
3. **[Payment Processing](./data-flows/payment-processing.md)** — How payments are recorded and affect invoices
4. **[AFIP Fiscalization](./data-flows/afip-fiscalization.md)** — How invoices are emitted to tax authority

### API Documentation (Complete)
1. **[Mutations](./mutations/index.md)** — 25 mutations across 8 modules
   - Students (3)
   - Fees (7)
   - Charges (2)
   - Invoices (5)
   - Payments (2)
   - AFIP (3)
   - Billing Profiles (2)
   - Feature Flags (1)

2. **[Queries](./queries/index.md)** — 21 queries across 8 modules
   - Students (3)
   - Fees (2)
   - Charges (6)
   - Invoices (3)
   - Payments (2)
   - Billing Profiles (2)
   - AFIP (2)
   - Feature Flags (1)

### Design Decisions (Complete)
1. **[Architectural Decisions](./decisions/architectural.md)** — 15 high-level decisions
   - Module-based architecture
   - Soft deletes over hard deletes
   - Cache fields with backend computation
   - Separate Charge model
   - Separate AfipInvoice model
   - Multi-tenant by academyId
   - Async jobs via Trigger.dev
   - Enum-based status fields
   - DTOs with class-validator
   - Prisma as ORM
   - GraphQL over REST
   - Supabase auth
   - Partial unique constraints
   - Mapper functions
   - Cascade deletes

2. **[Technical Decisions](./decisions/technical.md)** — 12 code-level decisions
   - Mapper functions
   - Separate DTOs for create/update
   - isActive flags
   - Enums in database
   - Partial unique indexes
   - Service vs. Resolver responsibilities
   - Prisma relations
   - Zod for validation
   - Try-catch for Prisma errors
   - Indexes on filtered fields
   - PrismaService singleton
   - Custom decorators

### Schema & Multi-Tenancy
1. **[Multi-Tenant Architecture](./schema/multi-tenant.md)** — How tenancy is enforced
   - Database structure (academyId everywhere)
   - Application layer (JWT + filter + verify)
   - Multi-tenant patterns
   - Feature flags per academy
   - Testing multi-tenancy

### Modules
1. **[Invoices Module](./modules/invoices.md)** — Billing documents and line items

---

## 📝 TODO Documentation

**High Priority** (required for completeness):
- [ ] Schema breakdown (full schema with all models)
- [ ] Entity relationships (diagram or detailed table)
- [ ] Student module
- [ ] Fees module
- [ ] Charges module
- [ ] Payments module
- [ ] AFIP module
- [ ] Billing Profiles module

**Medium Priority** (helpful for context):
- [ ] Architecture overview
- [ ] Setup guide (dev environment)
- [ ] Database design decisions
- [ ] AFIP integration details
- [ ] Auth integration details
- [ ] Trigger.dev integration details

**Low Priority** (nice-to-have):
- [ ] Troubleshooting guide
- [ ] Performance tuning
- [ ] Monitoring & observability
- [ ] Disaster recovery

---

## 🎯 Quick Navigation by Role

### Product Manager
- [Data Flows](./data-flows/index.md) — Understand how features work
- [Architectural Decisions](./decisions/architectural.md) — Understand why we built it this way

### Backend Developer
- [README](./README.md) — Start here
- [Data Flows](./data-flows/index.md) — Understand the workflows
- [Mutations](./mutations/index.md) — What changes the system
- [Queries](./queries/index.md) — What reads the system
- [Decisions](./decisions/) — Why we made certain choices

### Frontend Developer
- [Mutations](./mutations/index.md) — Input/output types for changes
- [Queries](./queries/index.md) — Input/output types for reads
- [Data Flows](./data-flows/index.md) — Understand invoice, payment flows

### Onboarding New Engineer
1. Read [README](./README.md)
2. Read [Architecture Overview](./architecture/overview.md) (when created)
3. Understand [Multi-Tenant Architecture](./schema/multi-tenant.md)
4. Pick a data flow ([Invoice Gen](./data-flows/invoice-generation.md), [Payments](./data-flows/payment-processing.md), etc.)
5. Read [Architectural Decisions](./decisions/architectural.md)
6. Read [Technical Decisions](./decisions/technical.md)
7. Start with a module ([Invoices](./modules/invoices.md), etc.)

### DevOps/Infrastructure
- [Architecture Overview](./architecture/overview.md) — System design
- [Setup Guide](./architecture/setup.md) — How to run locally
- Integration docs (when created)

---

## 📊 Documentation Stats

| Category | Count | Status |
|----------|-------|--------|
| Data Flows | 4 | ✅ Complete |
| Mutations | 25 | ✅ Complete |
| Queries | 21 | ✅ Complete |
| Architectural Decisions | 15 | ✅ Complete |
| Technical Decisions | 12 | ✅ Complete |
| Modules | 1 | 🔄 In Progress |
| Schema | 1 | ✅ Complete (multi-tenant) |
| **Total** | **79** | ~60% done |

---

## 🔄 Maintenance

**When adding a new mutation:**
1. Document it in [mutations/index.md](./mutations/index.md)
2. Add to the summary table
3. Update this index

**When making an architectural decision:**
1. Document it in [decisions/architectural.md](./decisions/architectural.md)
2. Link from relevant data flows or modules
3. Update this index

**When creating a new data flow:**
1. Create `/data-flows/[flow-name].md`
2. Link from [data-flows/index.md](./data-flows/index.md)
3. Update this index

---

## 🚀 Next Steps

1. **Complete TODO items** — Fill in missing module docs and architecture
2. **Keep updated** — Update docs when code changes
3. **Cross-link** — Add links between related docs
4. **Examples** — Add code examples to complex flows
5. **Diagrams** — Consider adding visual diagrams for data flows

---

**Last Updated**: 2026-03-31
**Estimated Completion**: ~80% coverage with current docs, 100% achievable with TODO items
