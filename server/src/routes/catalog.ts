import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { CATEGORY_LABELS, VEHICLE_CATEGORIES } from '../config/constants.js';
import { Brand, Product, Vehicle, VehicleCompatibility, vehicleLabel } from '../models/index.js';
import { activeBrandIds, findPublicProducts, forCustomers, groupByBrand, PRODUCT_BRAND_FIELDS, withStock } from '../services/catalog.js';
import { env } from '../config/env.js';
import { searchCatalog } from '../services/search.js';
import { ah, HttpError } from '../utils/http.js';

const router = Router();

/** Public site settings the website needs before anything else. */
router.get('/site', (_req, res) => res.json({ onlineShop: env.ONLINE_SHOP }));

router.get(
  '/brands',
  ah(async (_req, res) => {
    const brands = await Brand.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    const counts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c.count]));
    res.json({ brands: brands.map((b) => ({ ...b, productCount: map.get(String(b._id)) ?? 0 })) });
  }),
);

router.get(
  '/brands/:slug',
  ah(async (req, res) => {
    const brand = await Brand.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!brand) throw new HttpError(404, 'Brand not found');
    const products = await findPublicProducts({ brand: brand._id });
    res.json({ brand, products });
  }),
);

router.get(
  '/categories',
  ah(async (_req, res) => {
    const brandIds = await activeBrandIds();
    const counts = await Product.aggregate([
      { $match: { isActive: true, brand: { $in: brandIds } } },
      { $group: { _id: '$vehicleCategory', count: { $sum: 1 } } },
    ]);
    const map = new Map(counts.map((c) => [c._id, c.count]));
    res.json({
      categories: VEHICLE_CATEGORIES.map((key) => ({ key, label: CATEGORY_LABELS[key], productCount: map.get(key) ?? 0 })),
    });
  }),
);

router.get(
  '/search',
  ah(async (req, res) => {
    const q = z
      .object({ q: z.string().max(120).optional(), category: z.string().optional(), brand: z.string().optional(), type: z.string().optional() })
      .parse(req.query);
    res.json(await searchCatalog(q));
  }),
);

router.get(
  '/products',
  ah(async (req, res) => {
    const q = z
      .object({ category: z.string().optional(), featured: z.string().optional(), limit: z.coerce.number().min(1).max(200).optional() })
      .parse(req.query);
    const filter: Record<string, unknown> = {};
    if (q.category) filter.vehicleCategory = q.category;
    if (q.featured) filter.sellingPrice = { $ne: null };
    const products = await findPublicProducts(filter, q.limit ?? 60);
    res.json({ products });
  }),
);

router.get(
  '/products/:slug',
  ah(async (req, res) => {
    const key = req.params.slug;
    const doc = await Product.findOne({ isActive: true, $or: [{ slug: key }, ...(Types.ObjectId.isValid(key) ? [{ _id: key }] : [])] })
      .populate('brand', `${PRODUCT_BRAND_FIELDS} description`)
      .lean();
    if (!doc || !(doc.brand as any)?.isActive) throw new HttpError(404, 'Product not found');
    const [product] = forCustomers(await withStock([doc as any]));
    const compat = await VehicleCompatibility.find({ product: doc._id }).populate('vehicle').lean();
    const vehicles = compat
      .map((c) => c.vehicle as any)
      .filter((v) => v && v.isActive)
      .map((v) => ({ _id: v._id, category: v.category, make: v.make, model: v.model, variant: v.variant, label: vehicleLabel(v) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    res.json({ product, compatibleVehicles: vehicles });
  }),
);

/* ---------- Find my battery ---------- */

router.get(
  '/vehicles/types',
  ah(async (_req, res) => {
    const counts = await Vehicle.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }]);
    const map = new Map(counts.map((c) => [c._id, c.count]));
    res.json({ types: VEHICLE_CATEGORIES.map((key) => ({ key, label: CATEGORY_LABELS[key], vehicleCount: map.get(key) ?? 0 })) });
  }),
);

router.get(
  '/vehicles/makes',
  ah(async (req, res) => {
    const { category } = z.object({ category: z.enum(VEHICLE_CATEGORIES) }).parse(req.query);
    const makes = (await Vehicle.distinct('make', { category, isActive: true })) as string[];
    res.json({ makes: makes.sort((a, b) => a.localeCompare(b)) });
  }),
);

router.get(
  '/vehicles/models',
  ah(async (req, res) => {
    const { category, make } = z.object({ category: z.enum(VEHICLE_CATEGORIES), make: z.string() }).parse(req.query);
    const models = (await Vehicle.distinct('model', { category, make, isActive: true })) as string[];
    res.json({ models: models.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) });
  }),
);

router.get(
  '/vehicles/variants',
  ah(async (req, res) => {
    const { category, make, model } = z
      .object({ category: z.enum(VEHICLE_CATEGORIES), make: z.string(), model: z.string() })
      .parse(req.query);
    const vs = await Vehicle.find({ category, make, model, isActive: true }).sort({ variant: 1 }).lean();
    res.json({
      variants: vs.map((v) => ({ _id: v._id, variant: v.variant || 'Standard', fuel: v.fuel, label: vehicleLabel(v) })),
    });
  }),
);

router.get(
  '/vehicles/:id/batteries',
  ah(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid vehicle');
    const vehicle = await Vehicle.findById(req.params.id).lean();
    if (!vehicle) throw new HttpError(404, 'Vehicle not found');
    const compat = await VehicleCompatibility.find({ vehicle: vehicle._id }).lean();
    const products = await findPublicProducts({ _id: { $in: compat.map((c) => c.product) } });
    res.json({
      vehicle: { ...vehicle, label: vehicleLabel(vehicle) },
      total: products.length,
      groups: await groupByBrand(products),
    });
  }),
);

router.get(
  '/compatibility/check',
  ah(async (req, res) => {
    const { productId, vehicleId } = z.object({ productId: z.string(), vehicleId: z.string() }).parse(req.query);
    if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(vehicleId)) throw new HttpError(400, 'Invalid ids');
    const [vehicle, match] = await Promise.all([
      Vehicle.findById(vehicleId).lean(),
      VehicleCompatibility.exists({ product: productId, vehicle: vehicleId }),
    ]);
    if (!vehicle) throw new HttpError(404, 'Vehicle not found');
    let alternatives: unknown[] = [];
    if (!match) {
      const compat = await VehicleCompatibility.find({ vehicle: vehicleId }).lean();
      alternatives = await findPublicProducts({ _id: { $in: compat.map((c) => c.product) } }, 6);
    }
    res.json({ compatible: Boolean(match), vehicle: { _id: vehicle._id, label: vehicleLabel(vehicle) }, alternatives });
  }),
);

export default router;
