import { Types } from 'mongoose';
import { Customer, Inventory, Order, OrderItem, Product, PurchaseHistory, Vehicle, vehicleLabel } from '../models/index.js';
import { addMonths, fullName, HttpError, normalizeMobile } from '../utils/http.js';
import { newOrderId } from './ids.js';
import { sendOwnerMail } from './mailer.js';

export interface PlaceOrderInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
  fromCart: boolean;
  name: string;
  email?: string;
  vehicleId?: string;
  vehicleText?: string;
  registrationNumber?: string;
  fulfilment: 'DELIVERY_INSTALL' | 'STORE_PICKUP';
  address?: { line1?: string; line2?: string; city?: string; state?: string; pincode?: string };
  paymentMethod: 'COD' | 'PAY_AT_STORE';
  notes?: string;
}

async function adjustStock(productId: Types.ObjectId, delta: number, reason: string, ref: string) {
  const cond: Record<string, unknown> = { product: productId };
  if (delta < 0) cond.quantity = { $gte: -delta };
  return Inventory.findOneAndUpdate(
    cond,
    { $inc: { quantity: delta }, $push: { movements: { $each: [{ delta, reason, ref, at: new Date() }], $slice: -100 } } },
    { new: true },
  );
}

export async function placeOrder(input: PlaceOrderInput) {
  const customer = await Customer.findById(input.customerId);
  if (!customer) throw new HttpError(401, 'Account not found');
  if (!input.items.length) throw new HttpError(400, 'Your cart is empty');

  // merge duplicate lines
  const qty = new Map<string, number>();
  for (const i of input.items) qty.set(i.productId, (qty.get(i.productId) ?? 0) + i.quantity);

  const products = await Product.find({ _id: { $in: [...qty.keys()] } }).populate('brand', 'name isActive').lean();
  if (products.length !== qty.size) throw new HttpError(400, 'One of the batteries in your cart is no longer available');
  for (const p of products) {
    if (!p.isActive || !(p.brand as any)?.isActive) throw new HttpError(400, `${p.name} is no longer available`);
    if (p.sellingPrice == null) throw new HttpError(400, `${p.name} has no price yet. Raise an enquiry for a quote.`);
  }

  let vehicleLabelText = (input.vehicleText ?? '').trim();
  let vehicleId: Types.ObjectId | null = null;
  if (input.vehicleId && Types.ObjectId.isValid(input.vehicleId)) {
    const v = await Vehicle.findById(input.vehicleId).lean();
    if (v) {
      vehicleId = v._id;
      vehicleLabelText = vehicleLabel(v);
    }
  }

  const orderId = newOrderId();

  // Reserve stock; roll back if any line is short.
  const reserved: { id: Types.ObjectId; q: number }[] = [];
  for (const p of products) {
    const q = qty.get(String(p._id))!;
    const ok = await adjustStock(p._id, -q, 'ORDER', orderId);
    if (!ok) {
      for (const r of reserved) await adjustStock(r.id, r.q, 'ORDER_ROLLBACK', orderId);
      const inv = await Inventory.findOne({ product: p._id }).lean();
      throw new HttpError(409, `Only ${inv?.quantity ?? 0} of ${p.name} left in stock`);
    }
    reserved.push({ id: p._id, q });
  }

  try {
    const now = new Date();
    const orderDoc = new Order({
      orderId,
      customer: customer._id,
      customerName: input.name.trim(),
      customerMobile: customer.mobile,
      customerEmail: (input.email ?? customer.email ?? '').trim(),
      vehicle: { vehicleId, label: vehicleLabelText, registrationNumber: (input.registrationNumber ?? '').toUpperCase().trim() },
      fulfilment: input.fulfilment,
      address: input.fulfilment === 'DELIVERY_INSTALL' ? input.address : undefined,
      paymentMethod: input.paymentMethod,
      itemCount: 0,
      subtotal: 0,
      total: 0,
      status: 'PLACED',
      statusHistory: [{ status: 'PLACED', note: 'Order placed by customer', at: now }],
      notes: input.notes ?? '',
    });

    const items = products.map((p) => {
      const q = qty.get(String(p._id))!;
      return new OrderItem({
        order: orderDoc._id,
        orderId,
        product: p._id,
        brandName: (p.brand as any).name,
        productName: p.name,
        model: p.model,
        sku: p.sku,
        voltage: p.voltage,
        capacityAh: p.capacityAh,
        imageUrl: p.images?.[0]?.url ?? '',
        warranty: p.warranty,
        mrp: p.mrp,
        unitPrice: p.sellingPrice!,
        quantity: q,
        lineTotal: p.sellingPrice! * q,
      });
    });

    orderDoc.items = items.map((i) => i._id);
    orderDoc.itemCount = items.reduce((s, i) => s + i.quantity, 0);
    orderDoc.subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    orderDoc.total = orderDoc.subtotal;

    await OrderItem.insertMany(items);
    await orderDoc.save();

    await PurchaseHistory.insertMany(
      items.map((i) => {
        const w = i.warranty!;
        return {
          customer: customer._id,
          order: orderDoc._id,
          orderItem: i._id,
          orderId,
          product: i.product,
          brandName: i.brandName,
          productName: i.productName,
          model: i.model,
          sku: i.sku,
          capacityAh: i.capacityAh,
          imageUrl: i.imageUrl,
          vehicleLabel: vehicleLabelText,
          registrationNumber: orderDoc.vehicle?.registrationNumber ?? '',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          amount: i.lineTotal,
          purchaseDate: now,
          warrantyMonths: w.totalMonths,
          freeReplacementMonths: w.freeMonths ?? null,
          proRataMonths: w.proRataMonths ?? null,
          freeReplacementUntil: w.freeMonths != null ? addMonths(now, w.freeMonths) : null,
          warrantyExpiry: addMonths(now, w.totalMonths),
        };
      }),
    );

    // Keep the customer's profile and cart in sync
    const set: Record<string, unknown> = {};
    if (!customer.name) set.name = input.name.trim();
    if (!customer.email && input.email) set.email = input.email.trim();
    if (input.fulfilment === 'DELIVERY_INSTALL' && input.address && !customer.address?.line1) set.address = input.address;
    if (input.fromCart) {
      // Filter in code and $set, which behaves the same on every MongoDB-compatible server.
      const bought = new Set(products.map((p) => String(p._id)));
      set.cart = (customer.cart ?? []).filter((i) => !bought.has(String(i.product))).map((i) => ({ product: i.product, quantity: i.quantity }));
    }
    if (Object.keys(set).length) await Customer.updateOne({ _id: customer._id }, { $set: set });

    sendOwnerMail(`New order ${orderId} — ₹${orderDoc.total}`, 'NEW ORDER', [
      ['Order ID', orderId],
      ['Customer', orderDoc.customerName],
      ['Mobile', orderDoc.customerMobile],
      ['Email', orderDoc.customerEmail],
      ['Vehicle', [vehicleLabelText, orderDoc.vehicle?.registrationNumber].filter(Boolean).join(' / ')],
      ['Items', items.map((i) => `${i.quantity} × ${fullName(i.brandName, i.productName)} (${i.model}) @ ₹${i.unitPrice}`).join('\n')],
      ['Total', `₹${orderDoc.total}`],
      ['Fulfilment', orderDoc.fulfilment === 'STORE_PICKUP' ? 'Store pickup' : 'Delivery + installation'],
      ['Address', input.fulfilment === 'DELIVERY_INSTALL' ? Object.values(input.address ?? {}).filter(Boolean).join(', ') : '—'],
      ['Payment', orderDoc.paymentMethod === 'COD' ? 'Cash on delivery' : 'Pay at store'],
      ['Notes', orderDoc.notes],
    ]).catch((e) => console.error('[mail] order email failed:', (e as Error).message));

    return orderDoc;
  } catch (e) {
    for (const r of reserved) await adjustStock(r.id, r.q, 'ORDER_ROLLBACK', orderId);
    await OrderItem.deleteMany({ orderId });
    await PurchaseHistory.deleteMany({ orderId });
    await Order.deleteOne({ orderId });
    throw e;
  }
}

/** Cancelling puts the stock back and voids the warranty records. */
export async function cancelOrder(orderId: string, note: string) {
  const order = await Order.findOne({ orderId });
  if (!order) throw new HttpError(404, 'Order not found');
  if (order.status === 'CANCELLED') return order;
  const items = await OrderItem.find({ orderId }).lean();
  for (const i of items) {
    // Put back what this order actually took from stock (a shop sale may have taken less, or none).
    const inv = await Inventory.findOne({ product: i.product }).lean();
    const moves = (inv?.movements ?? []).filter((m: any) => m.ref === orderId && m.delta < 0);
    const taken = moves.length ? -moves.reduce((sum: number, m: any) => sum + m.delta, 0) : order.channel === 'STORE' ? 0 : i.quantity;
    if (taken > 0) await adjustStock(i.product as Types.ObjectId, taken, 'ORDER_CANCELLED', orderId);
  }
  await PurchaseHistory.updateMany({ orderId }, { status: 'VOID' });
  order.status = 'CANCELLED';
  order.statusHistory.push({ status: 'CANCELLED', note, at: new Date() });
  await order.save();
  return order;
}

export async function orderWithItems(orderId: string, customerId?: string) {
  const filter: Record<string, unknown> = { orderId };
  if (customerId) filter.customer = customerId;
  const order = await Order.findOne(filter).populate('items').lean();
  if (!order) throw new HttpError(404, 'Order not found');
  const purchases = await PurchaseHistory.find({ orderId }).lean();
  return { ...order, purchases };
}

export { adjustStock };


/* ------------------------------------------------------------------ */
/* Sales made in the shop, recorded by the owner in the admin console. */

export interface StoreSaleInput {
  customer: { mobile: string; name: string; email?: string };
  items: { productId: string; quantity: number; unitPrice: number }[];
  saleDate?: Date;
  paymentMethod: 'CASH' | 'UPI' | 'CARD';
  paid: boolean;
  vehicleText?: string;
  registrationNumber?: string;
  notes?: string;
  reduceStock: boolean;
  recordedBy: string;
}

export async function recordStoreSale(input: StoreSaleInput) {
  const mobile = normalizeMobile(input.customer.mobile);
  if (!mobile) throw new HttpError(400, 'Enter a valid 10-digit mobile number');
  if (!input.items.length) throw new HttpError(400, 'Add at least one product');

  const now = new Date();
  const saleDate = input.saleDate ?? now;
  if (saleDate.getTime() > now.getTime() + 60_000) throw new HttpError(400, 'The sale date cannot be in the future');

  // Find the customer by mobile, or create them. They can later log in with this number and see their batteries.
  let customer = await Customer.findOne({ mobile });
  const name = input.customer.name.trim();
  const email = (input.customer.email ?? '').trim().toLowerCase();
  let newCustomer = false;
  if (!customer) {
    if (!name) throw new HttpError(400, 'Enter the customer name');
    customer = await Customer.create({ mobile, name, email });
    newCustomer = true;
  } else {
    const set: Record<string, string> = {};
    if (!customer.name && name) set.name = name;
    if (!customer.email && email) set.email = email;
    if (Object.keys(set).length) await Customer.updateOne({ _id: customer._id }, { $set: set });
  }

  const lines = new Map<string, { quantity: number; unitPrice: number }>();
  for (const i of input.items) {
    const prev = lines.get(i.productId);
    lines.set(i.productId, { quantity: (prev?.quantity ?? 0) + i.quantity, unitPrice: i.unitPrice });
  }
  const products = await Product.find({ _id: { $in: [...lines.keys()] } }).populate('brand', 'name').lean();
  if (products.length !== lines.size) throw new HttpError(400, 'One of the products was not found. Refresh and try again.');

  const orderId = newOrderId();
  const warnings: string[] = [];

  // Stock: the battery has already left the shop, so never block the sale. If the count on
  // the site is lower than what was sold, bring it to zero and tell the owner.
  if (input.reduceStock) {
    for (const p of products) {
      const q = lines.get(String(p._id))!.quantity;
      const ok = await adjustStock(p._id, -q, 'STORE_SALE', orderId);
      if (!ok) {
        const inv = await Inventory.findOne({ product: p._id }).lean();
        const have = inv?.quantity ?? 0;
        if (have > 0) await adjustStock(p._id, -have, 'STORE_SALE', orderId);
        warnings.push(`${p.name}: stock on the site was ${have}, sold ${q}. Stock is now 0; please correct it in Products.`);
      }
    }
  }

  const customerName = name || customer.name;
  const orderDoc = new Order({
    orderId,
    channel: 'STORE',
    customer: customer._id,
    customerName,
    customerMobile: mobile,
    customerEmail: email || customer.email || '',
    vehicle: { vehicleId: null, label: (input.vehicleText ?? '').trim(), registrationNumber: (input.registrationNumber ?? '').toUpperCase().trim() },
    fulfilment: 'IN_STORE',
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paid ? 'PAID' : 'PENDING',
    itemCount: 0,
    subtotal: 0,
    total: 0,
    status: 'DELIVERED',
    statusHistory: [{ status: 'DELIVERED', note: `Sold in the shop, recorded by ${input.recordedBy}`, at: saleDate }],
    notes: input.notes ?? '',
    createdAt: saleDate,
    updatedAt: now,
  });

  const items = products.map((p) => {
    const { quantity, unitPrice } = lines.get(String(p._id))!;
    return new OrderItem({
      order: orderDoc._id,
      orderId,
      product: p._id,
      brandName: (p.brand as any)?.name ?? '',
      productName: p.name,
      model: p.model,
      sku: p.sku,
      voltage: p.voltage,
      capacityAh: p.capacityAh,
      imageUrl: p.images?.[0]?.url ?? '',
      warranty: p.warranty,
      mrp: p.mrp,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
    });
  });
  orderDoc.items = items.map((i) => i._id);
  orderDoc.itemCount = items.reduce((s, i) => s + i.quantity, 0);
  orderDoc.subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  orderDoc.total = orderDoc.subtotal;

  await OrderItem.insertMany(items);
  // keep the sale date as the order date (Mongoose would otherwise stamp "now")
  await orderDoc.save({ timestamps: false });

  await PurchaseHistory.insertMany(
    items.map((i) => {
      const w = i.warranty!;
      return {
        customer: customer!._id,
        order: orderDoc._id,
        orderItem: i._id,
        orderId,
        product: i.product,
        brandName: i.brandName,
        productName: i.productName,
        model: i.model,
        sku: i.sku,
        capacityAh: i.capacityAh,
        imageUrl: i.imageUrl,
        vehicleLabel: orderDoc.vehicle?.label ?? '',
        registrationNumber: orderDoc.vehicle?.registrationNumber ?? '',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        amount: i.lineTotal,
        purchaseDate: saleDate,
        warrantyMonths: w.totalMonths,
        freeReplacementMonths: w.freeMonths ?? null,
        proRataMonths: w.proRataMonths ?? null,
        freeReplacementUntil: w.freeMonths != null ? addMonths(saleDate, w.freeMonths) : null,
        warrantyExpiry: addMonths(saleDate, w.totalMonths),
      };
    }),
  );

  return { orderId, customerId: String(customer._id), newCustomer, warnings };
}
