import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { VEHICLE_CATEGORIES } from '../../config/constants.js';
import { Brand, Inventory, OrderItem, Product, Vehicle, VehicleCompatibility, vehicleLabel, vehicleSearchText } from '../../models/index.js';
import { requireAdmin } from '../../middleware/auth.js';
import { withStock } from '../../services/catalog.js';
import { deleteImage, imageUpload, uploadImage, cloudinaryConfigured, uploadsEnabled, localUploads } from '../../services/images.js';
import { adjustStock } from '../../services/orders.js';
import { ah, escapeRegex, HttpError, slugify } from '../../utils/http.js';

const router = Router();
router.use(requireAdmin);

router.get('/config', (_req, res) => res.json({ cloudinary: cloudinaryConfigured, uploads: uploadsEnabled, localUploads }));

const numOrNull = z.preprocess((v) => (v === '' || v === undefined ? null : v), z.coerce.number().min(0).nullable());

const productSchema = z.object({
  productType: z.enum(['BATTERY', 'INVERTER', 'PCB']).optional().default('BATTERY'),
  specs: z
    .array(z.object({ label: z.string().trim().max(60), value: z.string().trim().max(200) }))
    .max(40)
    .optional()
    .default([])
    .transform((rows) => rows.filter((r) => r.label && r.value)),
  brand: z.string().refine((v) => Types.ObjectId.isValid(v), 'Choose a brand'),
  name: z.string().trim().min(2).max(160),
  series: z.string().trim().max(60).optional().default(''),
  model: z.string().trim().min(1).max(60),
  sku: z.string().trim().min(1).max(60),
  batteryType: z.string().trim().max(80).optional().default(''),
  vehicleCategory: z.enum(VEHICLE_CATEGORIES),
  voltage: z.coerce.number().min(0).max(1000).optional().default(0), // 0 for PCBs
  capacityAh: z.coerce.number().min(0).optional().default(0),
  cca: numOrNull.optional(),
  dimensions: z.object({ lengthMm: numOrNull, widthMm: numOrNull, heightMm: numOrNull }).partial().optional(),
  weightKg: numOrNull.optional(),
  terminalLayout: z.string().trim().max(60).optional().default(''),
  inverterSpecs: z
    .object({
      vaRating: numOrNull.optional(),
      maxLoadW: numOrNull.optional(),
      batteriesSupported: numOrNull.optional(),
      waveform: z.string().trim().max(60).optional().default(''),
      chargingCurrentA: numOrNull.optional(),
      recommendedBattery: z.string().trim().max(120).optional().default(''),
    })
    .optional()
    .default({}),
  warranty: z.object({
    totalMonths: z.coerce.number().int().min(0),
    freeMonths: numOrNull.optional(),
    proRataMonths: numOrNull.optional(),
    notes: z.string().max(500).optional().default(''),
  }),
  description: z.string().max(5000).optional().default(''),
  features: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
  mrp: numOrNull.optional(),
  sellingPrice: numOrNull.optional(),
  isActive: z.boolean().optional(),
  sourceUrl: z.string().max(500).optional().default(''),
  sourceNote: z.string().max(500).optional().default(''),
  stock: z.coerce.number().int().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
}).superRefine((d, ctx) => {
  if (d.productType !== 'PCB' && !(d.voltage > 0))
    ctx.addIssue({ code: 'custom', path: ['voltage'], message: 'Enter the voltage' });
  if (d.productType === 'INVERTER' && !(Number(d.inverterSpecs?.vaRating) > 0))
    ctx.addIssue({ code: 'custom', path: ['inverterSpecs', 'vaRating'], message: 'Enter the inverter VA rating' });
});

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || 'battery';
  let n = 1;
  while (await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${slugify(base)}-${++n}`;
  return slug;
}

async function productOut(id: string | Types.ObjectId) {
  const p = await Product.findById(id).populate('brand', 'name slug isActive').lean();
  if (!p) throw new HttpError(404, 'Product not found');
  const [withInv] = await withStock([p as any]);
  return withInv;
}

/* ---------- Products ---------- */
router.get(
  '/products',
  ah(async (req, res) => {
    const q = z
      .object({
        q: z.string().max(80).optional(),
        brand: z.string().optional(),
        category: z.string().optional(),
        status: z.enum(['active', 'inactive']).optional(),
        lowStock: z.string().optional(),
      })
      .parse(req.query);
    const filter: Record<string, unknown> = {};
    if (q.brand && Types.ObjectId.isValid(q.brand)) filter.brand = q.brand;
    if (q.category) filter.vehicleCategory = q.category;
    if (q.status) filter.isActive = q.status === 'active';
    if (q.q?.trim()) {
      const re = new RegExp(escapeRegex(q.q.trim()), 'i');
      filter.$or = [{ name: re }, { model: re }, { sku: re }, { series: re }];
    }
    let products = await withStock((await Product.find(filter).populate('brand', 'name slug').sort({ updatedAt: -1 }).limit(500).lean()) as any[]);
    if (q.lowStock) products = products.filter((p) => p.sellingPrice != null && p.stock <= p.lowStockThreshold);
    const compatCounts = await VehicleCompatibility.aggregate([
      { $match: { product: { $in: products.map((p) => p._id) } } },
      { $group: { _id: '$product', n: { $sum: 1 } } },
    ]);
    const cmap = new Map(compatCounts.map((c) => [String(c._id), c.n]));
    res.json({ products: products.map((p) => ({ ...p, compatibleVehicleCount: cmap.get(String(p._id)) ?? 0 })) });
  }),
);

router.get('/products/:id', ah(async (req, res) => res.json({ product: await productOut(req.params.id) })));

router.post(
  '/products',
  ah(async (req, res) => {
    const { stock, lowStockThreshold, ...data } = productSchema.parse(req.body);
    if (!(await Brand.exists({ _id: data.brand }))) throw new HttpError(400, 'Brand not found');
    const product = await Product.create({ ...data, slug: await uniqueSlug(`${data.name} ${data.model}`) });
    await Inventory.create({
      product: product._id,
      quantity: stock ?? 0,
      lowStockThreshold: lowStockThreshold ?? 3,
      movements: stock ? [{ delta: stock, reason: 'OPENING_STOCK', ref: '', at: new Date() }] : [],
    });
    res.status(201).json({ product: await productOut(product._id) });
  }),
);

router.put(
  '/products/:id',
  ah(async (req, res) => {
    const { stock, lowStockThreshold, ...data } = productSchema.parse(req.body);
    const product = await Product.findById(req.params.id);
    if (!product) throw new HttpError(404, 'Product not found');
    const renamed = product.name !== data.name || product.model !== data.model;
    product.set(data);
    if (renamed) product.slug = await uniqueSlug(`${data.name} ${data.model}`, String(product._id));
    await product.save();
    const inv = await Inventory.findOneAndUpdate({ product: product._id }, { $setOnInsert: { quantity: 0 } }, { upsert: true, new: true });
    if (lowStockThreshold != null) inv.lowStockThreshold = lowStockThreshold;
    await inv.save();
    if (stock != null && stock !== inv.quantity) await adjustStock(product._id, stock - inv.quantity, 'MANUAL_SET', '');
    res.json({ product: await productOut(product._id) });
  }),
);

router.patch(
  '/products/:id/active',
  ah(async (req, res) => {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    await Product.updateOne({ _id: req.params.id }, { isActive });
    res.json({ product: await productOut(req.params.id) });
  }),
);

router.patch(
  '/products/:id/price',
  ah(async (req, res) => {
    const { mrp, sellingPrice } = z.object({ mrp: numOrNull, sellingPrice: numOrNull }).parse(req.body);
    if (mrp != null && sellingPrice != null && sellingPrice > mrp) throw new HttpError(400, 'Selling price cannot be above MRP');
    await Product.updateOne({ _id: req.params.id }, { mrp, sellingPrice });
    res.json({ product: await productOut(req.params.id) });
  }),
);

router.patch(
  '/products/:id/stock',
  ah(async (req, res) => {
    const body = z
      .object({ quantity: z.coerce.number().int().min(0).optional(), delta: z.coerce.number().int().optional(), reason: z.string().max(60).optional() })
      .parse(req.body);
    const id = new Types.ObjectId(req.params.id);
    const inv = await Inventory.findOneAndUpdate({ product: id }, { $setOnInsert: { quantity: 0 } }, { upsert: true, new: true });
    const delta = body.quantity != null ? body.quantity - inv.quantity : body.delta ?? 0;
    if (inv.quantity + delta < 0) throw new HttpError(400, 'Stock cannot go below zero');
    if (delta) await adjustStock(id, delta, body.reason || (delta > 0 ? 'STOCK_IN' : 'STOCK_OUT'), '');
    res.json({ product: await productOut(id) });
  }),
);

router.delete(
  '/products/:id',
  ah(async (req, res) => {
    if (await OrderItem.exists({ product: req.params.id }))
      throw new HttpError(409, 'This battery appears in past orders, so it cannot be deleted. Deactivate it instead.');
    const p = await Product.findByIdAndDelete(req.params.id);
    if (!p) throw new HttpError(404, 'Product not found');
    await Promise.all([Inventory.deleteOne({ product: p._id }), VehicleCompatibility.deleteMany({ product: p._id })]);
    for (const img of p.images) await deleteImageIfUnused(img.publicId, p._id);
    res.json({ ok: true });
  }),
);

/** A photo can be shared by several products (bulk upload). Only remove the stored file when nothing uses it any more. */
async function deleteImageIfUnused(publicId: string | undefined | null, exceptProductId: unknown) {
  if (!publicId) return;
  const stillUsed = await Product.exists({ _id: { $ne: exceptProductId }, 'images.publicId': publicId });
  if (!stillUsed) await deleteImage(publicId);
}

router.post(
  '/products/:id/images',
  imageUpload.single('image'),
  ah(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new HttpError(404, 'Product not found');
    let entry: { url: string; publicId: string; alt: string };
    if (req.file) {
      const up = await uploadImage(req.file.buffer, 'products', req.file.mimetype);
      entry = { ...up, alt: `${product.name} ${product.model}` };
    } else {
      const { url } = z.object({ url: z.string().url('Enter a valid image URL') }).parse(req.body);
      entry = { url, publicId: '', alt: `${product.name} ${product.model}` };
    }
    product.images.push(entry);
    await product.save();
    res.status(201).json({ product: await productOut(product._id) });
  }),
);

router.patch(
  '/products/:id/images/:imageId/primary',
  ah(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new HttpError(404, 'Product not found');
    const idx = product.images.findIndex((i) => String(i._id) === req.params.imageId);
    if (idx > 0) {
      const [img] = product.images.splice(idx, 1);
      product.images.unshift(img);
      await product.save();
    }
    res.json({ product: await productOut(product._id) });
  }),
);

router.delete(
  '/products/:id/images/:imageId',
  ah(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new HttpError(404, 'Product not found');
    const img = product.images.find((i) => String(i._id) === req.params.imageId);
    if (img) {
      await deleteImageIfUnused(img.publicId, product._id);
      await Product.updateOne(
        { _id: product._id },
        { $set: { images: product.images.filter((i) => String(i._id) !== req.params.imageId).map((i) => i.toObject()) } },
      );
    }
    res.json({ product: await productOut(product._id) });
  }),
);

/**
 * One photo for many products (bulk photos page): uploaded once, attached to each chosen product.
 * Fields: image (file), productIds (JSON array), primary ('true' = show first), skipIfHasPhoto ('true').
 */
router.post(
  '/products/bulk-image',
  imageUpload.single('image'),
  ah(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose a photo');
    const body = z
      .object({
        productIds: z.string().transform((v, ctx) => {
          try {
            const ids = JSON.parse(v);
            if (Array.isArray(ids) && ids.length && ids.length <= 300 && ids.every((x) => typeof x === 'string' && /^[a-f0-9]{24}$/i.test(x))) return ids as string[];
          } catch {
            /* fall through */
          }
          ctx.addIssue({ code: 'custom', message: 'Choose at least one product for this photo' });
          return z.NEVER;
        }),
        primary: z.string().optional().default('true'),
        skipIfHasPhoto: z.string().optional().default('false'),
      })
      .parse(req.body);
    const products = await Product.find({ _id: { $in: body.productIds } });
    if (!products.length) throw new HttpError(404, 'None of the chosen products were found');
    const targets = body.skipIfHasPhoto === 'true' ? products.filter((p) => !p.images.length) : products;
    if (!targets.length) return void res.json({ updated: 0, skipped: products.length });

    const up = await uploadImage(req.file.buffer, 'products', req.file.mimetype);
    for (const p of targets) {
      const entry = { url: up.url, publicId: up.publicId, alt: `${p.name}` };
      const current = p.images.map((i) => i.toObject());
      await Product.updateOne({ _id: p._id }, { $set: { images: body.primary === 'true' ? [entry, ...current] : [...current, entry] } });
    }
    res.status(201).json({ updated: targets.length, skipped: products.length - targets.length, url: up.url });
  }),
);

/* ---------- Compatibility ---------- */
router.get(
  '/products/:id/compatibility',
  ah(async (req, res) => {
    const rows = await VehicleCompatibility.find({ product: req.params.id }).populate('vehicle').lean();
    res.json({
      compatibility: rows
        .filter((r) => r.vehicle)
        .map((r) => ({ _id: r._id, note: r.note, source: r.source, vehicle: { ...(r.vehicle as any), label: vehicleLabel(r.vehicle as any) } }))
        .sort((a, b) => a.vehicle.label.localeCompare(b.vehicle.label)),
    });
  }),
);

router.post(
  '/products/:id/compatibility',
  ah(async (req, res) => {
    const { vehicleIds, note = '' } = z.object({ vehicleIds: z.array(z.string()).min(1).max(200), note: z.string().max(200).optional() }).parse(req.body);
    if (!(await Product.exists({ _id: req.params.id }))) throw new HttpError(404, 'Product not found');
    const ops = vehicleIds
      .filter((v) => Types.ObjectId.isValid(v))
      .map((v) => ({
        updateOne: {
          filter: { product: new Types.ObjectId(req.params.id), vehicle: new Types.ObjectId(v) },
          update: { $setOnInsert: { note, source: 'ADMIN' } },
          upsert: true,
        },
      }));
    await VehicleCompatibility.bulkWrite(ops);
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/compatibility/:id',
  ah(async (req, res) => {
    await VehicleCompatibility.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  }),
);

/* ---------- Brands ---------- */
const brandSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().max(3000).optional().default(''),
  manufacturer: z.string().max(120).optional().default(''),
  website: z.string().max(200).optional().default(''),
  logoUrl: z.string().max(500).optional().default(''),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #0A7F3F').optional().default('#15223B'),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().optional().default(100),
});

router.get(
  '/brands',
  ah(async (_req, res) => {
    const brands = await Brand.find().sort({ sortOrder: 1, name: 1 }).lean();
    const counts = await Product.aggregate([{ $group: { _id: '$brand', n: { $sum: 1 } } }]);
    const m = new Map(counts.map((c) => [String(c._id), c.n]));
    res.json({ brands: brands.map((b) => ({ ...b, productCount: m.get(String(b._id)) ?? 0 })) });
  }),
);

router.post(
  '/brands',
  ah(async (req, res) => {
    const data = brandSchema.parse(req.body);
    const brand = await Brand.create({ ...data, slug: slugify(data.name) });
    res.status(201).json({ brand });
  }),
);

router.put(
  '/brands/:id',
  ah(async (req, res) => {
    const data = brandSchema.parse(req.body);
    const brand = await Brand.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!brand) throw new HttpError(404, 'Brand not found');
    res.json({ brand });
  }),
);

router.post(
  '/brands/:id/logo',
  imageUpload.single('image'),
  ah(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose an image');
    const brand = await Brand.findById(req.params.id);
    if (!brand) throw new HttpError(404, 'Brand not found');
    const up = await uploadImage(req.file.buffer, 'brands', req.file.mimetype);
    await deleteImage(brand.logoPublicId);
    brand.logoUrl = up.url;
    brand.logoPublicId = up.publicId;
    await brand.save();
    res.json({ brand });
  }),
);

router.delete(
  '/brands/:id',
  ah(async (req, res) => {
    if (await Product.exists({ brand: req.params.id })) throw new HttpError(409, 'This brand still has products. Deactivate it instead.');
    await Brand.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  }),
);

/* ---------- Vehicles ---------- */
const vehicleSchema = z.object({
  category: z.enum(VEHICLE_CATEGORIES),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  variant: z.string().trim().max(80).optional().default(''),
  fuel: z.string().trim().max(30).optional().default(''),
  yearFrom: numOrNull.optional(),
  yearTo: numOrNull.optional(),
  aliases: z.array(z.string().trim().max(40)).max(10).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

router.get(
  '/vehicles',
  ah(async (req, res) => {
    const { q = '', category } = z.object({ q: z.string().max(80).optional(), category: z.string().optional() }).parse(req.query);
    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length) filter.$and = tokens.map((t) => ({ searchText: { $regex: escapeRegex(t) } }));
    const vehicles = await Vehicle.find(filter).sort({ category: 1, make: 1, model: 1, variant: 1 }).limit(300).lean();
    const counts = await VehicleCompatibility.aggregate([
      { $match: { vehicle: { $in: vehicles.map((v) => v._id) } } },
      { $group: { _id: '$vehicle', n: { $sum: 1 } } },
    ]);
    const m = new Map(counts.map((c) => [String(c._id), c.n]));
    res.json({ vehicles: vehicles.map((v) => ({ ...v, label: vehicleLabel(v), batteryCount: m.get(String(v._id)) ?? 0 })) });
  }),
);

router.post(
  '/vehicles',
  ah(async (req, res) => {
    const data = vehicleSchema.parse(req.body);
    const vehicle = await Vehicle.create({ ...data, searchText: vehicleSearchText(data) });
    res.status(201).json({ vehicle });
  }),
);

router.put(
  '/vehicles/:id',
  ah(async (req, res) => {
    const data = vehicleSchema.parse(req.body);
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { ...data, searchText: vehicleSearchText(data) }, { new: true });
    if (!vehicle) throw new HttpError(404, 'Vehicle not found');
    res.json({ vehicle });
  }),
);

router.delete(
  '/vehicles/:id',
  ah(async (req, res) => {
    await VehicleCompatibility.deleteMany({ vehicle: req.params.id });
    await Vehicle.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  }),
);

export default router;
