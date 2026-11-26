import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { Customer } from '../models/index.js';
import { CUSTOMER_COOKIE, requireCustomer, setAuthCookie, signToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { customerMailConfigured, sendCustomerMail } from '../services/mailer.js';
import { ah, HttpError, normalizeMobile } from '../utils/http.js';

const router = Router();
export function publicCustomer(c: any) {
  return {
    _id: c._id,
    mobile: c.mobile,
    name: c.name,
    email: c.email,
    address: c.address,
    reminderEmails: c.reminderEmails !== false,
    hasPassword: Boolean(c.passwordSetAt),
    profileComplete: Boolean(c.name),
    createdAt: c.createdAt,
  };
}

const MAX_FAILED = 5; // wrong passwords before a short lock
const LOCK_MINUTES = 15;
const RESET_MINUTES = 30;

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false });
const mobileSchema = z.string().trim();
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Use at least one letter and one number');
const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return '';
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(2, user.length - 2))}@${domain}`;
}
function requireMobile(raw: string) {
  const mobile = normalizeMobile(raw);
  if (!mobile) throw new HttpError(400, 'Enter a valid 10-digit mobile number');
  return mobile;
}
function logIn(res: Parameters<typeof setAuthCookie>[0], customerId: string) {
  setAuthCookie(res, CUSTOMER_COOKIE, signToken(customerId, 'customer'), 30);
}

export async function sendResetLink(customer: { _id: unknown; email: string; name?: string }, reason: 'reset' | 'set') {
  const token = crypto.randomBytes(32).toString('hex');
  await Customer.updateOne(
    { _id: customer._id },
    { $set: { resetTokenHash: hashToken(token), resetTokenExpires: new Date(Date.now() + RESET_MINUTES * 60_000) } },
  );
  const link = `${env.CLIENT_ORIGIN.replace(/\/$/, '')}/reset-password?token=${token}`;
  if (!customerMailConfigured()) {
    if (!env.isProd) console.log(`\n[password] ${reason} link for ${customer.email}: ${link}\n`);
    return { sent: false, devLink: env.isProd ? undefined : link };
  }
  const text = `Hello${customer.name ? ` ${customer.name}` : ''},

${reason === 'set' ? 'Use this link to set a password for your' : 'We received a request to reset the password for your'} Prashant and Prashant Associates account:

${link}

The link works for ${RESET_MINUTES} minutes. If you did not ask for this, you can ignore this email.

Regards,
Prashant and Prashant Associates`;
  try {
    await sendCustomerMail(customer.email, reason === 'set' ? 'Set your password' : 'Reset your password', text);
  } catch (e) {
    console.error('[password] could not send link:', (e as Error).message);
    await Customer.updateOne({ _id: customer._id }, { $set: { resetTokenHash: null, resetTokenExpires: null } });
    throw new HttpError(502, 'We could not send the email just now. Please try again in a few minutes, or contact the shop.');
  }
  return { sent: true };
}

/** Step 1 of login: what should this mobile number do next? */
router.post(
  '/lookup',
  authLimiter,
  ah(async (req, res) => {
    const mobile = requireMobile(z.object({ mobile: mobileSchema }).parse(req.body).mobile);
    const c = await Customer.findOne({ mobile }).select('+passwordHash name email').lean();
    if (!c) return void res.json({ next: 'register' });
    if (c.passwordHash) return void res.json({ next: 'password' });
    // Known customer (shop sale or old OTP login) without a password yet.
    if (c.email) return void res.json({ next: 'verify-email', emailHint: maskEmail(c.email) });
    res.json({ next: 'register', existing: true, name: c.name ?? '' });
  }),
);

router.post(
  '/register',
  authLimiter,
  ah(async (req, res) => {
    const body = z
      .object({
        mobile: mobileSchema,
        name: z.string().trim().min(2, 'Enter your name').max(80),
        email: z.string().trim().toLowerCase().email('Enter a valid email address'),
        password: passwordSchema,
      })
      .parse(req.body);
    const mobile = requireMobile(body.mobile);
    const existing = await Customer.findOne({ mobile }).select('+passwordHash').lean();
    if (existing?.passwordHash) throw new HttpError(409, 'This mobile number already has an account. Log in with your password.');
    if (existing?.email) throw new HttpError(409, 'This number is already registered with an email. Use the link we email you to set your password.');
    const passwordHash = await bcrypt.hash(body.password, 11);
    const set = { name: body.name, email: body.email, passwordHash, passwordSetAt: new Date(), failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() };
    const customer = existing
      ? await Customer.findByIdAndUpdate(existing._id, { $set: set }, { new: true }).lean()
      : (await Customer.create({ mobile, ...set })).toObject();
    logIn(res, String(customer!._id));
    res.status(existing ? 200 : 201).json({ customer: publicCustomer(customer) });
  }),
);

router.post(
  '/login',
  authLimiter,
  ah(async (req, res) => {
    const body = z.object({ mobile: mobileSchema, password: z.string().min(1, 'Enter your password').max(100) }).parse(req.body);
    const mobile = requireMobile(body.mobile);
    const c = await Customer.findOne({ mobile }).select('+passwordHash');
    const wrong = new HttpError(401, 'Wrong mobile number or password');
    if (!c || !c.passwordHash) throw wrong;
    if (c.lockedUntil && c.lockedUntil > new Date()) {
      const mins = Math.ceil((c.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new HttpError(429, `Too many wrong attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}, or reset your password.`);
    }
    if (!(await bcrypt.compare(body.password, c.passwordHash))) {
      const failed = (c.failedLogins ?? 0) + 1;
      await Customer.updateOne(
        { _id: c._id },
        { $set: failed >= MAX_FAILED ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : { failedLogins: failed } },
      );
      throw wrong;
    }
    await Customer.updateOne({ _id: c._id }, { $set: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
    logIn(res, String(c._id));
    const fresh = await Customer.findById(c._id).lean();
    res.json({ customer: publicCustomer(fresh) });
  }),
);

/** Forgot password, or first-time "set password" for customers whose email is on file. */
router.post(
  '/password/forgot',
  authLimiter,
  ah(async (req, res) => {
    const mobile = requireMobile(z.object({ mobile: mobileSchema }).parse(req.body).mobile);
    const c = await Customer.findOne({ mobile }).select('+passwordHash name email').lean();
    if (!c) throw new HttpError(404, 'No account with this mobile number. Create one instead.');
    if (!c.email) throw new HttpError(400, 'There is no email on this account. Please contact the shop to reset your password.');
    const recent = c.resetTokenExpires && c.resetTokenExpires.getTime() - RESET_MINUTES * 60_000 > Date.now() - 60_000;
    if (recent) throw new HttpError(429, 'A link was sent less than a minute ago. Check your inbox (and spam folder).');
    const r = await sendResetLink({ _id: c._id, email: c.email, name: c.name }, c.passwordHash ? 'reset' : 'set');
    res.json({ emailHint: maskEmail(c.email), ...r });
  }),
);

router.post(
  '/password/reset',
  authLimiter,
  ah(async (req, res) => {
    const body = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'This link is not valid'), password: passwordSchema }).parse(req.body);
    const c = await Customer.findOne({ resetTokenHash: hashToken(body.token), resetTokenExpires: { $gt: new Date() } }).lean();
    if (!c) throw new HttpError(400, 'This link has expired or was already used. Ask for a new one.');
    await Customer.updateOne(
      { _id: c._id },
      {
        $set: { passwordHash: await bcrypt.hash(body.password, 11), passwordSetAt: new Date(), failedLogins: 0, lockedUntil: null, resetTokenHash: null, resetTokenExpires: null, lastLoginAt: new Date() },
      },
    );
    logIn(res, String(c._id));
    const fresh = await Customer.findById(c._id).lean();
    res.json({ customer: publicCustomer(fresh) });
  }),
);

/** Change password while logged in. */
router.post(
  '/password/change',
  requireCustomer,
  ah(async (req, res) => {
    const body = z.object({ current: z.string().max(100), password: passwordSchema }).parse(req.body);
    const c = await Customer.findById(req.customerId).select('+passwordHash');
    if (!c) throw new HttpError(401, 'Account not found');
    if (c.passwordHash && !(await bcrypt.compare(body.current, c.passwordHash))) throw new HttpError(400, 'Your current password is not correct');
    await Customer.updateOne({ _id: c._id }, { $set: { passwordHash: await bcrypt.hash(body.password, 11), passwordSetAt: new Date() } });
    res.json({ ok: true });
  }),
);

router.get(
  '/me',
  requireCustomer,
  ah(async (req, res) => {
    const c = await Customer.findById(req.customerId).lean();
    if (!c) throw new HttpError(401, 'Account not found');
    res.json({ customer: publicCustomer(c) });
  }),
);

router.put(
  '/profile',
  requireCustomer,
  ah(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2, 'Enter your name').max(80),
        email: z.union([z.string().trim().email('Enter a valid email'), z.literal('')]).optional(),
        reminderEmails: z.boolean().optional(),
        address: z
          .object({
            line1: z.string().max(200).optional(),
            line2: z.string().max(200).optional(),
            city: z.string().max(80).optional(),
            state: z.string().max(80).optional(),
            pincode: z.union([z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'), z.literal('')]).optional(),
          })
          .optional(),
      })
      .parse(req.body);
    const update: Record<string, unknown> = { name: body.name };
    if (body.email !== undefined) update.email = body.email;
    if (body.reminderEmails !== undefined) update.reminderEmails = body.reminderEmails;
    if (body.address) for (const [k, v] of Object.entries(body.address)) update[`address.${k}`] = v ?? '';
    const c = await Customer.findByIdAndUpdate(req.customerId, { $set: update }, { new: true }).lean();
    res.json({ customer: publicCustomer(c) });
  }),
);

router.post('/logout', (_req, res) => {
  res.clearCookie(CUSTOMER_COOKIE, { path: '/' });
  res.json({ ok: true });
});

export default router;
