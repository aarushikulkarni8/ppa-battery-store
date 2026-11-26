import { Schema, model } from 'mongoose';
import { ORDER_STATUSES } from '../config/constants.js';

const orderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    customerName: { type: String, required: true },
    customerMobile: { type: String, required: true, index: true },
    customerEmail: { type: String, default: '' },
    items: [{ type: Schema.Types.ObjectId, ref: 'OrderItem' }],
    vehicle: {
      vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
      label: { type: String, default: '' },
      registrationNumber: { type: String, default: '' },
    },
    // ONLINE = placed on the website; STORE = sold at the counter and recorded by the owner
    channel: { type: String, enum: ['ONLINE', 'STORE'], default: 'ONLINE', index: true },
    fulfilment: { type: String, enum: ['DELIVERY_INSTALL', 'STORE_PICKUP', 'IN_STORE'], required: true },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
    },
    paymentMethod: { type: String, enum: ['COD', 'PAY_AT_STORE', 'CASH', 'UPI', 'CARD'], required: true },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING' },
    itemCount: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'PLACED', index: true },
    statusHistory: {
      type: [new Schema({ status: String, note: String, at: { type: Date, default: Date.now } }, { _id: false })],
      default: [],
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Order = model('Order', orderSchema);
