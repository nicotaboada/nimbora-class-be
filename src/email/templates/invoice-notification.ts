import { formatCurrency, formatDate } from "../../common/utils/format";

interface InvoiceNotificationData {
  recipientName: string;
  academyName: string;
  invoiceNumber: number;
  total: number;
  issueDate: Date;
  dueDate: Date;
}

/**
 * Generates the HTML for an invoice notification email.
 */
export function invoiceNotificationTemplate(
  data: InvoiceNotificationData,
): string {
  const total = formatCurrency(data.total);
  const issueDate = formatDate(data.issueDate);
  const dueDate = formatDate(data.dueDate);
  const invoiceNum = String(data.invoiceNumber).padStart(5, "0");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">

        <p style="margin: 0 0 24px 0; font-size: 15px; font-weight: 700; color: #1a1a1a;">
          ${data.academyName}
        </p>

        <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e5e5;">
          <tr>
            <td align="center" style="padding: 32px 32px 8px 32px;">
              <p style="margin: 0; font-size: 15px; color: #a3a3a3;">
                Factura de ${data.recipientName}
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 32px 8px 32px;">
              <p style="margin: 0; font-size: 36px; font-weight: 700; color: #1a1a1a;">
                ${total}
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 32px 4px 32px;">
              <p style="margin: 0; font-size: 14px; color: #a3a3a3;">
                Emitida el ${issueDate}
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 32px 24px 32px;">
              <p style="margin: 0; font-size: 14px; color: #a3a3a3;">
                Vence el ${dueDate}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px;">
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;">
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #a3a3a3;">Número de factura</td>
                  <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right;">#${invoiceNum}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #a3a3a3;">Total</td>
                  <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right;">${total}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" width="520" cellspacing="0" cellpadding="0">
          <tr><td style="height: 16px;"></td></tr>
        </table>

        <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e5e5;">
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #1a1a1a;">
                Hola <strong>${data.recipientName}</strong>,
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #525252;">
                Te adjuntamos tu factura correspondiente.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #525252;">
                Si tenés alguna consulta sobre esta factura, no dudes en contactarnos.
              </p>
              <p style="margin: 0; font-size: 15px; color: #525252;">
                Saludos,<br>
                <strong style="color: #1a1a1a;">${data.academyName}</strong>
              </p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0 16px 0;">
              <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
                Este email fue generado automáticamente. Por favor, no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
