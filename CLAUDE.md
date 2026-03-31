# CLAUDE.md - Backend Project Guidelines

## Quick Context
- **Framework**: NestJS 11 with GraphQL (Apollo Server 5)
- **Database**: PostgreSQL + Prisma 5 ORM
- **Language**: TypeScript 5.7
- **Auth**: Supabase JWT
- **Async Jobs**: Trigger.dev v4 SDK
- **Package Manager**: npm
- **Architecture**: Feature-based modules with multi-tenant support (academyId)

## Directory Structure

### `/src/[feature]` - Feature Modules
Self-contained, reusable modules following NestJS standards:
```
/src/students/
  ├── students.module.ts         # Module definition
  ├── students.resolver.ts       # GraphQL queries/mutations
  ├── students.service.ts        # Business logic (Injectable)
  ├── /dto                       # Input/Output DTOs (validated with class-validator)
  │   ├── create-student.input.ts
  │   ├── update-student.input.ts
  │   └── paginated-students.output.ts
  ├── /entities                  # GraphQL @ObjectType definitions
  │   ├── student.entity.ts      # GraphQL type (NOT database model)
  │   └── student-stats.entity.ts
  ├── /enums                     # Enum definitions
  │   └── student-status.enum.ts
  ├── /types                     # TypeScript interfaces (internal)
  │   └── student.types.ts
  └── /utils                     # Mapper functions, helpers
      └── student-mapper.util.ts

Features: academies, auth, billing-profiles, bulk-operations, charges,
credits, email, feature-flags, fees, invoices, payments, students, users, afip
```

### `/prisma`
```
schema.prisma              # Database schema
migrations/                # Migration files (auto-generated)
```

### `/src/auth` & `/src/common`
```
/auth
  /guards              # SupabaseAuthGuard, RoleGuard
  /decorators          # @CurrentUser(), @RequireRole()

/common
  /utils               # Shared: assertOwnership, error handling
```

## Key Patterns

### Resolver (GraphQL Endpoints)
```ts
@Resolver(() => Student)
@UseGuards(SupabaseAuthGuard)  // All queries/mutations need auth
export class StudentsResolver {
  constructor(private readonly studentsService: StudentsService) {}

  @Mutation(() => Student)
  createStudent(
    @Args("createStudentInput") input: CreateStudentInput,
    @CurrentUser() user: User,  // Extract from JWT token
  ) {
    return this.studentsService.create(input, user.academyId);
  }

  @Query(() => Student)
  student(
    @Args("id") id: string,
    @CurrentUser() user: User,
  ) {
    return this.studentsService.findOne(id, user.academyId);
  }

  @Query(() => PaginatedStudents)
  students(
    @CurrentUser() user: User,
    @Args("page", { type: () => Int, defaultValue: 1 }) page: number,
    @Args("limit", { type: () => Int, defaultValue: 10 }) limit: number,
  ) {
    return this.studentsService.findAll(user.academyId, page, limit);
  }
}
```

### Service (Business Logic)
```ts
@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateStudentInput, academyId: string): Promise<Student> {
    const student = await this.prisma.student.create({
      data: {
        ...input,
        academyId,  // CRITICAL: Always associate with academy (multi-tenant)
      },
    });
    return mapStudentToEntity(student);  // Convert Prisma → GraphQL type
  }

  async findOne(id: string, academyId: string): Promise<Student> {
    const student = await this.prisma.student.findUnique({ where: { id } });
    assertOwnership(student?.academyId, academyId);  // Verify tenant access
    return mapStudentToEntity(student);
  }

  async findAll(academyId: string, page: number, limit: number) {
    const total = await this.prisma.student.count({
      where: { academyId },  // CRITICAL: Filter by academy
    });
    const items = await this.prisma.student.findMany({
      where: { academyId },  // CRITICAL: Always filter
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: items.map(mapStudentToEntity),
      total,
      page,
      limit,
    };
  }
}
```

### Entity (GraphQL Type)
```ts
@ObjectType()
export class Student {
  @Field()
  id: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => StudentStatus)  // Enum reference
  status: StudentStatus;

  @Field({ nullable: true })
  email?: string;

  @Field()
  createdAt: Date;
}

export enum StudentStatus {
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
}
```

### DTO Input (Validation)
```ts
@InputType()
export class CreateStudentInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @Field()
  @IsEmail()
  email: string;

  @Field(() => StudentStatus)  // Enum input
  @IsEnum(StudentStatus)
  status: StudentStatus;
}
```

### Mapper (Prisma → GraphQL)
```ts
// utils/student-mapper.util.ts
import { Student as PrismaStudent } from "@prisma/client";
import { Student } from "../entities/student.entity";

export function mapStudentToEntity(prismaStudent: PrismaStudent): Student {
  return {
    id: prismaStudent.id,
    firstName: prismaStudent.firstName,
    lastName: prismaStudent.lastName,
    status: prismaStudent.status as StudentStatus,
    email: prismaStudent.email,
    createdAt: prismaStudent.createdAt,
  };
}
```

### Module Registration
```ts
@Module({
  imports: [],
  providers: [StudentsResolver, StudentsService],
  exports: [StudentsService],  // Export if used by other modules
})
export class StudentsModule {}
```

## Multi-Tenant Pattern (CRITICAL)
Every query/mutation MUST filter by academyId to prevent data leaks:

✅ **CORRECT**:
```ts
const students = await this.prisma.student.findMany({
  where: { academyId: user.academyId },
});
assertOwnership(data?.academyId, user.academyId);
```

❌ **WRONG** (SECURITY ISSUE):
```ts
const students = await this.prisma.student.findMany();
```

## Auth Pattern
- All resolvers need `@UseGuards(SupabaseAuthGuard)`
- Use `@CurrentUser()` to get user from JWT
- User object has `id`, `email`, `academyId`
- Token validated automatically by guard

## Error Handling
```ts
import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";

// Input validation error
throw new BadRequestException("Invalid email format");

// Not found
throw new NotFoundException(`Student with id ${id} not found`);

// Auth error
throw new UnauthorizedException("Invalid token");
```

## Async Jobs (Trigger.dev)
Located in `/src/trigger/`:

```ts
// trigger/generate-invoice.ts
import { task } from "@trigger.dev/sdk";

export const generateInvoice = task({
  id: "generate-invoice",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
  },
  run: async (payload: { invoiceId: string; studentId: string }) => {
    // Long-running task (no timeout)
    const pdf = await generatePDF(payload.invoiceId);
    await sendEmail(payload.studentId, pdf);
    return { success: true };
  },
});
```

**Trigger from service:**
```ts
import { tasks } from "@trigger.dev/sdk";
import { generateInvoice } from "../trigger/generate-invoice";

await tasks.trigger<typeof generateInvoice>("generate-invoice", {
  invoiceId: invoice.id,
  studentId: invoice.studentId,
});
```

## Naming Conventions
- **Resolvers**: `[Feature]Resolver` → `StudentsResolver`
- **Services**: `[Feature]Service` → `StudentsService`
- **DTOs**: `Create[Feature]Input`, `Update[Feature]Input`, `Paginated[Feature]Output`
- **Entities**: `[Feature]` → `Student` (GraphQL type)
- **Enums**: `[Feature][Type]` → `StudentStatus`
- **Mappers**: `map[Feature]ToEntity` → `mapStudentToEntity`
- **Files**: kebab-case → `student-mapper.util.ts`

## Common Commands
```bash
npm run start:dev            # Start dev server (watch)
npm run build                # Build for production
npm run lint:fix             # Fix ESLint issues
npm run format               # Format with Prettier
npm run test                 # Run tests
npm run test:watch           # Watch mode
npm run prisma:generate      # Generate Prisma client
npm run prisma:migrate       # Create and run migrations
npm run prisma:studio        # Open Prisma Studio (visual DB editor)
```

## Database Schema Quick Reference

### Core Entities & Flow
```
Academy (root tenant)
├── User (team members)
├── Student
│   ├── Charge (per fee/month) → InvoiceLine → Invoice
│   ├── BillingProfile (fiscal data)
│   └── StudentCredit (from overpayments)
├── Fee (template)
├── Invoice
│   ├── InvoiceLine[] (items)
│   ├── Payment[] (receipts)
│   └── AfipInvoice (fiscal)
└── AcademyAfipSettings (tax config)
```

### Invoice Flow
```
Fee (template) → Charge (instance) → InvoiceLine → Invoice → Payment → StudentCredit
```

### Key Models
- **Academy**: Root tenant, filters ALL queries
- **Charge**: Fee instance for student/month. Unique by `[studentId, feeId, installmentNumber]`
- **InvoiceLine**: Line item. Can be CHARGE-backed or MANUAL. `isActive` flag for soft-deletes
- **Invoice**: Student billing document. Totals (`subtotal`, `total`, `paidAmount`, `balance`) are **cache fields**
- **Payment**: Receipt. Types: PAYMENT | REFUND. Only APPROVED counts
- **StudentCredit**: Generated from overpayments. Tracks `availableAmount` for partial use
- **BillingProfile**: Customer fiscal data (DNI/CUIT/CONSUMIDOR_FINAL)
- **AfipInvoice**: 1:1 with Invoice. Fiscal emission result (CAE, cbteNro)

### Multi-Tenant Rule (CRITICAL)
```ts
// Every query MUST filter by academyId
where: {
  academyId: user.academyId,
  // ... other filters
}

// Verify ownership when reading by ID
assertOwnership(data?.academyId, user.academyId);
```

### Important Notes
- **Invoice Totals**: Compute in backend, never trust DB cache
- **Soft Deletes**: Use `isActive`, `status=VOID` instead of hard deletes
- **Partial Unique**: InvoiceLine has partial unique on `[chargeId, isActive]` (DB constraint)
- **Cascade**: InvoiceLine/Payment/AfipInvoice cascade-delete with Invoice
- See `database_schema_and_relationships.md` in memory for full schema analysis

## Skills for Feature Documentation

After implementing a feature, use these skills to document it automatically:

### `/doc-plan [feature-name]`
- **When**: After implementing a feature, before merging
- **Does**: Reads `/be/docs/plans/[feature-name]/plan.md` → Generates comprehensive docs (mutations, queries, flows, decisions, edge cases)
- **Output**: Preview in chat (user reviews)
- **Example**: `/doc-plan invoice-payments`

### `/doc-add [feature-name]`
- **When**: After reviewing doc-plan output and it looks good
- **Does**: Commits generated docs to `/be/docs/features/[feature-name].md`, updates all indexes and cross-links
- **Output**: Files created/updated in `/be/docs/`
- **Example**: `/doc-add invoice-payments`

**Workflow**:
```
→ Implement feature
→ Create plan at /be/docs/plans/[feature-name]/plan.md
→ /doc-plan feature-name (review)
→ /doc-add feature-name (commit docs)
```

## When Working with Me (Claude)
- I'll read this file to understand the backend architecture
- I know feature modules are self-contained → I'll focus on the specific module you're working on
- I'll always include `academyId` filters for multi-tenant safety
- I'll create mappers between Prisma and GraphQL types
- I'll validate inputs with DTOs and `class-validator`
- I'll keep services focused on business logic, not HTTP concerns
- I won't modify the schema without discussing migrations
- I have the full schema & relationships loaded in memory for context
- I'll use `/doc-plan` and `/doc-add` skills to document features after implementation
