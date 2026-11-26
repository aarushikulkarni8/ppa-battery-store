/**
 * Half-yearly service reminders.
 *
 * Every battery bought for an automotive vehicle (car, three-wheeler, commercial, tractor) or
 * under Inverters & home UPS gets an email 6, 12, 18 … months after the purchase date, until its
 * warranty ends. Two-wheeler batteries are not included.
 *
 * The job is safe to run as often as you like: each purchase remembers how many reminders it has
 * had, so nothing is sent twice. If the server was off when a reminder was due, the next run sends
 * it (once — missed half-years are not sent as a pile of emails).
 */
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { Customer, Order, Product, PurchaseHistory } from '../models/index.js';
import { addMonths } from '../utils/http.js';
import { customerMailConfigured, sendCustomerMail } from './mailer.js';
import { REMINDER } from '../config/reminders.js';

// Text, interval, categories and sending hours live in config/reminders.ts so they are easy to edit.
export const REMINDER_CATEGORIES = REMINDER.categories;
const INTERVAL_MONTHS = REMINDER.everyMonths;

/** How many whole reminder intervals (half-years) have passed since `from`. */
export function halfYearsSince(from: Date, now: Date) {
  const months = (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  let k = Math.max(0, Math.floor(months / INTERVAL_MONTHS));
  while (k > 0 && addMonths(from, k * INTERVAL_MONTHS) > now) k--;
  return k;
}

/**
 * When the next reminder goes out for a purchase: a past date means it is due and will be sent on
 * the next run; null means no more reminders (warranty over, or order cancelled).
 */
export function nextReminderDate(p: { purchaseDate: Date; warrantyExpiry: Date; remindersSent?: number; status?: string }, now = new Date()) {
  if (p.status === 'VOID') return null;
  const bought = new Date(p.purchaseDate);
  const passed = halfYearsSince(bought, now);
  const sent = p.remindersSent ?? 0;
  const k = passed > sent ? passed : Math.max(sent, passed) + 1;
  const date = addMonths(bought, k * INTERVAL_MONTHS);
  return !REMINDER.onlyWhileUnderWarranty || date <= new Date(p.warrantyExpiry) ? date : null;
}

async function eligibleProductIds(ids: Types.ObjectId[]) {
  const products = await Product.find({ _id: { $in: ids }, vehicleCategory: { $in: REMINDER_CATEGORIES } }).select('_id').lean();
  return new Set(products.map((p) => String(p._id)));
}

/** Where to send, or '' if we can't (no address, or the customer switched reminders off). */
async function emailFor(customerId: Types.ObjectId) {
  const c = await Customer.findById(customerId).select('email reminderEmails').lean();
  if (c?.reminderEmails === false) return null;
  if (c?.email) return c.email;
  const lastOrder = await Order.findOne({ customer: customerId, customerEmail: { $nin: ['', null] } }).sort({ createdAt: -1 }).select('customerEmail').lean();
  return lastOrder?.customerEmail || '';
}

export interface ReminderRunResult {
  ran: boolean;
  reason?: string;
  emailsSent: number;
  batteriesCovered: number;
  noEmail: number;
  optedOut: number;
  failed: number;
  errors: string[];
}

let running = false;

export async function runServiceReminders(now = new Date(), opts: { anyTime?: boolean } = {}): Promise<ReminderRunResult> {
  const result: ReminderRunResult = { ran: false, emailsSent: 0, batteriesCovered: 0, noEmail: 0, optedOut: 0, failed: 0, errors: [] };
  if (!env.SERVICE_REMINDERS) return { ...result, reason: 'Service reminders are turned off (SERVICE_REMINDERS=off).' };
  if (!customerMailConfigured()) return { ...result, reason: 'Email (SMTP) is not set up in server/.env.' };
  if (running) return { ...result, reason: 'A reminder run is already in progress.' };
  const istHour = new Date(now.getTime() + 330 * 60_000).getUTCHours();
  if (!opts.anyTime && (istHour < REMINDER.sendFromHour || istHour >= REMINDER.sendUntilHour))
    return { ...result, reason: `Outside sending hours (${REMINDER.sendFromHour}:00 to ${REMINDER.sendUntilHour}:00 India time).` };
  running = true;
  try {
    result.ran = true;
    const firstDue = addMonths(now, -INTERVAL_MONTHS);
    const candidates = await PurchaseHistory.find({ status: 'ACTIVE', purchaseDate: { $lte: firstDue }, warrantyExpiry: { $gte: firstDue } }).lean();
    const eligible = await eligibleProductIds(candidates.map((p) => p.product as Types.ObjectId));

    // purchases with a reminder due now, grouped by customer
    const due = new Map<string, { id: Types.ObjectId; prev: number; next: number }[]>();
    for (const p of candidates) {
      if (!eligible.has(String(p.product))) continue;
      const k = halfYearsSince(new Date(p.purchaseDate), now);
      const prev = p.remindersSent ?? 0;
      if (k <= prev) continue;
      if (REMINDER.onlyWhileUnderWarranty && addMonths(new Date(p.purchaseDate), k * INTERVAL_MONTHS) > new Date(p.warrantyExpiry)) continue;
      const list = due.get(String(p.customer)) ?? [];
      list.push({ id: p._id as Types.ObjectId, prev, next: k });
      due.set(String(p.customer), list);
    }

    for (const [customerId, items] of due) {
      const to = await emailFor(new Types.ObjectId(customerId));
      if (to === null) {
        // customer switched reminders off: mark as handled so they are not retried
        for (const it of items) await PurchaseHistory.updateOne({ _id: it.id, remindersSent: it.prev }, { $set: { remindersSent: it.next } });
        result.optedOut += items.length;
        continue;
      }
      if (!to) {
        result.noEmail += items.length;
        continue;
      }
      // Claim the purchases first so two runs at the same moment can't both send.
      const claimed: typeof items = [];
      for (const it of items) {
        const r = await PurchaseHistory.updateOne({ _id: it.id, remindersSent: it.prev }, { $set: { remindersSent: it.next } });
        if (r.modifiedCount) claimed.push(it);
      }
      if (!claimed.length) continue;
      try {
        await sendCustomerMail(to, REMINDER.subject, REMINDER.body);
        await PurchaseHistory.updateMany({ _id: { $in: claimed.map((c) => c.id) } }, { $set: { lastReminderAt: now, lastReminderError: '' } });
        result.emailsSent++;
        result.batteriesCovered += claimed.length;
      } catch (e) {
        // put the counters back so the next run tries again
        for (const it of claimed)
          await PurchaseHistory.updateOne({ _id: it.id }, { $set: { remindersSent: it.prev, lastReminderError: (e as Error).message.slice(0, 300) } });
        result.failed++;
        result.errors.push(`${to}: ${(e as Error).message}`);
      }
    }
    return result;
  } finally {
    running = false;
  }
}

/** Checks for due reminders shortly after the server starts, then every hour (emails only go out during sending hours). */
export function startReminderScheduler() {
  if (!env.SERVICE_REMINDERS) {
    console.log('[reminders] off (SERVICE_REMINDERS=off)');
    return;
  }
  const run = () =>
    runServiceReminders()
      .then((r) => {
        if (!r.ran) return r.reason?.startsWith('Outside') ? undefined : console.log(`[reminders] skipped: ${r.reason}`);
        if (r.emailsSent || r.failed || r.noEmail || r.optedOut)
          console.log(`[reminders] sent ${r.emailsSent} email(s) for ${r.batteriesCovered} batteries; ${r.noEmail} due without an email address; ${r.optedOut} switched off; ${r.failed} failed`);
      })
      .catch((e) => console.error('[reminders] error:', e.message));
  setTimeout(run, 60_000);
  setInterval(run, 60 * 60 * 1000);
}
