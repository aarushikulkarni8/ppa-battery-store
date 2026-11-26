import { Types } from 'mongoose';
import { CATEGORY_LABELS, VEHICLE_CATEGORIES, type VehicleCategory } from '../config/constants.js';
import { Brand, Vehicle, VehicleCompatibility, vehicleLabel } from '../models/index.js';
import { escapeRegex } from '../utils/http.js';
import { findPublicProducts, groupByBrand } from './catalog.js';

const CATEGORY_SYNONYMS: [VehicleCategory, string[]][] = [
  ['TWO_WHEELER', ['two wheelers', 'two wheeler', 'two-wheeler', '2 wheeler', '2wheeler', '2w', 'bikes', 'bike', 'motorcycles', 'motorcycle', 'motorbike', 'scooters', 'scooter', 'scooty', 'moped']],
  ['THREE_WHEELER', ['three wheelers', 'three wheeler', 'three-wheeler', '3 wheeler', '3w', 'auto rickshaw', 'autorickshaw', 'rickshaw']],
  ['FOUR_WHEELER', ['four wheelers', 'four wheeler', 'four-wheeler', '4 wheeler', '4wheeler', '4w', 'cars', 'car', 'suv', 'muv', 'sedan', 'hatchback', 'jeep']],
  ['COMMERCIAL', ['commercial vehicle', 'commercial', 'trucks', 'truck', 'lorry', 'buses', 'bus', 'lcv', 'hcv', 'tempo']],
  ['TRACTOR', ['tractors', 'tractor']],
  ['PCB', ['printed circuit boards', 'printed circuit board', 'circuit boards', 'circuit board', 'pcbs', 'pcb']],
  ['INVERTER', ['inverter batteries', 'inverter battery', 'inverters', 'inverter', 'home ups', 'ups', 'tubular']],
  ['OTHER', ['genset', 'generator']],
];

const STOP_WORDS = new Set(['battery', 'batteries', 'for', 'my', 'the', 'a', 'of', 'price', 'best', 'buy', 'new', 'amp', 'in']);

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9.\s-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function takePhrase(text: string, phrase: string): string | null {
  const re = new RegExp(`(^|\\s)${escapeRegex(phrase)}(?=\\s|$)`);
  return re.test(text) ? text.replace(re, ' ').replace(/\s+/g, ' ').trim() : null;
}

export interface SearchInput {
  q?: string;
  category?: string;
  brand?: string;
  /** INVERTER = inverter units only, BATTERY = batteries only */
  type?: string;
}

export async function searchCatalog({ q = '', category, brand, type }: SearchInput) {
  let text = normalize(q);
  let detectedCategory: VehicleCategory | null =
    category && (VEHICLE_CATEGORIES as readonly string[]).includes(category) ? (category as VehicleCategory) : null;

  // 0. inverter units vs. inverter batteries
  let productType: 'BATTERY' | 'INVERTER' | null = null;
  if (/\b(inverter|ups) batter(y|ies)\b|\btubular\b/.test(text)) productType = 'BATTERY';
  else if (/\b(inverters?|home ups)\b/.test(text) && !/\bbatter/.test(text)) productType = null; // show both
  // explicit choice from the menu (?type=INVERTER or ?type=BATTERY) wins
  if (type === 'INVERTER' || type === 'BATTERY') productType = type;
  let va: number | null = null;
  const vaMatch = text.match(/(\d+)\s*va\b/);
  if (vaMatch) {
    va = Number(vaMatch[1]);
    productType = 'INVERTER';
    if (!detectedCategory) detectedCategory = 'INVERTER';
    text = text.replace(vaMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }

  // "automotive" = everything with an engine except two-wheelers
  let automotive = false;
  if (/\bautomotive\b|\bautomobile\b/.test(text)) {
    automotive = true;
    text = text.replace(/\b(automotive|automobile)\b/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // 1. category words
  if (!detectedCategory && !automotive) {
    outer: for (const [cat, words] of CATEGORY_SYNONYMS) {
      for (const w of words) {
        const rest = takePhrase(text, w);
        if (rest !== null) {
          detectedCategory = cat;
          text = rest;
          break outer;
        }
      }
    }
  }

  // 2. brand words
  const brands = await Brand.find({ isActive: true }).lean();
  let detectedBrand = brand ? brands.find((b) => b.slug === brand) ?? null : null;
  if (!detectedBrand) {
    for (const b of brands) {
      const rest = takePhrase(text, b.name.toLowerCase()) ?? takePhrase(text, b.slug);
      if (rest !== null) {
        detectedBrand = b;
        text = rest;
        break;
      }
    }
  }

  // 3. capacity, e.g. "45ah", "45 ah", "7.2ah"
  let ah: number | null = null;
  const ahMatch = text.match(/(\d+(?:\.\d+)?)\s*a\.?h\b/);
  if (ahMatch) {
    ah = Number(ahMatch[1]);
    text = text.replace(ahMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }

  const tokens = text.split(' ').filter((t) => t && !STOP_WORDS.has(t));

  // 4. vehicles + free-text product match
  let vehicles: { _id: Types.ObjectId; label: string; category: string }[] = [];
  const orClauses: Record<string, unknown>[] = [];
  if (tokens.length) {
    const vehicleFilter: Record<string, unknown> = {
      isActive: true,
      $and: tokens.map((t) => ({ searchText: { $regex: `(^|\\s)${escapeRegex(t)}` } })),
    };
    if (detectedCategory) vehicleFilter.category = detectedCategory;
    const vs = await Vehicle.find(vehicleFilter).sort({ make: 1, model: 1, variant: 1 }).limit(60).lean();
    vehicles = vs.map((v) => ({ _id: v._id, label: vehicleLabel(v), category: v.category }));
    if (vs.length) {
      const compat = await VehicleCompatibility.find({ vehicle: { $in: vs.map((v) => v._id) } }).select('product').lean();
      orClauses.push({ _id: { $in: compat.map((c) => c.product) } });
    }
    const textRe = tokens.map((t) => new RegExp(escapeRegex(t), 'i'));
    orClauses.push({
      $and: textRe.map((re) => ({ $or: [{ name: re }, { model: re }, { sku: re }, { series: re }, { batteryType: re }] })),
    });
  }

  const filter: Record<string, unknown> = {};
  if (detectedCategory) filter.vehicleCategory = detectedCategory;
  else if (automotive) filter.vehicleCategory = { $in: ['FOUR_WHEELER', 'THREE_WHEELER', 'COMMERCIAL', 'TRACTOR'] };
  if (detectedBrand) filter.brand = detectedBrand._id;
  if (ah != null) filter.capacityAh = { $gte: ah - 0.5, $lte: ah + 0.5 };
  if (productType === 'BATTERY') filter.productType = { $ne: 'INVERTER' };
  if (productType === 'INVERTER') filter.productType = 'INVERTER';
  if (va != null) filter['inverterSpecs.vaRating'] = va;
  if (orClauses.length) filter.$or = orClauses;

  const nothingToSearch = !tokens.length && !detectedCategory && !automotive && !detectedBrand && ah == null && va == null;
  let products = nothingToSearch ? [] : await findPublicProducts(filter);

  // No exact VA match: show the nearest ratings.
  let nearestVa: number[] = [];
  if (!products.length && va != null && !tokens.length) {
    const { ['inverterSpecs.vaRating']: _v, ...rest } = filter;
    const pool = await findPublicProducts(rest);
    if (pool.length) {
      const dist = (p: Record<string, any>) => Math.abs(Number(p.inverterSpecs?.vaRating ?? 0) - va!);
      const best = Math.min(...pool.map(dist));
      products = pool.filter((p) => dist(p) === best);
      nearestVa = [...new Set(products.map((p) => (p as any).inverterSpecs?.vaRating as number))];
    }
  }

  // No exact Ah match: show the nearest capacities instead of an empty page.
  let nearestAh: number[] = [];
  if (!products.length && ah != null && !tokens.length) {
    const { capacityAh: _omit, ...rest } = filter;
    const pool = await findPublicProducts(rest);
    if (pool.length) {
      const dist = (p: Record<string, any>) => Math.abs(Number(p.capacityAh) - ah!);
      const best = Math.min(...pool.map(dist));
      products = pool.filter((p) => dist(p) <= best + 0.5);
      nearestAh = [...new Set(products.map((p) => p.capacityAh as number))].sort((a, b) => a - b);
    }
  }
  // Batteries you can order online first; the rest keep their order (capacity, then name).
  products = [...products].sort((a, b) => Number(b.sellingPrice != null) - Number(a.sellingPrice != null));
  let groups = await groupByBrand(products);
  if (detectedBrand) groups = groups.filter((g) => String(g.brand._id) === String(detectedBrand!._id));

  const parts: string[] = [];
  if (detectedBrand) parts.push(detectedBrand.name);
  if (detectedCategory && detectedCategory !== 'INVERTER') parts.push(CATEGORY_LABELS[detectedCategory].toLowerCase());
  else if (automotive) parts.push('automotive');
  if (ah != null) parts.push(`${ah}Ah`);
  if (va != null) parts.push(`${va}VA`);
  const noun =
    detectedCategory !== 'INVERTER'
      ? 'batteries'
      : productType === 'INVERTER'
        ? 'inverters'
        : productType === 'BATTERY'
          ? 'inverter batteries'
          : 'inverters and inverter batteries';
  if (detectedCategory === 'PCB') parts.length = 0;
  let heading = detectedCategory === 'PCB' ? 'PCB products' : parts.length || detectedCategory || automotive ? `${parts.join(' ')} ${noun}`.trim() : 'Search results';
  heading = heading.charAt(0).toUpperCase() + heading.slice(1);
  if (vehicles.length === 1) heading = `Batteries for ${vehicles[0].label}`;
  else if (vehicles.length > 1 && tokens.length) heading = `Batteries for "${tokens.join(' ')}"`;

  return {
    query: q,
    heading,
    interpretation: {
      category: detectedCategory,
      categoryLabel: detectedCategory ? CATEGORY_LABELS[detectedCategory] : null,
      brand: detectedBrand ? { name: detectedBrand.name, slug: detectedBrand.slug } : null,
      capacityAh: ah,
      nearestAh,
      vaRating: va,
      nearestVa,
      productType,
      terms: tokens,
      vehicles,
    },
    total: products.length,
    groups,
  };
}
