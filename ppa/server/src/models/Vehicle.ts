import { Schema, model } from 'mongoose';
import { VEHICLE_CATEGORIES } from '../config/constants.js';

const vehicleSchema = new Schema(
  {
    category: { type: String, enum: VEHICLE_CATEGORIES, required: true, index: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    variant: { type: String, default: '', trim: true },
    fuel: { type: String, default: '' },
    yearFrom: { type: Number, default: null },
    yearTo: { type: Number, default: null },
    aliases: { type: [String], default: [] },
    searchText: { type: String, default: '', index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
vehicleSchema.index({ category: 1, make: 1, model: 1, variant: 1 }, { unique: true });

export function vehicleSearchText(v: { make: string; model: string; variant?: string; fuel?: string; aliases?: string[] }) {
  return [v.make, v.model, v.variant, v.fuel, ...(v.aliases ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function vehicleLabel(v: { make: string; model: string; variant?: string | null }) {
  return [v.make, v.model, v.variant].filter(Boolean).join(' ');
}

export const Vehicle = model('Vehicle', vehicleSchema);
