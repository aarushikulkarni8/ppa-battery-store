import { Schema, model } from 'mongoose';
import { ENQUIRY_STATUSES, ENQUIRY_TYPES } from '../config/constants.js';

const enquirySchema = new Schema(
  {
    enquiryNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, index: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    orderId: { type: String, default: '', trim: true, uppercase: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    productLabel: { type: String, default: '' },
    enquiryType: { type: String, enum: ENQUIRY_TYPES, required: true },
    message: { type: String, required: true, maxlength: 3000 },
    status: { type: String, enum: ENQUIRY_STATUSES, default: 'New', index: true },
    notes: {
      type: [
        new Schema(
          { text: String, by: String, status: String, at: { type: Date, default: Date.now } },
          { _id: false },
        ),
      ],
      default: [],
    },
    emailStatus: { type: String, enum: ['SENT', 'FAILED', 'NOT_CONFIGURED'], default: 'NOT_CONFIGURED' },
    emailError: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Enquiry = model('Enquiry', enquirySchema);
