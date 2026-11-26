import { Schema, model } from 'mongoose';

export const PCB_ORDER_STATUSES = ['New', 'Confirmed', 'In progress', 'Ready', 'Delivered', 'Cancelled'] as const;

/** A PCB order placed on the website: product + quantity, no price (the shop quotes separately). */
const pcbOrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    customerName: { type: String, required: true },
    customerMobile: { type: String, required: true, index: true },
    customerEmail: { type: String, default: '' },
    company: { type: String, default: '' },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    partNumber: { type: String, default: '' },
    model: { type: String, default: '' },
    brandName: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String, default: '' },
    status: { type: String, enum: PCB_ORDER_STATUSES, default: 'New', index: true },
    statusHistory: [{ status: String, note: String, by: String, at: { type: Date, default: Date.now } }],
    emailStatus: { type: String, enum: ['SENT', 'FAILED', 'NOT_CONFIGURED'], default: 'NOT_CONFIGURED' },
  },
  { timestamps: true },
);

export const PcbOrder = model('PcbOrder', pcbOrderSchema);
