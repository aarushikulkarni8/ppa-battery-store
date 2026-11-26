import { Schema, model } from 'mongoose';

const inventorySchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 3, min: 0 },
    movements: {
      type: [
        new Schema(
          {
            delta: Number,
            reason: String,
            ref: String,
            at: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const Inventory = model('Inventory', inventorySchema);
