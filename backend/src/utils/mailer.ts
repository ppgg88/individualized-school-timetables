import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) {
    throw new Error("SMTP_HOST n'est pas configuré (variables SMTP_* manquantes).");
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@edt-individualisation.local';
  await getTransporter().sendMail({ from, to, subject, html });
}
