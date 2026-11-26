import { Schema, model } from 'mongoose';

const compatSchema = new Schema(
  {
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    note: { type: String, default: '' },
    source: { type: String, default: 'ADMIN' },
  },
  { timestamps: true },
);
compatSchema.index({ vehicle: 1, product: 1 }, { unique: true });

export const VehicleCompatibility = model('VehicleCompatibility', compatSchema);
