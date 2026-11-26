import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required environment variable ${name}. Copy server/.env.example to server/.env and fill it in.`);
  }
  return v.trim();
}
const opt = (name: string, fallback = '') => (process.env[name] ?? fallback).trim();

const NODE_ENV = opt('NODE_ENV', 'development');
const JWT_SECRET = required('JWT_SECRET');

export const env = {
  NODE_ENV,
  isProd: NODE_ENV === 'production',
  PORT: Number(opt('PORT', '5000')),
  MONGODB_URI: required('MONGODB_URI'),
  JWT_SECRET,
  OTP_SECRET: opt('OTP_SECRET') || JWT_SECRET,
  CLIENT_ORIGIN: opt('CLIENT_ORIGIN', 'http://localhost:5173'),

  OWNER_EMAIL: opt('OWNER_EMAIL'),
  SMTP_HOST: opt('SMTP_HOST'),
  SMTP_PORT: Number(opt('SMTP_PORT', '587')),
  SMTP_USER: opt('SMTP_USER'),
  SMTP_PASSWORD: opt('SMTP_PASSWORD'),
  SMTP_FROM: opt('SMTP_FROM'),

  SMS_PROVIDER: opt('SMS_PROVIDER', 'console') as 'console' | 'msg91' | 'twilio',
  MSG91_AUTH_KEY: opt('MSG91_AUTH_KEY'),
  MSG91_TEMPLATE_ID: opt('MSG91_TEMPLATE_ID'),
  MSG91_OTP_VAR: opt('MSG91_OTP_VAR', 'otp'),
  TWILIO_ACCOUNT_SID: opt('TWILIO_ACCOUNT_SID'),
  TWILIO_AUTH_TOKEN: opt('TWILIO_AUTH_TOKEN'),
  TWILIO_FROM: opt('TWILIO_FROM'),
  ALLOW_CONSOLE_OTP: opt('ALLOW_CONSOLE_OTP') === 'true',
  /** true = show prices and allow cart/checkout on the website. Anything else = catalogue only (enquiries). */
  ONLINE_SHOP: opt('ONLINE_SHOP') === 'true',
  /** Half-yearly service reminder emails: on unless set to 'off'. */
  SERVICE_REMINDERS: opt('SERVICE_REMINDERS') !== 'off',
  /** Optional secret for an external scheduler to trigger reminders: /api/cron/service-reminders?key=... */
  CRON_SECRET: opt('CRON_SECRET'),

  CLOUDINARY_CLOUD_NAME: opt('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: opt('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: opt('CLOUDINARY_API_SECRET'),

  ADMIN_NAME: opt('ADMIN_NAME', 'Owner'),
  ADMIN_EMAIL: opt('ADMIN_EMAIL'),
  ADMIN_PASSWORD: opt('ADMIN_PASSWORD'),
  SEED_DEFAULT_STOCK: Number(opt('SEED_DEFAULT_STOCK', '10')),
};

// (OTP by SMS is no longer used for customer login; customers log in with mobile + password.)
