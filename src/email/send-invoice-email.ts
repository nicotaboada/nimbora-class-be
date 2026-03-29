import { getFromAddress, sendEmail } from "./send-email";
import { invoiceNotificationTemplate } from "./templates/invoice-notification";

interface InvoiceEmailData {
  recipientEmail: string;
  recipientName: string;
  invoiceNumber: number;
  total: number;
  issueDate: Date;
  dueDate: Date;
  academyName: string;
  pdfBuffer?: Buffer;
}

export async function sendInvoiceNotification(data: InvoiceEmailData) {
  const invoiceNum = String(data.invoiceNumber).padStart(5, "0");

  return await sendEmail({
    from: getFromAddress(data.academyName),
    to: data.recipientEmail,
    subject: `Tu factura de ${data.academyName} - #${invoiceNum}`,
    html: invoiceNotificationTemplate({
      recipientName: data.recipientName,
      academyName: data.academyName,
      invoiceNumber: data.invoiceNumber,
      total: data.total,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
    }),
    attachments: data.pdfBuffer
      ? [{ filename: `factura-${invoiceNum}.pdf`, content: data.pdfBuffer }]
      : undefined,
  });
}
