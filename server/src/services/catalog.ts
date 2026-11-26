import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { Brand, Inventory, Product } from '../models/index.js';

type AnyProduct = Record<string, any> & { _id: Types.ObjectId };

/** Attaches live stock + a purchasable flag to lean product documents. */
export async function withStock<T extends AnyProduct>(products: T[]) {
  if (!products.length) return [] as (T & { stock: number; lowStockThreshold: number; purchasable: boolean })[];
  const inv = await Inventory.find({ product: { $in: products.map((p) => p._id) } }).lean();
  const map = new Map(inv.map((i) => [String(i.product), i]));
  return products.map((p) => {
    const i = map.get(String(p._id));
    const stock = i?.quantity ?? 0;
    return {
      ...p,
      stock,
      lowStockThreshold: i?.lowStockThreshold ?? 3,
      purchasable: Boolean(p.isActive && p.sellingPrice != null && stock > 0),
    };
  });
}

/**
 * What customers may see. With ONLINE_SHOP off the website is a catalogue: prices are left out
 * of every public response (so they can't be read from the page either) and nothing is orderable.
 * Admin routes use withStock directly and still see prices.
 */
export function forCustomers<T extends Record<string, any>>(products: T[]): T[] {
  if (env.ONLINE_SHOP) return products;
  return products.map((p) => ({ ...p, mrp: null, sellingPrice: null, purchasable: false }));
}

export const PRODUCT_BRAND_FIELDS = 'name slug logoUrl accentColor sortOrder isActive';

export async function activeBrandIds() {
  const brands = await Brand.find({ isActive: true }).select('_id').lean();
  return brands.map((b) => b._id);
}

export async function findPublicProducts(filter: Record<string, unknown>, limit = 200) {
  const brandIds = await activeBrandIds();
  const activeIds = brandIds.map(String);
  const requested = filter.brand;
  let brandFilter: unknown = { $in: brandIds };
  if (requested !== undefined) {
    // keep the caller's brand filter, but only if that brand is active
    brandFilter = activeIds.includes(String(requested)) ? requested : { $in: [] };
  }
  const products = await Product.find({ ...filter, isActive: true, brand: brandFilter })
    .populate('brand', PRODUCT_BRAND_FIELDS)
    .sort({ capacityAh: 1, name: 1 })
    .limit(limit)
    .lean();
  return forCustomers(await withStock(products as AnyProduct[]));
}

/** Groups products under every active brand (brands with no match get an empty list). */
export async function groupByBrand<T extends Record<string, any>>(products: T[]) {
  const brands = await Brand.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  return brands.map((b) => ({
    brand: { _id: b._id, name: b.name, slug: b.slug, logoUrl: b.logoUrl, accentColor: b.accentColor },
    products: products.filter((p) => String(p.brand?._id ?? p.brand) === String(b._id)),
  }));
}
