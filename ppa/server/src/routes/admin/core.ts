import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { ENQUIRY_STATUSES, ORDER_STATUSES } from '../../config/constants.js';
import { Admin, Customer, Enquiry, Inventory, Order, OrderItem, PcbOrder, PCB_ORDER_STATUSES, Product, PurchaseHistory, vehicleLabel } from '../../models/index.js';
import { ADMIN_COOKIE, requireAdmin, setAuthCookie, signToken } from '../../middleware/auth.js';
import { cancelOrder, orderWithItems, recordStoreSale } from '../../services/orders.js';
import { nextReminderDate, REMINDER_CATEGORIES, runServiceReminders } from '../../services/reminders.js';
import { REMINDER } from '../../config/reminders.js';
import { customerMailConfigured, sendCustomerMail } from '../../services/mailer.js';
import { env } from '../../config/env.js';
import { sendResetLink } from '../auth.js';
import { ah, escapeRegex, HttpError, istStartOfDay, istStartOfMonth } from '../../utils/http.js';

const router = Router();

/* ---------- Auth ---------- */
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

router.post(
  '/auth/login',
  loginLimiter,
  ah(async (req, res) => {
    const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) throw new HttpError(401, 'Wrong email or password');
    admin.lastLoginAt = new Date();
    await admin.save();
    setAuthCookie(res, ADMIN_COOKIE, signToken(String(admin._id), 'admin'), 0.5);
    res.json({ admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  }),
);

router.post('/auth/logout', (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.use(requireAdmin);

router.get(
  '/auth/me',
  ah(async (req, res) => {
    const admin = await Admin.findById(req.adminId).select('name email role').lean();
    if (!admin) throw new HttpError(401, 'Admin not found');
    res.json({ admin });
  }),
);

router.put(
  '/auth/password',
  ah(async (req, res) => {
    const { current, next } = z.object({ current: z.string(), next: z.string().min(8, 'Use at least 8 characters') }).parse(req.body);
    const admin = await Admin.findById(req.adminId);
    if (!admin || !(await bcrypt.compare(current, admin.passwordHash))) throw new HttpError(400, 'Current password is wrong');
    admin.passwordHash = await bcrypt.hash(next, 12);
    await admin.save();
    res.json({ ok: true });
  }),
);

/* ---------- Dashboard ---------- */
router.get(
  '/stats',
  ah(async (_req, res) => {
    const today = istStartOfDay();
    const month = istStartOfMonth();
    const since = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    const notCancelled = { status: { $ne: 'CANCELLED' } };
    const from = since < month ? since : month;

    // Plain queries + in-code totals: a shop's 30-day order volume is small, and this
    // runs the same on Atlas and on any MongoDB-compatible server.
    const pcbOpen = await PcbOrder.countDocuments({ status: { $in: ['New', 'Confirmed', 'In progress', 'Ready'] } });
    const [totalCustomers, totalOrders, totalProducts, pendingOrders, openEnquiries, recentOrders, windowOrders, inventory] = await Promise.all([
      Customer.countDocuments(),
      Order.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments({ status: { $in: ['PLACED', 'CONFIRMED', 'READY'] } }),
      Enquiry.countDocuments({ status: { $in: ['New', 'In Progress'] } }),
      Order.find().sort({ createdAt: -1 }).limit(8).select('orderId customerName customerMobile total status createdAt').lean(),
      Order.find({ ...notCancelled, createdAt: { $gte: from } }).select('_id total createdAt').lean(),
      Inventory.find().populate('product', 'name model sku isActive sellingPrice').lean(),
    ]);

    const istDay = (d: Date) => new Date(d.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
    const todayOrders = windowOrders.filter((o) => o.createdAt >= today);
    const monthOrders = windowOrders.filter((o) => o.createdAt >= month);
    const byDay = new Map<string, { total: number; orders: number }>();
    for (const o of windowOrders) {
      if (o.createdAt < since) continue;
      const k = istDay(o.createdAt);
      const row = byDay.get(k) ?? { total: 0, orders: 0 };
      row.total += o.total;
      row.orders += 1;
      byDay.set(k, row);
    }
    const series = Array.from({ length: 30 }, (_, i) => {
      const d = istDay(new Date(since.getTime() + i * 24 * 60 * 60 * 1000));
      return { date: d, total: byDay.get(d)?.total ?? 0, orders: byDay.get(d)?.orders ?? 0 };
    });

    const monthItems = await OrderItem.find({ order: { $in: monthOrders.map((o) => o._id) } }).select('brandName lineTotal quantity').lean();
    const brandMap = new Map<string, { brand: string; total: number; units: number }>();
    for (const i of monthItems) {
      const row = brandMap.get(i.brandName) ?? { brand: i.brandName, total: 0, units: 0 };
      row.total += i.lineTotal;
      row.units += i.quantity;
      brandMap.set(i.brandName, row);
    }
    const byBrand = [...brandMap.values()].sort((a, b) => b.total - a.total);

    const lowStock = inventory
      .filter((inv) => {
        const p = inv.product as any;
        // price-on-request models can't be ordered online, so they don't raise alerts
        return p && p.isActive && p.sellingPrice != null && inv.quantity <= inv.lowStockThreshold;
      })
      .map((inv) => {
        const p = inv.product as any;
        return { _id: inv._id, productId: p._id, name: p.name, model: p.model, sku: p.sku, quantity: inv.quantity, lowStockThreshold: inv.lowStockThreshold };
      })
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 20);
    const sumOf = (list: { total: number }[]) => list.reduce((s, o) => s + o.total, 0);

    res.json({
      totalCustomers,
      totalOrders,
      todaySales: sumOf(todayOrders),
      todayOrders: todayOrders.length,
      monthlySales: sumOf(monthOrders),
      monthlyOrders: monthOrders.length,
      totalProducts,
      lowStockCount: lowStock.length,
      pendingOrders,
      pcbOpen,
      openEnquiries,
      series,
      byBrand,
      lowStock,
      recentOrders,
    });
  }),
);

/* ---------- Customers ---------- */
router.get(
  '/customers',
  ah(async (req, res) => {
    const { q = '', page = 1 } = z.object({ q: z.string().max(80).optional(), page: z.coerce.number().min(1).optional() }).parse(req.query);
    const term = q.trim();
    const filter: Record<string, unknown> = {};
    if (term) {
      const re = new RegExp(escapeRegex(term), 'i');
      const digits = term.replace(/\D/g, '');
      filter.$or = [{ name: re }, { email: re }, ...(digits.length >= 3 ? [{ mobile: new RegExp(escapeRegex(digits.slice(-10))) }] : [])];
    }
    const limit = 25;
    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).select('name mobile email createdAt lastLoginAt').lean(),
      Customer.countDocuments(filter),
    ]);
    const custOrders = await Order.find({ customer: { $in: customers.map((c) => c._id) }, status: { $ne: 'CANCELLED' } })
      .select('customer total createdAt')
      .lean();
    const map = new Map<string, { orders: number; spent: number; last: Date | null }>();
    for (const o of custOrders) {
      const k = String(o.customer);
      const row = map.get(k) ?? { orders: 0, spent: 0, last: null };
      row.orders += 1;
      row.spent += o.total;
      if (!row.last || o.createdAt > row.last) row.last = o.createdAt;
      map.set(k, row);
    }
    res.json({
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      customers: customers.map((c) => {
        const s = map.get(String(c._id));
        return { ...c, orders: s?.orders ?? 0, totalSpent: s?.spent ?? 0, lastPurchase: s?.last ?? null };
      }),
    });
  }),
);

router.get(
  '/customers/:id',
  ah(async (req, res) => {
    const customer = await Customer.findById(req.params.id).populate('savedVehicles.vehicle').lean();
    if (!customer) throw new HttpError(404, 'Customer not found');
    const [orders, purchases, enquiries] = await Promise.all([
      Order.find({ customer: customer._id }).sort({ createdAt: -1 }).populate('items').lean(),
      PurchaseHistory.find({ customer: customer._id }).sort({ purchaseDate: -1 }).lean(),
      Enquiry.find({ $or: [{ customer: customer._id }, { mobile: customer.mobile }] }).sort({ createdAt: -1 }).lean(),
    ]);
    const pcbOrders = await PcbOrder.find({ customer: customer._id }).sort({ createdAt: -1 }).lean();
    const valid = orders.filter((o) => o.status !== 'CANCELLED');
    const eligible = await reminderEligibleIds(purchases.map((p) => p.product as any));
    res.json({
      customer: {
        ...customer,
        cart: undefined,
        savedVehicles: (customer.savedVehicles ?? []).filter((s) => s.vehicle).map((s) => ({ ...s, label: vehicleLabel(s.vehicle as any) })),
      },
      summary: {
        totalOrders: orders.length,
        totalPurchases: purchases.filter((p) => p.status === 'ACTIVE').reduce((s, p) => s + (p.quantity ?? 0), 0),
        totalSpent: valid.reduce((s, o) => s + o.total, 0),
        lastPurchase: valid[0]?.createdAt ?? null,
      },
      orders,
      purchases: purchases.map((p) => ({
        ...p,
        reminderEligible: eligible.has(String(p.product)),
        nextReminder: eligible.has(String(p.product)) ? nextReminderDate(p as any) : null,
      })),
      enquiries,
      pcbOrders,
    });
  }),
);

router.patch(
  '/customers/:id',
  ah(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2, 'Enter the name').max(80).optional(),
        email: z.union([z.string().trim().toLowerCase().email('Enter a valid email'), z.literal('')]).optional(),
        reminderEmails: z.boolean().optional(),
      })
      .parse(req.body);
    const c = await Customer.findByIdAndUpdate(req.params.id, { $set: body }, { new: true }).lean();
    if (!c) throw new HttpError(404, 'Customer not found');
    res.json({ customer: { _id: c._id, name: c.name, email: c.email, reminderEmails: c.reminderEmails !== false } });
  }),
);

/** Owner helps a customer who forgot their password: emails them a link to set a new one. */
router.post(
  '/customers/:id/password-link',
  ah(async (req, res) => {
    const c = await Customer.findById(req.params.id).lean();
    if (!c) throw new HttpError(404, 'Customer not found');
    if (!c.email) throw new HttpError(400, 'Add the customer’s email first; the link is sent there.');
    const r = await sendResetLink({ _id: c._id, email: c.email, name: c.name }, c.passwordSetAt ? 'reset' : 'set');
    res.json({ ...r, to: c.email });
  }),
);

/**
 * Delete a customer. With orders, everything that belongs to them goes too (orders, purchase
 * history / warranties, PCB orders, enquiries) and the request must repeat their mobile number.
 * Stock is not added back: the goods were really sold.
 */
router.delete(
  '/customers/:id',
  ah(async (req, res) => {
    const { confirmMobile } = z.object({ confirmMobile: z.string().trim().optional() }).parse(req.body ?? {});
    const c = await Customer.findById(req.params.id).lean();
    if (!c) throw new HttpError(404, 'Customer not found');
    const [orders, pcbOrders] = await Promise.all([
      Order.find({ customer: c._id }).select('_id').lean(),
      PcbOrder.countDocuments({ customer: c._id }),
    ]);
    if ((orders.length || pcbOrders) && confirmMobile?.replace(/\D/g, '').slice(-10) !== c.mobile)
      throw new HttpError(409, `This customer has ${orders.length} order(s) and ${pcbOrders} PCB order(s). Type their mobile number to delete everything.`);
    const orderIds = orders.map((o) => o._id);
    const [items, purchases, pcb, enquiries] = await Promise.all([
      OrderItem.deleteMany({ order: { $in: orderIds } }),
      PurchaseHistory.deleteMany({ customer: c._id }),
      PcbOrder.deleteMany({ customer: c._id }),
      Enquiry.deleteMany({ $or: [{ customer: c._id }, { mobile: c.mobile }] }),
    ]);
    await Order.deleteMany({ _id: { $in: orderIds } });
    await Customer.deleteOne({ _id: c._id });
    res.json({
      ok: true,
      deleted: { orders: orderIds.length, orderItems: items.deletedCount, purchases: purchases.deletedCount, pcbOrders: pcb.deletedCount, enquiries: enquiries.deletedCount },
    });
  }),
);

/* ---------- Orders ---------- */
router.get(
  '/orders',
  ah(async (req, res) => {
    const { status, q = '', page = 1 } = z
      .object({ status: z.enum(ORDER_STATUSES).optional(), q: z.string().max(80).optional(), page: z.coerce.number().min(1).optional() })
      .parse(req.query);
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (q.trim()) {
      const re = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ orderId: re }, { customerName: re }, { customerMobile: re }, { 'vehicle.label': re }];
    }
    const limit = 25;
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('items').lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  }),
);

router.get('/orders/:orderId', ah(async (req, res) => res.json({ order: await orderWithItems(req.params.orderId) })));

router.patch(
  '/orders/:orderId/status',
  ah(async (req, res) => {
    const { status, note = '', paymentStatus } = z
      .object({ status: z.enum(ORDER_STATUSES), note: z.string().max(300).optional(), paymentStatus: z.enum(['PENDING', 'PAID']).optional() })
      .parse(req.body);
    const admin = await Admin.findById(req.adminId).select('name').lean();
    const by = admin?.name ? ` (${admin.name})` : '';
    if (status === 'CANCELLED') {
      await cancelOrder(req.params.orderId, (note || 'Cancelled by store') + by);
    } else {
      const order = await Order.findOne({ orderId: req.params.orderId });
      if (!order) throw new HttpError(404, 'Order not found');
      if (order.status === 'CANCELLED') throw new HttpError(400, 'A cancelled order cannot be reopened. Ask the customer to place a new order.');
      if (order.status !== status) order.statusHistory.push({ status, note: note + by, at: new Date() });
      order.status = status;
      if (paymentStatus) order.paymentStatus = paymentStatus;
      await order.save();
    }
    res.json({ order: await orderWithItems(req.params.orderId) });
  }),
);

/* ---------- Enquiries ---------- */
router.get(
  '/enquiries',
  ah(async (req, res) => {
    const { status, q = '' } = z.object({ status: z.enum(ENQUIRY_STATUSES).optional(), q: z.string().max(80).optional() }).parse(req.query);
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (q.trim()) {
      const re = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ name: re }, { mobile: re }, { email: re }, { enquiryNumber: re }, { orderId: re }, { productLabel: re }];
    }
    const [enquiries, counts] = await Promise.all([
      Enquiry.find(filter).sort({ createdAt: -1 }).limit(200).lean(),
      Enquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    res.json({ enquiries, counts: Object.fromEntries(counts.map((c) => [c._id, c.count])) });
  }),
);

router.get(
  '/enquiries/:id',
  ah(async (req, res) => {
    const enquiry = await Enquiry.findById(req.params.id).populate('product', 'name model slug').lean();
    if (!enquiry) throw new HttpError(404, 'Enquiry not found');
    const customer = enquiry.customer
      ? await Customer.findById(enquiry.customer).select('name mobile email createdAt').lean()
      : await Customer.findOne({ mobile: enquiry.mobile }).select('name mobile email createdAt').lean();
    const order = enquiry.orderId ? await Order.findOne({ orderId: enquiry.orderId }).select('orderId total status createdAt').lean() : null;
    res.json({ enquiry, customer, order });
  }),
);

router.patch(
  '/enquiries/:id',
  ah(async (req, res) => {
    const { status, note } = z.object({ status: z.enum(ENQUIRY_STATUSES).optional(), note: z.string().max(1000).optional() }).parse(req.body);
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) throw new HttpError(404, 'Enquiry not found');
    const admin = await Admin.findById(req.adminId).select('name').lean();
    if (status && status !== enquiry.status) enquiry.status = status;
    if (note?.trim() || status) enquiry.notes.push({ text: note?.trim() ?? '', by: admin?.name ?? 'Admin', status: enquiry.status, at: new Date() });
    await enquiry.save();
    res.json({ enquiry });
  }),
);


/* ---- Sales made in the shop ---- */
const storeSaleSchema = z.object({
  customer: z.object({
    mobile: z.string().trim().min(10, 'Enter the customer mobile number'),
    name: z.string().trim().max(80).optional().default(''),
    email: z.union([z.string().trim().email('Enter a valid email'), z.literal('')]).optional().default(''),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid product'),
        quantity: z.coerce.number().int().min(1).max(100),
        unitPrice: z.coerce.number().min(0).max(1_000_000),
      }),
    )
    .min(1, 'Add at least one product')
    .max(30),
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD']),
  paid: z.boolean().optional().default(true),
  vehicleText: z.string().trim().max(120).optional().default(''),
  registrationNumber: z.string().trim().max(20).optional().default(''),
  notes: z.string().trim().max(1000).optional().default(''),
  reduceStock: z.boolean().optional().default(true),
});

router.post(
  '/sales',
  ah(async (req, res) => {
    const body = storeSaleSchema.parse(req.body);
    const admin = await Admin.findById(req.adminId).select('name email').lean();
    // A date picked in the form means that day in India; keep the time of entry if it is today.
    let saleDate: Date | undefined;
    if (body.saleDate) {
      const todayIst = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
      saleDate = body.saleDate === todayIst ? new Date() : new Date(`${body.saleDate}T12:00:00+05:30`);
    }
    const result = await recordStoreSale({ ...body, saleDate, recordedBy: admin?.name || admin?.email || 'admin' });
    res.status(201).json(result);
  }),
);

/* ---- Half-yearly service reminders ---- */
async function reminderEligibleIds(ids: unknown[]) {
  const products = await Product.find({ _id: { $in: ids }, vehicleCategory: { $in: REMINDER_CATEGORIES } }).select('_id').lean();
  return new Set(products.map((p) => String(p._id)));
}

router.get(
  '/reminders',
  ah(async (_req, res) => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86_400_000);
    const ago30 = new Date(now.getTime() - 30 * 86_400_000);
    const active = await PurchaseHistory.find({ status: 'ACTIVE' }).lean();
    const eligible = await reminderEligibleIds(active.map((p) => p.product));
    const tracked = active.filter((p) => eligible.has(String(p.product)));
    const customers = await Customer.find({ _id: { $in: [...new Set(tracked.map((p) => String(p.customer)))] } })
      .select('name mobile email reminderEmails')
      .lean();
    const byId = new Map(customers.map((c) => [String(c._id), c]));

    const upcoming = tracked
      .map((p) => ({ p, next: nextReminderDate(p as any, now), c: byId.get(String(p.customer)) }))
      .filter((x) => x.next && x.next <= in30)
      .sort((a, b) => a.next!.getTime() - b.next!.getTime());

    const row = (x: { p: any; next?: Date | null; c: any }) => ({
      purchaseId: x.p._id,
      customerId: x.p.customer,
      customerName: x.c?.name ?? '',
      mobile: x.c?.mobile ?? '',
      email: x.c?.email ?? '',
      reminderEmails: x.c?.reminderEmails !== false,
      product: x.p.productName,
      model: x.p.model,
      purchaseDate: x.p.purchaseDate,
      nextReminder: x.next ?? null,
      lastReminderAt: x.p.lastReminderAt,
      lastReminderError: x.p.lastReminderError,
      remindersSent: x.p.remindersSent ?? 0,
    });

    res.json({
      enabled: env.SERVICE_REMINDERS,
      emailReady: customerMailConfigured(),
      sendHours: [REMINDER.sendFromHour, REMINDER.sendUntilHour],
      everyMonths: REMINDER.everyMonths,
      subject: REMINDER.subject,
      body: REMINDER.body,
      counts: {
        tracked: tracked.length,
        dueNow: upcoming.filter((x) => x.next! <= now).length,
        next30: upcoming.filter((x) => x.next! > now).length,
        sentLast30: tracked.filter((p) => p.lastReminderAt && p.lastReminderAt >= ago30).length,
        withoutEmail: tracked.filter((p) => !byId.get(String(p.customer))?.email).length,
      },
      upcoming: upcoming.slice(0, 50).map(row),
      recent: tracked
        .filter((p) => p.lastReminderAt || p.lastReminderError)
        .sort((a, b) => new Date(b.lastReminderAt ?? 0).getTime() - new Date(a.lastReminderAt ?? 0).getTime())
        .slice(0, 20)
        .map((p) => row({ p, c: byId.get(String(p.customer)) })),
    });
  }),
);

router.post(
  '/reminders/run',
  ah(async (_req, res) => {
    res.json(await runServiceReminders(new Date(), { anyTime: true }));
  }),
);

router.post(
  '/reminders/test',
  ah(async (req, res) => {
    const { to } = z.object({ to: z.string().trim().email('Enter a valid email').optional() }).parse(req.body ?? {});
    const target = to || env.OWNER_EMAIL;
    if (!target) throw new HttpError(400, 'Enter an email address to send the test to.');
    if (!customerMailConfigured()) throw new HttpError(400, 'Email (SMTP) is not set up in server/.env.');
    await sendCustomerMail(target, REMINDER.subject, REMINDER.body);
    res.json({ ok: true, to: target });
  }),
);

/* ---- PCB orders ---- */
router.get(
  '/pcb-orders',
  ah(async (req, res) => {
    const q = z.object({ status: z.string().optional(), q: z.string().max(80).optional() }).parse(req.query);
    const filter: Record<string, unknown> = {};
    if (q.status && (PCB_ORDER_STATUSES as readonly string[]).includes(q.status)) filter.status = q.status;
    if (q.q?.trim()) {
      const rx = new RegExp(escapeRegex(q.q.trim()), 'i');
      filter.$or = [{ orderNumber: rx }, { customerName: rx }, { customerMobile: rx }, { productName: rx }, { partNumber: rx }, { company: rx }];
    }
    const [orders, open] = await Promise.all([
      PcbOrder.find(filter).sort({ createdAt: -1 }).limit(300).lean(),
      PcbOrder.countDocuments({ status: { $in: ['New', 'Confirmed', 'In progress', 'Ready'] } }),
    ]);
    res.json({ orders, open });
  }),
);

router.get(
  '/pcb-orders/:id',
  ah(async (req, res) => {
    const order = await PcbOrder.findOne({ $or: [{ orderNumber: req.params.id }, ...(/^[a-f0-9]{24}$/i.test(req.params.id) ? [{ _id: req.params.id }] : [])] }).lean();
    if (!order) throw new HttpError(404, 'PCB order not found');
    res.json({ order });
  }),
);

router.patch(
  '/pcb-orders/:id',
  ah(async (req, res) => {
    const body = z.object({ status: z.enum(PCB_ORDER_STATUSES), note: z.string().trim().max(500).optional().default('') }).parse(req.body);
    const admin = await Admin.findById(req.adminId).select('name email').lean();
    const order = await PcbOrder.findOne({ orderNumber: req.params.id });
    if (!order) throw new HttpError(404, 'PCB order not found');
    order.status = body.status;
    order.statusHistory.push({ status: body.status, note: body.note, by: admin?.name || 'admin', at: new Date() });
    await order.save();
    res.json({ order: order.toObject() });
  }),
);

export default router;
