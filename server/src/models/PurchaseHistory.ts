import { Schema, model } from 'mongoose';

const purchaseSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderItem: { type: Schema.Types.ObjectId, ref: 'OrderItem', required: true },
    orderId: { type: String, required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    brandName: String,
    productName: String,
    model: String,
    sku: String,
    capacityAh: Number,
    imageUrl: String,
    vehicleLabel: { type: String, default: '' },
    registrationNumber: { type: String, default: '' },
    quantity: Number,
    unitPrice: Number,
    amount: Number,
    purchaseDate: { type: Date, required: true },
    warrantyMonths: { type: Number, required: true },
    freeReplacementMonths: { type: Number, default: null },
    proRataMonths: { type: Number, default: null },
    freeReplacementUntil: { type: Date, default: null },
    warrantyExpiry: { type: Date, required: true },
    status: { type: String, enum: ['ACTIVE', 'VOID'], default: 'ACTIVE' },
    // half-yearly service reminder emails
    remindersSent: { type: Number, default: 0 },
    lastReminderAt: { type: Date, default: null },
    lastReminderError: { type: String, default: '' },
  },
  { timestamps: true },
);

export const PurchaseHistory = model('PurchaseHistory', purchaseSchema);
