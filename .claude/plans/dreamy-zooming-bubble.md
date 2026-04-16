# Plan: Guardian-Aware Invoice Notifications

## Context

Currently, invoice email notifications are sent only to `student.email` (or `invoice.recipientEmail`). The system already models `FamilyGuardian.emailNotifications` (bool, default `true`) in the DB, but this flag is never consulted when sending emails. The goal is to route notifications to the student's family guardians when a family is assigned, and fall back to the student's own email only when no family exists.

**Desired logic:**
```
notify = true?
├── student has family?
│   └── YES → send to each FamilyGuardian where emailNotifications = true AND email != null
│              (if list is empty → send nothing)
└── NO → send to student.email (existing behavior)
```

---

## Files to Modify

- `src/invoices/invoices.service.ts` — main `createInvoice` method (lines 184–217)
- `src/trigger/bulk-create-invoices.ts` — `processStudentInvoice` function (lines 248–281)

## New File to Create

- `src/invoices/utils/resolve-notification-recipients.util.ts`

---

## Implementation

### Step 1 — Create the helper utility

**`src/invoices/utils/resolve-notification-recipients.util.ts`**

```ts
import { PrismaService } from "../../prisma/prisma.service";

export interface NotificationRecipient {
  email: string;
  name: string;
}

export async function resolveNotificationRecipients(
  studentId: string,
  prisma: PrismaService,
): Promise<NotificationRecipient[]> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      family: {
        select: {
          guardians: {
            where: { emailNotifications: true },
            select: { email: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!student) return [];

  // Student belongs to a family → use guardians with notifications ON
  if (student.family) {
    return student.family.guardians
      .filter((g) => g.email != null)
      .map((g) => ({
        email: g.email!,
        name: `${g.firstName} ${g.lastName}`,
      }));
  }

  // No family → fall back to student's own email
  if (student.email) {
    return [{ email: student.email, name: `${student.firstName} ${student.lastName}` }];
  }

  return [];
}
```

---

### Step 2 — Update `invoices.service.ts`

Replace the current block in `createInvoice` (lines 184–217):

**Before:**
```ts
if (input.notify && result.recipientEmail) {
  // fetches academy, generates PDF, sends to result.recipientEmail
}
```

**After:**
```ts
if (input.notify) {
  const recipients = await resolveNotificationRecipients(input.studentId, this.prisma);
  if (recipients.length > 0) {
    const academy = await this.prisma.academy.findUnique({ where: { id: academyId } });
    const pdfBuffer = await generateInvoicePdf(...); // same as before
    for (const recipient of recipients) {
      try {
        await sendInvoiceNotification({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          invoiceNumber: result.invoiceNumber,
          total: result.total,
          issueDate: result.issueDate,
          dueDate: result.dueDate,
          academyName: academy?.name ?? "Academia",
          pdfBuffer,
        });
      } catch (error) {
        console.error(`Failed to send invoice notification to ${recipient.email}`, error);
      }
    }
  }
}
```

---

### Step 3 — Update `bulk-create-invoices.ts`

Replace the current block in `processStudentInvoice` (lines 248–281):

**Before:**
```ts
if (notify && student.email) {
  // generates PDF, sends to student.email
}
```

**After:**
```ts
if (notify) {
  const recipients = await resolveNotificationRecipients(student.id, prisma);
  if (recipients.length > 0) {
    const pdfBuffer = await generateInvoicePdf(...); // same as before
    for (const recipient of recipients) {
      try {
        await sendInvoiceNotification({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          invoiceNumber: invoice.invoiceNumber,
          total,
          issueDate,
          dueDate,
          academyName,
          pdfBuffer,
        });
      } catch (error) {
        logger.warn(`Failed to send invoice notification to ${recipient.email}`, { error });
      }
    }
  }
}
```

---

## Key Notes

- The PDF is generated **once** per invoice and reused for all recipients (no extra cost)
- Each recipient gets an **individual email** (not CC/BCC) — cleaner and more personal
- The `resolveNotificationRecipients` utility uses a single DB query with nested select — no N+1
- No changes to the GraphQL schema or DTOs needed — `notify` flag stays as-is
- `result.recipientEmail` / `result.recipientName` on the invoice itself are not changed — they remain for fiscal/display purposes

---

## Verification

1. **Student with no family** → invoice created with `notify: true` → email sent to `student.email`
2. **Student with family, 2 guardians both ON** → 2 emails sent (one per guardian)
3. **Student with family, 1 guardian ON, 1 OFF** → 1 email sent (only the ON guardian)
4. **Student with family, all guardians OFF** → 0 emails sent
5. **Student with family, guardians have no email set** → 0 emails sent
6. **Bulk invoice creation** → same logic applies via the Trigger.dev task
