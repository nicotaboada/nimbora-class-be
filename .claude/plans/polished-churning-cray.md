# Plan: Generar PDF server-side y adjuntarlo al email

## Contexto
El email de notificación de facturas ya funciona con Resend. Ahora necesitamos generar el PDF de la factura en el backend (mismo formato que el frontend) y adjuntarlo al email. También agregar el PDF como attachment.

## Enfoque
Portar `web/modules/invoices/utils/generate-invoice-pdf.ts` (jsPDF) al backend. jsPDF funciona en Node.js — el package tiene entry point `dist/jspdf.node.min.js`. El único cambio es reemplazar `doc.save()` por `doc.output('arraybuffer')` para obtener un Buffer en lugar de descargar en el browser.

## Archivos a crear

| Archivo | Qué |
|---------|-----|
| `be/src/email/generate-invoice-pdf.ts` | Port del generador de PDF del frontend, devuelve `Buffer` |

## Archivos a modificar

| Archivo | Qué |
|---------|-----|
| `be/package.json` | Instalar `jspdf` |
| `be/src/email/send-invoice-email.ts` | Recibir PDF buffer opcional, adjuntarlo con Resend attachments |
| `be/src/invoices/invoices.service.ts` | Generar PDF y pasarlo al email (factura individual) |
| `be/src/trigger/bulk-create-invoices.ts` | Generar PDF y pasarlo al email (bulk) |

## Detalle

### 1. Instalar jsPDF en backend
```bash
cd be && npm install jspdf
```

### 2. Crear `be/src/email/generate-invoice-pdf.ts`
- Port directo de `web/modules/invoices/utils/generate-invoice-pdf.ts`
- Misma lógica: header con datos del destinatario, tabla de items, descuentos, totales, notas, footer
- Interface propia `InvoicePdfData` con los campos necesarios (no depender de tipos del frontend)
- En lugar de `doc.save()`, usar `Buffer.from(doc.output('arraybuffer'))` para devolver un Buffer
- Función: `generateInvoicePdf(data: InvoicePdfData): Buffer`

### 3. Actualizar `send-invoice-email.ts`
- Agregar campo opcional `pdfBuffer?: Buffer` y `invoiceNumber?: number` al interface
- Si se pasa `pdfBuffer`, adjuntarlo usando la API de Resend:
```ts
attachments: pdfBuffer ? [{
  filename: `factura-${invoiceNum}.pdf`,
  content: pdfBuffer,
}] : undefined,
```

### 4. Actualizar `invoices.service.ts` (individual)
- Después de crear la factura, si `notify`, generar el PDF con los datos de `result` (que incluye lines)
- Pasar el buffer a `sendInvoiceNotification`

### 5. Actualizar `bulk-create-invoices.ts` (bulk)
- Después de crear cada factura, si `notify`, generar el PDF
- Pasar el buffer a `sendInvoiceNotification`
- Los datos del invoice (lines, totals) ya están disponibles en la transacción

## Datos necesarios para el PDF
Del invoice creado ya tenemos todo:
- `invoiceNumber`, `recipientName`, `recipientEmail`, `recipientPhone`, `recipientAddress`
- `issueDate`, `dueDate`
- `lines[]` con `description`, `originalAmount`, `finalAmount`, `discountType`, `discountValue`, `isActive`
- `subtotal`, `totalDiscount`, `total`
- `publicNotes`

## Verificación
1. Crear factura individual con notify=true → email llega con PDF adjunto
2. Crear facturas bulk con notify=true → emails llegan con PDF adjunto
3. Verificar que el PDF tiene el mismo formato que el generado en el frontend
4. Crear factura con notify=false → no se envía email ni PDF
