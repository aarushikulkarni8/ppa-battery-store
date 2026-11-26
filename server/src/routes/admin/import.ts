/**
 * Bulk product import / export for the admin console.
 *
 * The client reads a CSV (exported from Excel / Google Sheets), turns it into rows of
 * { column: value } and posts them here. Every row is validated first; if any row has an
 * error, nothing is written and the errors come back with their row numbers.
 *
 * Rows are matched on SKU:
 *  - new SKU      → a product is created (brand, name, model, sku, category, capacityAh,
 *                   warrantyTotalMonths are required; capacity can be added later)
 *  - existing SKU → only the cells that are filled in are updated, so a sheet with just
 *                   "sku, sellingPrice, stock" is a quick price/stock update.
 */
import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { VEHICLE_CATEGORIES, type VehicleCategory } from '../../config/constants.js';
import { Brand, Inventory, Product } from '../../models/index.js';
import { requireAdmin } from '../../middleware/auth.js';
import { adjustStock } from '../../services/orders.js';
import { ah, slugify } from '../../utils/http.js';

const router = Router();
router.use(requireAdmin);

/** Column order used for the template and for exports. */
export const IMPORT_COLUMNS = [
  'productType',
  'brand',
  'name',
  'series',
  'model',
  'sku',
  'category',
  'batteryType',
  'voltage',
  'capacityAh',
  'cca',
  'lengthMm',
  'widthMm',
  'heightMm',
  'weightKg',
  'terminalLayout',
  'vaRating',
  'maxLoadW',
  'batteriesSupported',
  'waveform',
  'chargingCurrentA',
  'recommendedBattery',
  'warrantyTotalMonths',
  'warrantyFreeMonths',
  'warrantyProRataMonths',
  'warrantyNotes',
  'mrp',
  'sellingPrice',
  'stock',
  'active',
  'description',
  'features',
  'sourceNote',
] as const;

const CATEGORY_WORDS: Record<string, VehicleCategory> = {
  'two wheeler': 'TWO_WHEELER', 'two-wheeler': 'TWO_WHEELER', '2w': 'TWO_WHEELER', '2wl': 'TWO_WHEELER', bike: 'TWO_WHEELER', scooter: 'TWO_WHEELER',
  'three wheeler': 'THREE_WHEELER', 'three-wheeler': 'THREE_WHEELER', '3w': 'THREE_WHEELER', auto: 'THREE_WHEELER', 'e-rickshaw': 'THREE_WHEELER',
  'four wheeler': 'FOUR_WHEELER', 'four-wheeler': 'FOUR_WHEELER', '4w': 'FOUR_WHEELER', car: 'FOUR_WHEELER', suv: 'FOUR_WHEELER', 'car/suv': 'FOUR_WHEELER',
  commercial: 'COMMERCIAL', 'commercial vehicle': 'COMMERCIAL', truck: 'COMMERCIAL', bus: 'COMMERCIAL', cv: 'COMMERCIAL',
  tractor: 'TRACTOR', farm: 'TRACTOR',
  inverter: 'INVERTER', 'home ups': 'INVERTER', 'inverter & home ups': 'INVERTER', ups: 'INVERTER',
  other: 'OTHER',
};
function parseCategory(v: string): VehicleCategory | null {
  const s = v.trim();
  if ((VEHICLE_CATEGORIES as readonly string[]).includes(s.toUpperCase().replace(/[\s-]+/g, '_'))) return s.toUpperCase().replace(/[\s-]+/g, '_') as VehicleCategory;
  return CATEGORY_WORDS[s.toLowerCase()] ?? null;
}

const clean = (v: unknown) => (v == null ? '' : String(v).trim());
function num(v: string, field: string, errors: string[], { int = false } = {}) {
  if (v === '') return undefined;
  const n = Number(v.replace(/[₹,\s]/g, '').replace(/(ah|v|kg|mm|months?)$/i, ''));
  if (!Number.isFinite(n) || n < 0 || (int && !Number.isInteger(n))) {
    errors.push(`${field} “${v}” is not a valid ${int ? 'whole ' : ''}number`);
    return undefined;
  }
  return n;
}

interface ParsedRow {
  line: number;
  sku: string;
  brandName: string;
  fields: Record<string, unknown>;
  warranty: Record<string, unknown>;
  dims: Record<string, unknown>;
  inv: Record<string, unknown>;
  stock?: number;
  isNew: boolean;
}


const bodySchema = z.object({
  rows: z.array(z.record(z.unknown())).min(1, 'The file has no rows').max(2000, 'Import at most 2000 rows at a time'),
  firstLine: z.number().int().min(1).optional().default(2),
});

router.post(
  '/import/products',
  ah(async (req, res) => {
    const { rows, firstLine } = bodySchema.parse(req.body);

    const brands = await Brand.find().lean();
    const brandByName = new Map(brands.map((b) => [b.name.toLowerCase(), b]));
    const skus = rows.map((r) => clean(r.sku).toUpperCase()).filter(Boolean);
    const existing = new Map(
      (await Product.find({ sku: { $in: skus } }).select('sku').lean()).map((p) => [p.sku, p._id]),
    );

    const parsed: ParsedRow[] = [];
    const problems: { line: number; sku: string; errors: string[] }[] = [];
    const seen = new Map<string, number>();

    rows.forEach((raw, i) => {
      const line = firstLine + i;
      const r: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) r[k.trim().replace(/^\uFEFF/, '')] = clean(v);
      if (Object.values(r).every((v) => v === '')) return; // blank line
      const errors: string[] = [];
      const sku = r.sku?.toUpperCase() ?? '';
      if (!sku) errors.push('sku is required');
      if (sku && seen.has(sku)) errors.push(`sku ${sku} is repeated (also on line ${seen.get(sku)})`);
      if (sku) seen.set(sku, line);
      const isNew = !existing.has(sku);

      const fields: Record<string, unknown> = {};
      const warranty: Record<string, unknown> = {};
      const dims: Record<string, unknown> = {};
      const text = (col: string, max: number, target = col) => {
        const v = r[col] ?? '';
        if (v === '') return;
        if (v.length > max) errors.push(`${col} is longer than ${max} characters`);
        else fields[target] = v;
      };

      const inv: Record<string, unknown> = {};
      if (r.productType) {
        const t = r.productType.toLowerCase();
        if (['inverter', 'ups', 'home ups', 'inverter unit'].includes(t)) fields.productType = 'INVERTER';
        else if (['battery', 'batteries'].includes(t)) fields.productType = 'BATTERY';
        else errors.push(`productType “${r.productType}” should be battery or inverter`);
      }
      for (const col of ['vaRating', 'maxLoadW', 'batteriesSupported', 'chargingCurrentA'] as const) {
        const n = num(r[col] ?? '', col, errors);
        if (n !== undefined) inv[col] = n;
      }
      if (r.waveform) inv.waveform = r.waveform.slice(0, 60);
      if (r.recommendedBattery) inv.recommendedBattery = r.recommendedBattery.slice(0, 120);

      const brandName = r.brand ?? '';
      if (isNew && !brandName) errors.push('brand is required for a new product');
      text('name', 160);
      text('series', 60);
      text('model', 60);
      text('batteryType', 80);
      text('terminalLayout', 60);
      text('description', 5000);
      text('sourceNote', 500);
      if (r.category) {
        const c = parseCategory(r.category);
        if (!c) errors.push(`category “${r.category}” is not recognised (use: two wheeler, three wheeler, four wheeler, commercial, tractor, inverter, other)`);
        else fields.vehicleCategory = c;
      }
      const voltage = num(r.voltage ?? '', 'voltage', errors);
      if (voltage !== undefined) fields.voltage = voltage;
      const cap = num(r.capacityAh ?? '', 'capacityAh', errors);
      if (cap !== undefined) fields.capacityAh = cap;
      for (const [col, key] of [['cca', 'cca'], ['weightKg', 'weightKg'], ['mrp', 'mrp'], ['sellingPrice', 'sellingPrice']] as const) {
        const n = num(r[col] ?? '', col, errors);
        if (n !== undefined) fields[key] = n;
      }
      for (const col of ['lengthMm', 'widthMm', 'heightMm'] as const) {
        const n = num(r[col] ?? '', col, errors);
        if (n !== undefined) dims[col] = n;
      }
      const wt = num(r.warrantyTotalMonths ?? '', 'warrantyTotalMonths', errors, { int: true });
      const wf = num(r.warrantyFreeMonths ?? '', 'warrantyFreeMonths', errors, { int: true });
      const wp = num(r.warrantyProRataMonths ?? '', 'warrantyProRataMonths', errors, { int: true });
      if (wt !== undefined) warranty.totalMonths = wt;
      if (wf !== undefined) warranty.freeMonths = wf;
      if (wp !== undefined) warranty.proRataMonths = wp;
      if (r.warrantyNotes) warranty.notes = r.warrantyNotes.slice(0, 500);
      if (wt !== undefined && wf !== undefined && wp !== undefined && wf + wp !== wt)
        errors.push(`warranty: free (${wf}) + pro-rata (${wp}) should add up to total (${wt})`);
      const stock = num(r.stock ?? '', 'stock', errors, { int: true });
      if (r.active) {
        const a = r.active.toLowerCase();
        if (['yes', 'y', 'true', '1', 'active'].includes(a)) fields.isActive = true;
        else if (['no', 'n', 'false', '0', 'inactive'].includes(a)) fields.isActive = false;
        else errors.push(`active “${r.active}” should be yes or no`);
      }
      if (r.features) fields.features = r.features.split('|').map((f) => f.trim()).filter(Boolean).slice(0, 20);

      const isInverter = fields.productType === 'INVERTER';
      if (isNew && isInverter && fields.vehicleCategory === undefined) fields.vehicleCategory = 'INVERTER';
      if (isNew) {
        for (const req of ['name', 'model', 'vehicleCategory'] as const)
          if (fields[req] === undefined) errors.push(`${req === 'vehicleCategory' ? 'category' : req} is required for a new product`);
        if (isInverter && inv.vaRating === undefined) errors.push('vaRating is required for a new inverter');
        if (fields.capacityAh === undefined) fields.capacityAh = 0; // unknown until the spec sheet is added
        if (warranty.totalMonths === undefined) errors.push('warrantyTotalMonths is required for a new product');
        if (fields.voltage === undefined) fields.voltage = 12;
      }

      if (errors.length) problems.push({ line, sku, errors });
      else parsed.push({ line, sku, brandName, fields, warranty, dims, inv, stock, isNew });
    });

    if (problems.length) {
      res.status(422).json({ ok: false, message: `${problems.length} row(s) have problems. Nothing was imported.`, problems });
      return;
    }

    // ---- write ----
    const results: { line: number; sku: string; action: 'created' | 'updated' }[] = [];
    let brandsCreated = 0;
    for (const row of parsed) {
      let brandId: Types.ObjectId | undefined;
      if (row.brandName) {
        let b = brandByName.get(row.brandName.toLowerCase());
        if (!b) {
          const created = await Brand.create({ name: row.brandName, slug: slugify(row.brandName), isActive: true, sortOrder: 100 });
          b = created.toObject();
          brandByName.set(row.brandName.toLowerCase(), b);
          brandsCreated++;
        }
        brandId = b._id as Types.ObjectId;
      }

      let product = row.isNew ? null : await Product.findOne({ sku: row.sku });
      if (!product) {
        product = new Product({
          ...row.fields,
          brand: brandId,
          sku: row.sku,
          warranty: { freeMonths: null, proRataMonths: null, notes: '', ...row.warranty },
          dimensions: row.dims,
          inverterSpecs: row.inv,
          slug: await uniqueSlug(`${row.fields.name} ${row.fields.model}`),
          isActive: row.fields.isActive ?? true,
        });
      } else {
        const renamed = (row.fields.name && row.fields.name !== product.name) || (row.fields.model && row.fields.model !== product.model);
        product.set(row.fields);
        if (brandId) product.brand = brandId;
        for (const [k, v] of Object.entries(row.warranty)) product.set(`warranty.${k}`, v);
        for (const [k, v] of Object.entries(row.dims)) product.set(`dimensions.${k}`, v);
        for (const [k, v] of Object.entries(row.inv)) product.set(`inverterSpecs.${k}`, v);
        if (renamed) product.slug = await uniqueSlug(`${product.name} ${product.model}`, String(product._id));
      }
      await product.save();

      const inv = await Inventory.findOneAndUpdate(
        { product: product._id },
        { $setOnInsert: { quantity: 0, lowStockThreshold: 3, movements: [] } },
        { upsert: true, new: true },
      );
      if (row.stock !== undefined && row.stock !== inv.quantity) await adjustStock(product._id, row.stock - inv.quantity, 'IMPORT', `line ${row.line}`);

      results.push({ line: row.line, sku: row.sku, action: row.isNew ? 'created' : 'updated' });
    }

    res.json({
      ok: true,
      created: results.filter((r) => r.action === 'created').length,
      updated: results.filter((r) => r.action === 'updated').length,
      brandsCreated,
      results,
    });
  }),
);

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || 'battery';
  let n = 1;
  while (await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${slugify(base)}-${++n}`;
  return slug;
}

/** Every product as import-ready rows, so the owner can edit in Excel and re-import. */
router.get(
  '/import/products/export',
  ah(async (_req, res) => {
    const products = await Product.find().populate('brand', 'name').sort({ vehicleCategory: 1, capacityAh: 1 }).lean();
    const inv = new Map((await Inventory.find().lean()).map((i) => [String(i.product), i.quantity]));
    const n = (v: unknown) => (v == null ? '' : String(v));
    const rows = products.map((p: any) => ({
      productType: p.productType === 'INVERTER' ? 'inverter' : 'battery',
      brand: p.brand?.name ?? '',
      name: p.name,
      series: p.series,
      model: p.model,
      sku: p.sku,
      category: p.vehicleCategory,
      batteryType: p.batteryType,
      voltage: n(p.voltage),
      capacityAh: n(p.capacityAh),
      cca: n(p.cca),
      lengthMm: n(p.dimensions?.lengthMm),
      widthMm: n(p.dimensions?.widthMm),
      heightMm: n(p.dimensions?.heightMm),
      weightKg: n(p.weightKg),
      terminalLayout: p.terminalLayout,
      vaRating: n(p.inverterSpecs?.vaRating),
      maxLoadW: n(p.inverterSpecs?.maxLoadW),
      batteriesSupported: n(p.inverterSpecs?.batteriesSupported),
      waveform: p.inverterSpecs?.waveform ?? '',
      chargingCurrentA: n(p.inverterSpecs?.chargingCurrentA),
      recommendedBattery: p.inverterSpecs?.recommendedBattery ?? '',
      warrantyTotalMonths: n(p.warranty?.totalMonths),
      warrantyFreeMonths: n(p.warranty?.freeMonths),
      warrantyProRataMonths: n(p.warranty?.proRataMonths),
      warrantyNotes: p.warranty?.notes ?? '',
      mrp: n(p.mrp),
      sellingPrice: n(p.sellingPrice),
      stock: n(inv.get(String(p._id)) ?? 0),
      active: p.isActive ? 'yes' : 'no',
      description: p.description,
      features: (p.features ?? []).join(' | '),
      sourceNote: p.sourceNote ?? '',
    }));
    res.json({ columns: IMPORT_COLUMNS, rows });
  }),
);

export default router;
