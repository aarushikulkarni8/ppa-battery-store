import { Schema, model, type InferSchemaType } from 'mongoose';
import { VEHICLE_CATEGORIES } from '../config/constants.js';

const warrantySchema = new Schema(
  {
    totalMonths: { type: Number, required: [true, 'Warranty (total months) is required'], min: 0 },
    freeMonths: { type: Number, default: null, min: 0 },
    proRataMonths: { type: Number, default: null, min: 0 },
    notes: { type: String, default: '' },
  },
  { _id: false },
);

export const PRODUCT_TYPES = ['BATTERY', 'INVERTER', 'PCB'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/** Specs that only apply to inverter / home UPS units. */
const inverterSpecsSchema = new Schema(
  {
    vaRating: { type: Number, default: null, min: 0 },
    maxLoadW: { type: Number, default: null, min: 0 },
    batteriesSupported: { type: Number, default: null, min: 0 },
    waveform: { type: String, default: '' },
    chargingCurrentA: { type: Number, default: null, min: 0 },
    recommendedBattery: { type: String, default: '' },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    productType: { type: String, enum: PRODUCT_TYPES, default: 'BATTERY', index: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    series: { type: String, default: '' },
    model: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    batteryType: { type: String, default: '' },
    vehicleCategory: { type: String, enum: VEHICLE_CATEGORIES, required: true, index: true },
    voltage: { type: Number, required: true, default: 12 },
    // batteries only; 0 for inverters
    capacityAh: { type: Number, required: true, default: 0, index: true },
    cca: { type: Number, default: null },
    dimensions: {
      lengthMm: { type: Number, default: null },
      widthMm: { type: Number, default: null },
      heightMm: { type: Number, default: null },
    },
    weightKg: { type: Number, default: null },
    terminalLayout: { type: String, default: '' },
    inverterSpecs: { type: inverterSpecsSchema, default: () => ({}) },
    // free-form specifications, used for PCBs (e.g. Board size: 100 × 80 mm)
    specs: { type: [new Schema({ label: { type: String, trim: true }, value: { type: String, trim: true } }, { _id: false })], default: [] },
    warranty: { type: warrantySchema, required: true },
    description: { type: String, default: '' },
    features: { type: [String], default: [] },
    mrp: { type: Number, default: null, min: 0 },
    sellingPrice: { type: Number, default: null, min: 0 },
    images: {
      type: [
        new Schema(
          { url: { type: String, required: true }, publicId: { type: String, default: '' }, alt: { type: String, default: '' } },
          { _id: true },
        ),
      ],
      default: [],
    },
    isActive: { type: Boolean, default: true, index: true },
    sourceUrl: { type: String, default: '' },
    sourceNote: { type: String, default: '' },
  },
  { timestamps: true },
);

export type ProductDoc = InferSchemaType<typeof productSchema>;
export const Product = model('Product', productSchema);
