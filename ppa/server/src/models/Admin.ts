import { Schema, model } from 'mongoose';

const adminSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['OWNER', 'STAFF'], default: 'OWNER' },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Admin = model('Admin', adminSchema);
