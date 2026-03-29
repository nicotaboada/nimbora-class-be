import { Resend } from "resend";

let resend: Resend;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface Attachment {
  filename: string;
  content: Buffer;
}

interface SendEmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
}

/**
 * Sends an email via Resend.
 * All email senders should use this function instead of instantiating Resend directly.
 */
export async function sendEmail(options: SendEmailOptions) {
  return await getResend().emails.send({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });
}

/**
 * Returns the configured "from" address for the given academy.
 */
export function getFromAddress(academyName: string): string {
  const email = process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";
  return `${academyName} <${email}>`;
}
