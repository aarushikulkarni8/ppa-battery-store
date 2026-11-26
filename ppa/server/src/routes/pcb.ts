import { Router } from 'express';
import { z } from 'zod';
import { Customer, PcbOrder, Product } from '../models/index.js';
import { requireCustomer } from '../middleware/auth.js';
import { sendOwnerMail } from '../services/mailer.js';
import { newPcbOrderNumber } from '../services/ids.js';
import { ah, HttpError } from '../utils/http.js';

const router = Router();

/** Place a PCB order: one board, a quantity, optional company name and notes. No prices involved. */
router.post(
  '/pcb-orders',
  requireCustomer,
  ah(async (req, res) => {
    const body = z
      .object({
        productId: z.string().regex(/^[a-f0-9]{24}$/i, 'Choose a product'),
        quantity: z.coerce.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1').max(1_000_000, 'Quantity is too large'),
        company: z.string().trim().max(120).optional().default(''),
        notes: z.string().trim().max(2000).optional().default(''),
      })
      .parse(req.body);

    const product = await Product.findOne({ _id: body.productId, productType: 'PCB', isActive: true }).populate('brand', 'name').lean();
    if (!product) throw new HttpError(404, 'This PCB is not available for ordering');
    const customer = await Customer.findById(req.customerId).lean();
    if (!customer) throw new HttpError(401, 'Please log in again');
    if (!customer.name) throw new HttpError(400, 'Please add your name in My account before ordering');

    const order = await PcbOrder.create({
      orderNumber: newPcbOrderNumber(),
      customer: customer._id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      customerEmail: customer.email ?? '',
      company: body.company,
      product: product._id,
      productName: product.name,
      partNumber: product.sku,
      model: product.model,
      brandName: (product.brand as any)?.name ?? '',
      quantity: body.quantity,
      notes: body.notes,
      statusHistory: [{ status: 'New', note: 'Placed on the website', by: 'customer' }],
    });

    try {
      const r = await sendOwnerMail(`New PCB order ${order.orderNumber}: ${body.quantity} × ${product.name}`, 'NEW PCB ORDER', [
        ['Order number', order.orderNumber],
        ['Product', product.name],
        ['Part number', product.sku],
        ['Model', product.model],
        ['Quantity', body.quantity],
        ['Customer', customer.name],
        ['Company', body.company],
        ['Mobile', `+91 ${customer.mobile}`],
        ['Email', customer.email],
        ['Notes', body.notes],
        ['Placed at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
      ]);
      await PcbOrder.updateOne({ _id: order._id }, { $set: { emailStatus: r.status } });
    } catch (e) {
      console.error('[pcb] owner email failed:', (e as Error).message);
      await PcbOrder.updateOne({ _id: order._id }, { $set: { emailStatus: 'FAILED' } });
    }

    res.status(201).json({ orderNumber: order.orderNumber, message: 'Your PCB order has been placed. We will contact you to confirm.' });
  }),
);

router.get(
  '/pcb-orders',
  requireCustomer,
  ah(async (req, res) => {
    const orders = await PcbOrder.find({ customer: req.customerId }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ orders });
  }),
);

export default router;
