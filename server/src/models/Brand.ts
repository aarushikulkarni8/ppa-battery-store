import { Schema, model, type InferSchemaType } from 'mongoose';

const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    description: { type: String, default: '' },
    manufacturer: { type: String, default: '' },
    website: { type: String, default: '' },
    accentColor: { type: String, default: '#15223B' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true },
);

export type BrandDoc = InferSchemaType<typeof brandSchema>;
export const Brand = model('Brand', brandSchema);
