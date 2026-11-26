import { Schema, model } from 'mongoose';

const orderItemSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderId: { type: String, required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    brandName: { type: String, required: true },
    productName: { type: String, required: true },
    model: { type: String, required: true },
    sku: { type: String, required: true },
    voltage: Number,
    capacityAh: Number,
    imageUrl: { type: String, default: '' },
    warranty: {
      totalMonths: { type: Number, required: true },
      freeMonths: { type: Number, default: null },
      proRataMonths: { type: Number, default: null },
      notes: { type: String, default: '' },
    },
    mrp: { type: Number, default: null },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
  },
  { timestamps: true },
);

export const OrderItem = model('OrderItem', orderItemSchema);
