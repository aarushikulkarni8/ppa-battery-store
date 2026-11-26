import { Schema, model } from 'mongoose';

const otpSchema = new Schema(
  {
    mobile: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true },
);
// Mongo removes documents one day after they were created.
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export const Otp = model('Otp', otpSchema);
