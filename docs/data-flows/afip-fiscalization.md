# AFIP Fiscalization Flow

How invoices are emitted to Argentina's tax authority (AFIP).

## Overview

3-step onboarding → Verify delegation → Emit invoices with CAE.

```
Setup Fiscal Data → Confirm Delegation → Verify Delegation → Ready to Emit
```

## Step 1: Setup Fiscal Data

User initiates AFIP onboarding.

### lookupCuit Query

First, user looks up their CUIT in ARCA registry:

```ts
lookupCuit(cuit: "23123456789")
// Returns:
// {
//   razonSocial: "Mi Academia S.A.",
//   personeria: "Jurídica",
//   condicionIva: "Responsable Inscripto",
//   domicilioFiscal: "Calle 123, CABA",
//   actividadPrincipal: "Educación"
// }
```

**Auth**: Not required (public lookup).

### setupAfipSettings Mutation

User saves fiscal data:

```ts
setupAfipSettings({
  cuit: "23123456789",
  taxStatus: "RESPONSABLE_INSCRIPTO" // or MONOTRIBUTO, EXENTO
})
```

### Process

1. **Validate CUIT**
   - Check format
   - Call ARCA registry to verify

2. **Save AcademyAfipSettings**
   - Set cuit, taxStatus
   - Copy padrón data from ARCA (razonSocial, etc.)
   - Create first AfipSalesPoint (defaultPtoVta = 1)
   - Set environment = HOMO (testing)

3. **Update Onboarding**
   - Set onboardingStep = DELEGATION_1
   - Set delegationStatus = PENDING

**Output**: AcademyAfipSettings object with step = DELEGATION_1

## Step 2: User Delegates in ARCA (Offline)

User manually goes to ARCA portal and delegates to Nimbora's WSFE service.

This is manual, happens outside the app.

### confirmAfipDelegationReady Mutation

User returns to app and confirms delegation is done:

```ts
confirmAfipDelegationReady()
```

### Process

1. **Validate Current Step**
   - Must be DELEGATION_1 (already did Step 1)

2. **Update Onboarding**
   - Set onboardingStep = DELEGATION_2
   - (No ARCA verification yet)

**Output**: AcademyAfipSettings with step = DELEGATION_2

## Step 3: Verify Delegation

Backend verifies WSFE delegation is active.

### verifyAfipDelegation Mutation

```ts
verifyAfipDelegation()
```

### Process

1. **Call AFIP WSFE Service**
   - Check if delegation is valid
   - Confirm we can emit invoices

2. **If Valid**
   - Set delegationStatus = OK
   - Set onboardingStep = COMPLETED
   - Set delegatedAt = now
   - **Academy can now emit invoices**

3. **If Invalid**
   - Set delegationStatus = ERROR
   - Save error message
   - User must re-delegate in ARCA and retry

**Output**: AcademyAfipSettings with step = COMPLETED (if valid)

## Step 4: Emit Invoice to AFIP

After onboarding is COMPLETED, invoices can be fiscalized.

### emitAfipInvoice Task (Trigger.dev)

Async task that emits invoice to AFIP:

```ts
export const emitAfipInvoice = task({
  id: "emit-afip-invoice",
  run: async (payload: { invoiceId: string }) => {
    // Trigger from resolver/service
    const invoice = await Invoice.findUnique({
      where: { id: payload.invoiceId }
    });

    // Check onboarding completed
    const settings = await AcademyAfipSettings.findUnique({
      where: { academyId: invoice.academyId }
    });
    if (settings.onboardingStep !== 'COMPLETED') {
      throw new Error('AFIP onboarding not completed');
    }

    // Create AfipInvoice record
    const afipInvoice = await AfipInvoice.create({
      data: {
        invoiceId: invoice.id,
        status: 'EMITTING',
        // ... snapshot fiscal data
      }
    });

    try {
      // Call AFIP Web Service
      const result = await afipService.emitInvoice({
        ptoVta: settings.defaultPtoVta,
        cbteTipo: determineCbteType(invoice), // 6=B, 11=C
        concepto: 2, // Servicios (MVP)
        cbteFch: invoice.issueDate,
        docTipo: getDocType(invoice.billingProfile),
        docNro: getDocNumber(invoice.billingProfile),
        impNeto: invoice.subtotal,
        impTotal: invoice.total,
        impTotConc: 0,
        impOpEx: 0
      });

      // Success: Save CAE and cbteNro
      afipInvoice.cbteNro = result.cbteNro;
      afipInvoice.cae = result.cae;
      afipInvoice.caeVto = result.caeVto;
      afipInvoice.status = 'EMITTED';
      await afipInvoice.save();

      return { success: true, cbteNro: result.cbteNro, cae: result.cae };
    } catch (error) {
      // Error: Save for debugging
      afipInvoice.status = 'ERROR';
      afipInvoice.lastError = error.message;
      afipInvoice.requestJson = { /* request sent */ };
      afipInvoice.responseJson = { /* AFIP response */ };
      await afipInvoice.save();

      throw error; // Will retry via Trigger.dev
    }
  }
});
```

### Result

- **Success**: AfipInvoice.status = EMITTED, CAE + cbteNro saved
- **Error**: AfipInvoice.status = ERROR, logged for support

**Invoice can be sent to student with CAE once EMITTED.**

## AfipInvoice Model

```
id, invoiceId (FK, unique), status (EMITTING|EMITTED|ERROR),
recipientName, docType, docNumber, taxCondition (snapshots),
ptoVta, cbteTipo, concepto, cbteFch,
cbteNro, cae, caeVto (result),
lastError, requestJson, responseJson (debug)
```

## Invoice Type Logic

**cbteTipo** (invoice type):
- 6 = Tipo B (DNI/CUIT recipients)
- 11 = Tipo C (CONSUMIDOR_FINAL, simplified)

```ts
function determineCbteType(invoice: Invoice): number {
  const profile = invoice.billingProfile;
  if (!profile || profile.docType === 'CONSUMIDOR_FINAL') {
    return 11; // Tipo C
  }
  return 6; // Tipo B
}
```

## Error Handling

If emission fails:
1. Save error message and AFIP response
2. Trigger.dev auto-retries (exponential backoff)
3. After max retries, error is logged
4. Support team can see request/response for debugging
5. User can retry after fixing the issue (e.g., updating delegation)

## Multi-Academy

Each academy has:
- One AcademyAfipSettings (1:1)
- One or more AfipSalesPoints
- Multiple AfipInvoices (1:many, one per Invoice)

---

## Related

- [Data Flow Overview](./index.md)
- [AFIP Module](../modules/afip.md)
- [Mutations: AFIP](../mutations/index.md)
- [Queries: AFIP](../queries/index.md)
