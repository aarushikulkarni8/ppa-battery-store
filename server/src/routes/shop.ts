import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Customer, Enquiry, Inventory, Order, Product, PurchaseHistory, Vehicle, vehicleLabel } from '../models/index.js';
import { requireCustomer } from '../middleware/auth.js';
import { withStock, PRODUCT_BRAND_FIELDS } from '../services/catalog.js';
import { orderWithItems, placeOrder } from '../services/orders.js';
import { ah, HttpError } from '../utils/http.js';
import { env } from '../config/env.js';

const router = Router();
router.use(requireCustomer);

/* ---------------- Cart ---------------- */

async function cartPayload(customerId: string) {
  const c = await Customer.findById(customerId).lean();
  if (!c) throw new HttpError(401, 'Account not found');
  const cart = c.cart ?? [];
  const ids = cart.map((i) => i.product);
  const products = await Product.find({ _id: { $in: ids } }).populate('brand', PRODUCT_BRAND_FIELDS).lean();
  const stocked = await withStock(products as any[]);
  const byId = new Map(stocked.map((p) => [String(p._id), p]));
  const items = cart
    .map((i) => ({ product: byId.get(String(i.product)), quantity: i.quantity }))
    .filter((i) => i.product);
  const subtotal = items.reduce((s, i) => s + (i.product!.sellingPrice ?? 0) * i.quantity, 0);
  return { items, subtotal, count: items.reduce((s, i) => s + i.quantity, 0) };
}

const SHOP_OFF = 'Online ordering is not available. Please call the shop or raise an enquiry for price and availability.';
function requireOnlineShop(_req: unknown, _res: unknown, next: (e?: unknown) => void) {
  next(env.ONLINE_SHOP ? undefined : new HttpError(403, SHOP_OFF));
}

router.get(
  '/cart',
  ah(async (req, res) => {
    if (!env.ONLINE_SHOP) return void res.json({ items: [], count: 0, subtotal: 0 });
    res.json(await cartPayload(req.customerId!));
  }),
);

router.put(
  '/cart/items',
  requireOnlineShop,
  ah(async (req, res) => {
    const { productId, quantity } = z
      .object({ productId: z.string(), quantity: z.number().int().min(0).max(20) })
      .parse(req.body);
    if (!Types.ObjectId.isValid(productId)) throw new HttpError(400, 'Invalid product');
    if (quantity === 0) {
      const c = await Customer.findById(req.customerId).select('cart').lean();
      await Customer.updateOne({ _id: req.customerId }, { $set: { cart: (c?.cart ?? []).filter((i) => String(i.product) !== productId) } });
      return res.json(await cartPayload(req.customerId!));
    }
    const p = await Product.findById(productId).lean();
    if (!p || !p.isActive) throw new HttpError(404, 'This battery is not available');
    if (p.sellingPrice == null) throw new HttpError(400, 'This battery has no online price yet. Raise an enquiry for a quote.');
    const inv = await Inventory.findOne({ product: p._id }).lean();
    const stock = inv?.quantity ?? 0;
    if (stock <= 0) throw new HttpError(409, 'This battery is out of stock');
    if (quantity > stock) throw new HttpError(409, `Only ${stock} in stock`);
    const updated = await Customer.updateOne(
      { _id: req.customerId, 'cart.product': p._id },
      { $set: { 'cart.$.quantity': quantity } },
    );
    if (!updated.matchedCount) await Customer.updateOne({ _id: req.customerId }, { $push: { cart: { product: p._id, quantity } } });
    res.json(await cartPayload(req.customerId!));
  }),
);

router.delete(
  '/cart',
  ah(async (req, res) => {
    await Customer.updateOne({ _id: req.customerId }, { $set: { cart: [] } });
    res.json(await cartPayload(req.customerId!));
  }),
);

/* ---------------- Orders ---------------- */

const addressSchema = z.object({
  line1: z.string().trim().min(3, 'Enter the address').max(200),
  line2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(2, 'Enter the city').max(80),
  state: z.string().trim().max(80).optional().default('Sample State'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

router.post(
  '/orders',
  requireOnlineShop,
  ah(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2, 'Enter your name').max(80),
        email: z.union([z.string().trim().email('Enter a valid email'), z.literal('')]).optional(),
        vehicleId: z.string().optional(),
        vehicleText: z.string().max(120).optional(),
        registrationNumber: z.string().max(20).optional(),
        fulfilment: z.enum(['DELIVERY_INSTALL', 'STORE_PICKUP']),
        address: addressSchema.optional(),
        paymentMethod: z.enum(['COD', 'PAY_AT_STORE']),
        notes: z.string().max(500).optional(),
        buyNow: z.object({ productId: z.string(), quantity: z.number().int().min(1).max(20) }).optional(),
      })
      .parse(req.body);
    if (body.fulfilment === 'DELIVERY_INSTALL' && !body.address) throw new HttpError(400, 'Enter a delivery address');

    let items: { productId: string; quantity: number }[];
    if (body.buyNow) items = [body.buyNow];
    else {
      const c = await Customer.findById(req.customerId).lean();
      items = (c?.cart ?? []).map((i) => ({ productId: String(i.product), quantity: i.quantity }));
    }
    const order = await placeOrder({ customerId: req.customerId!, items, fromCart: !body.buyNow, ...body });
    res.status(201).json({ orderId: order.orderId });
  }),
);

router.get(
  '/orders',
  ah(async (req, res) => {
    const orders = await Order.find({ customer: req.customerId }).sort({ createdAt: -1 }).populate('items').lean();
    res.json({ orders });
  }),
);

router.get('/orders/:orderId', ah(async (req, res) => res.json({ order: await orderWithItems(req.params.orderId, req.customerId) })));

/* ---------------- Dashboard data ---------------- */

router.get(
  '/me/purchases',
  ah(async (req, res) => {
    const purchases = await PurchaseHistory.find({ customer: req.customerId }).sort({ purchaseDate: -1 }).lean();
    const orderStatus = new Map(
      (await Order.find({ orderId: { $in: purchases.map((p) => p.orderId) } }).select('orderId status').lean()).map((o) => [
        o.orderId,
        o.status,
      ]),
    );
    res.json({ purchases: purchases.map((p) => ({ ...p, orderStatus: orderStatus.get(p.orderId) ?? '' })) });
  }),
);

router.get(
  '/me/enquiries',
  ah(async (req, res) => {
    const c = await Customer.findById(req.customerId).select('mobile').lean();
    const enquiries = await Enquiry.find({ $or: [{ customer: req.customerId }, { mobile: c?.mobile }] })
      .select('-emailError')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ enquiries });
  }),
);

router.get(
  '/me/vehicles',
  ah(async (req, res) => {
    const c = await Customer.findById(req.customerId).populate('savedVehicles.vehicle').lean();
    res.json({
      vehicles: (c?.savedVehicles ?? [])
        .filter((s) => s.vehicle)
        .map((s) => ({ ...s, label: vehicleLabel(s.vehicle as any) })),
    });
  }),
);

router.post(
  '/me/vehicles',
  ah(async (req, res) => {
    const body = z
      .object({ vehicleId: z.string(), nickname: z.string().max(40).optional(), registrationNumber: z.string().max(20).optional() })
      .parse(req.body);
    if (!Types.ObjectId.isValid(body.vehicleId) || !(await Vehicle.exists({ _id: body.vehicleId })))
      throw new HttpError(404, 'Vehicle not found');
    const c = await Customer.findById(req.customerId);
    if (!c) throw new HttpError(401, 'Account not found');
    c.savedVehicles ??= [] as any;
    if (c.savedVehicles.some((s) => String(s.vehicle) === body.vehicleId && (s.registrationNumber ?? '') === (body.registrationNumber ?? '').toUpperCase()))
      return res.json({ ok: true });
    if (c.savedVehicles.length >= 10) throw new HttpError(400, 'You can save up to 10 vehicles');
    c.savedVehicles.push({ vehicle: body.vehicleId, nickname: body.nickname ?? '', registrationNumber: body.registrationNumber ?? '' } as any);
    await c.save();
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/me/vehicles/:id',
  ah(async (req, res) => {
    const c = await Customer.findById(req.customerId).select('savedVehicles').lean();
    await Customer.updateOne(
      { _id: req.customerId },
      { $set: { savedVehicles: (c?.savedVehicles ?? []).filter((v) => String(v._id) !== req.params.id) } },
    );
    res.json({ ok: true });
  }),
);

export default router;
