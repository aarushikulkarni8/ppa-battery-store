import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let transporter: Transporter | null = null;

export function mailConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.OWNER_EMAIL);
}

function getTransport() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    });
  }
  return transporter;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function table(rows: [string, unknown][]) {
  return `<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="color:#555;border-bottom:1px solid #eee;vertical-align:top"><b>${esc(k)}</b></td><td style="border-bottom:1px solid #eee;white-space:pre-wrap">${esc(v) || '—'}</td></tr>`,
    )
    .join('')}</table>`;
}

export async function sendOwnerMail(subject: string, heading: string, rows: [string, unknown][]) {
  if (!mailConfigured()) return { status: 'NOT_CONFIGURED' as const };
  const text = `${heading}\n\n${rows.map(([k, v]) => `${k}: ${v ?? ''}`).join('\n')}`;
  await getTransport().sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: env.OWNER_EMAIL,
    subject,
    text,
    html: `<h2 style="font-family:Arial,sans-serif">${esc(heading)}</h2>${table(rows)}`,
  });
  return { status: 'SENT' as const };
}

/** Can we email customers? (Only SMTP is needed; OWNER_EMAIL is for owner notifications.) */
export function customerMailConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
}

/** Plain email to a customer. The text is sent as written, line breaks kept. */
export async function sendCustomerMail(to: string, subject: string, text: string) {
  if (!customerMailConfigured()) throw new Error('Email (SMTP) is not set up in server/.env');
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#14213D">${esc(text).replace(/\n/g, '<br>')}</div>`;
  await getTransport().sendMail({ from: env.SMTP_FROM || env.SMTP_USER, to, subject, text, html });
}

export async function verifyMailer() {
  if (!mailConfigured()) {
    console.warn('[mail] SMTP / OWNER_EMAIL not configured — enquiries are saved but no email is sent.');
    return;
  }
  try {
    await getTransport().verify();
    console.log(`[mail] SMTP ready, owner notifications go to ${env.OWNER_EMAIL}`);
  } catch (e) {
    console.error('[mail] SMTP verification failed:', (e as Error).message);
  }
}
