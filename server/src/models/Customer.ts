import { Schema, model } from 'mongoose';

const customerSchema = new Schema(
  {
    mobile: { type: String, required: true, unique: true, match: /^[6-9]\d{9}$/ },
    name: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    // password login (never returned by default queries)
    passwordHash: { type: String, default: null, select: false },
    passwordSetAt: { type: Date, default: null },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpires: { type: Date, default: null },
    // battery servicing reminder emails (customer can switch off in their profile)
    reminderEmails: { type: Boolean, default: true },
    address: {
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    savedVehicles: {
      type: [
        new Schema({
          vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
          nickname: { type: String, default: '' },
          registrationNumber: { type: String, default: '', uppercase: true, trim: true },
          addedAt: { type: Date, default: Date.now },
        }),
      ],
      default: [],
    },
    cart: {
      type: [
        new Schema(
          {
            product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true, min: 1, max: 20 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);
customerSchema.index({ name: 1 });
customerSchema.index({ email: 1 });

export const Customer = model('Customer', customerSchema);
