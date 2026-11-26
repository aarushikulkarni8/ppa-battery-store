import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDb } from '../config/db.js';
import { Admin, Brand, Inventory, Product, Vehicle, VehicleCompatibility } from '../models/index.js';
import { slugify } from '../utils/http.js';
import { brands, products } from './data.js';

/**
 * Idempotent: running it again updates seed records by slug/SKU and never deletes
 * customers, orders or anything the owner added. It will NOT overwrite prices,
 * stock or images you have changed in /admin.
 */
async function run() {
  await connectDb();

  const brandIds = new Map<string, mongoose.Types.ObjectId>();
  for (const b of brands) {
    const doc = await Brand.findOneAndUpdate({ slug: b.slug }, { $setOnInsert: b }, { upsert: true, new: true });
    brandIds.set(b.slug, doc._id);
  }
  console.log(`[seed] brands: ${brands.map((b) => b.name).join(', ')}`);

  const productIds = new Map<string, mongoose.Types.ObjectId>();
  for (const p of products) {
    const { brand, mrp, sellingPrice, ...rest } = p;
    const existing = await Product.findOne({ sku: p.sku });
    if (existing) {
      productIds.set(p.model, existing._id);
      continue;
    }
    const doc = await Product.create({
      ...rest,
      brand: brandIds.get(brand),
      mrp,
      sellingPrice,
      slug: slugify(`${p.name} ${p.model}`),
      isActive: true,
    });
    const qty = sellingPrice != null ? env.SEED_DEFAULT_STOCK : 0;
    await Inventory.create({
      product: doc._id,
      quantity: qty,
      movements: qty ? [{ delta: qty, reason: 'OPENING_STOCK', ref: 'seed', at: new Date() }] : [],
    });
    productIds.set(p.model, doc._id);
  }
  console.log(`[seed] products: ${products.length}`);

  // Vehicle makes/models are no longer used by the store (search is by battery type and capacity).

  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const exists = await Admin.exists({ email: env.ADMIN_EMAIL.toLowerCase() });
    if (!exists) {
      await Admin.create({
        name: env.ADMIN_NAME,
        email: env.ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
        role: 'OWNER',
      });
      console.log(`[seed] admin created: ${env.ADMIN_EMAIL}`);
    } else console.log(`[seed] admin already exists: ${env.ADMIN_EMAIL}`);
  } else console.warn('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — no admin account created.');

  await Promise.all([Brand.syncIndexes(), Product.syncIndexes(), Vehicle.syncIndexes(), VehicleCompatibility.syncIndexes()]);
  await mongoose.disconnect();
  console.log('[seed] done');
}

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
