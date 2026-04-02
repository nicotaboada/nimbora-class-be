# Plan: Botón de descarga AFIP + PDF de factura fiscal

## Context

Modificar el botón de descarga de facturas para soportar dos opciones cuando el FF de AFIP está habilitado: descargar factura interna (actual) y descargar factura AFIP (nueva). La factura AFIP incluye datos del emisor, tipo de comprobante (A/B/C), CAE, fecha vto CAE, y QR code estándar AFIP.

**El PDF AFIP se genera server-side** (mismo patrón que `generate-invoice-pdf.ts` del email). Esto permite reutilizar la misma función tanto para descarga individual como para envío por mail en bulk.

---

## Paso 1: Backend — Instalar `qrcode` en el backend

```bash
cd be && npm install qrcode && npm install -D @types/qrcode
```

---

## Paso 2: Backend — Crear `generate-afip-invoice-pdf.ts`

**Crear:** `be/src/email/generate-afip-invoice-pdf.ts`

Función que recibe datos tipados y retorna `Promise<Buffer>` (async por el QR).

```ts
interface AfipInvoicePdfData {
  // Emisor (academy)
  emisor: {
    razonSocial: string; cuit: string; condicionIva: string;
    domicilioFiscal: string; taxStatus: string;
  };
  // Comprobante
  cbteTipo: number; // 1=A, 6=B, 11=C
  ptoVta: number;
  cbteNro: number;
  cbteFch: string; // ISO date
  // Receptor
  recipientName: string; docType: string;
  docNumber?: string | null; taxCondition: string;
  recipientAddress?: string | null;
  // Items (reutilizar misma estructura que InvoicePdfData)
  lines: { description: string; originalAmount: number; finalAmount: number; discountType?; discountValue?; }[];
  subtotal: number; totalDiscount: number; total: number;
  publicNotes?: string | null;
  // AFIP result
  cae: string; caeVto: string; // ISO date
}

export async function generateAfipInvoicePdf(data: AfipInvoicePdfData): Promise<Buffer> { ... }
```

### Layout del PDF (basado en factura AFIP de referencia):

1. **Header tripartito:**
   - Izquierda: razonSocial, domicilioFiscal, taxStatus label
   - Centro: caja con letra (A/B/C) + "Cod. XX"
   - Derecha: "Factura B", Número XXXX-XXXXXXXX, Fecha Emisión, CUIT

2. **Bloque receptor:** Condición IVA, Nombre, Documento, Dirección

3. **Tabla de items:** Detalle, Cantidad, Subtotal

4. **Totales:** Importe TOTAL

5. **Footer fiscal:** QR code + CAE + Fecha Vto CAE + "Comprobante Autorizado"

### QR Code (estándar AFIP):
```ts
import QRCode from 'qrcode';
const qrPayload = { ver:1, fecha, cuit, ptoVta, tipoCmp, nroCmp, importe, moneda:"PES", ctz:1, tipoDocRec, nroDocRec, tipoCodAut:"E", codAut };
const url = `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(qrPayload)).toString('base64')}`;
const qrDataUrl = await QRCode.toDataURL(url, { width: 150, margin: 1 });
doc.addImage(qrDataUrl, 'PNG', x, y, 30, 30);
```

Helpers: `cbteTipoToLetter`, `docTypeToAfipCode`, `taxConditionLabel`, reutilizar `fmtAmount`/`fmtDate`.

---

## Paso 3: Backend — Entity GraphQL `AfipInvoice`

**Crear:** `be/src/afip/entities/afip-invoice.entity.ts`

ObjectType con campos: `id`, `invoiceId`, `status`, `cae`, `caeVto`, `cbteNro`, `cbteTipo`, `ptoVta`, `cbteFch`, `recipientName`, `docType`, `docNumber`, `taxCondition`.

---

## Paso 4: Backend — Query `afipInvoice` + Mutation `downloadAfipInvoicePdf`

**Modificar:** `be/src/afip/afip.resolver.ts`

1. **Query `afipInvoice(invoiceId: ID!): AfipInvoice`** — retorna datos de la AfipInvoice si existe y está EMITTED, null si no.

2. **Query `afipInvoicePdf(invoiceId: ID!): String!`** — genera el PDF y retorna **base64 string**. Internamente:
   - Carga AfipInvoice + Invoice (con lines) + AcademyAfipSettings
   - Llama a `generateAfipInvoicePdf(...)` → Buffer
   - Retorna `buffer.toString('base64')`

**Modificar:** `be/src/afip/afip.service.ts`
- Agregar `findAfipInvoice(invoiceId, academyId)` — busca en Prisma con validación de tenant.
- Agregar `generateAfipPdf(invoiceId, academyId)` — orquesta la carga de datos y generación.

---

## Paso 5: Frontend — Types

**Crear:** `web/modules/afip-invoices/types/afip-invoice.ts`

```ts
export interface AfipInvoice {
  id: string; invoiceId: string; status: string;
  cae: string; caeVto: string; cbteNro: number; cbteTipo: number;
  ptoVta: number; cbteFch: string; recipientName: string;
  docType: string; docNumber?: string | null; taxCondition: string;
}
```

Re-exportar desde `web/modules/afip-invoices/types/index.ts`.

---

## Paso 6: Frontend — Query GraphQL

**Modificar:** `web/modules/afip-invoices/graphql/queries.ts`

Agregar:
```graphql
query GetAfipInvoicePdf($invoiceId: ID!) {
  afipInvoicePdf(invoiceId: $invoiceId)
}
```

---

## Paso 7: Frontend — Modificar header con split button

**Modificar:** `web/modules/invoices/components/invoice-detail/invoice-detail-header.tsx`

### Nuevos props:
- `isAfipEnabled: boolean`
- `isFiscalized: boolean`
- `onDownloadAfipPDF: () => void`
- `isDownloadingAfipPdf?: boolean`

### Layout cuando FF AFIP ON:
```
[Agregar Pago] [Agregar Cargo] [Descargar ▼] | [🗑]
```

Split button (patrón de invoices-section.tsx:132-176):
- Click principal → `onDownloadPDF` (factura interna)
- Dropdown:
  - "Descargar Factura Interna" → `onDownloadPDF`
  - "Descargar Factura AFIP" → `onDownloadAfipPDF` (disabled si `!isFiscalized`)

### Layout cuando FF AFIP OFF (sin cambios):
```
[Agregar Pago] [Agregar Cargo] | [⬇] [🗑]
```

---

## Paso 8: Frontend — Conectar en la page

**Modificar:** `web/app/(authenticated)/finance/invoices/[id]/page.tsx`

1. Importar `useProfile`, `isFeatureEnabled`
2. Calcular `isAfipEnabled`
3. Usar `useLazyQuery` para `GET_AFIP_INVOICE_PDF`
4. Handler:
```ts
const handleDownloadAfipPdf = async () => {
  const { data } = await fetchAfipPdf({ variables: { invoiceId } });
  if (!data?.afipInvoicePdf) return;
  // Decode base64 y trigger download
  const blob = base64ToBlob(data.afipInvoicePdf, 'application/pdf');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `factura-afip-${invoice.invoiceNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
```
5. Pasar props nuevos a `InvoiceDetailHeader`

---

## Resumen: Archivos a modificar/crear

| Archivo | Acción |
|---------|--------|
| `be/src/email/generate-afip-invoice-pdf.ts` | **CREAR** — generador PDF AFIP (server-side) |
| `be/src/afip/entities/afip-invoice.entity.ts` | **CREAR** — entity GraphQL |
| `be/src/afip/afip.service.ts` | Modificar — agregar métodos |
| `be/src/afip/afip.resolver.ts` | Modificar — agregar queries |
| `be/package.json` | `qrcode` + `@types/qrcode` |
| `web/modules/afip-invoices/types/afip-invoice.ts` | **CREAR** |
| `web/modules/afip-invoices/graphql/queries.ts` | Modificar |
| `web/modules/invoices/components/invoice-detail/invoice-detail-header.tsx` | Modificar |
| `web/app/(authenticated)/finance/invoices/[id]/page.tsx` | Modificar |

## Reutilización futura (bulk email)

La función `generateAfipInvoicePdf()` en `be/src/email/` retorna `Buffer`, igual que `generateInvoicePdf()`. Cuando se implemente el envío por mail en bulk, se usa así:

```ts
const pdfBuffer = await generateAfipInvoicePdf(data);
await sendInvoiceNotification({ pdfBuffer, ... });
```

Misma interfaz, misma función, cero duplicación.

## Verificación

1. **Sin FF AFIP**: botón de descarga se muestra igual que antes
2. **Con FF AFIP, factura NO fiscalizada**: split button visible, opción "Factura AFIP" disabled
3. **Con FF AFIP, factura fiscalizada**: ambas opciones activas, "Factura AFIP" llama al backend, genera PDF con datos emisor/receptor/items/CAE/QR y descarga
4. **QR**: escanear lleva a URL AFIP con datos correctos
5. **Backend**: `afipInvoicePdf(invoiceId)` retorna base64 del PDF
