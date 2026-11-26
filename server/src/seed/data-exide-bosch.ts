/**
 * Exide and Bosch catalogue, copied from the makers' own publications (read 26 Nov 2026):
 *
 * - Exide: specification tables on the exidecare.com range pages linked in each product.
 * - Bosch: "Technical Data" table in Bosch India's automotive battery catalogue, 2023 edition.
 *
 * Prices are left empty on purpose: set the shop's own prices in /admin.
 * Neither source table prints voltage; 12 V is the standard rating for these batteries.
 */
import type { VehicleCategory } from '../config/constants.js';
import type { SeedProduct } from './data.js';

type Warranty = SeedProduct['warranty'];

function product(p: {
  brand: 'exide' | 'bosch';
  name: string;
  series: string;
  model: string;
  sku: string;
  category: VehicleCategory;
  batteryType?: string;
  ah: number;
  cca?: number | null;
  size: [number, number, number];
  kg: number;
  layout?: string;
  warranty: Warranty;
  description: string;
  sourceUrl: string;
  sourceNote: string;
}): SeedProduct {
  const [lengthMm, widthMm, heightMm] = p.size;
  return {
    brand: p.brand,
    name: p.name,
    series: p.series,
    model: p.model,
    sku: p.sku,
    batteryType: p.batteryType ?? '',
    vehicleCategory: p.category,
    voltage: 12,
    capacityAh: p.ah,
    cca: p.cca ?? null,
    dimensions: { lengthMm, widthMm, heightMm },
    weightKg: p.kg,
    terminalLayout: p.layout ?? '',
    warranty: p.warranty,
    description: p.description,
    features: [],
    mrp: null,
    sellingPrice: null,
    sourceUrl: p.sourceUrl,
    sourceNote: p.sourceNote,
  };
}

const skuOf = (prefix: string, code: string) => `${prefix}-${code.toUpperCase().replace(/[^A-Z0-9]+/g, '')}`;

/* ------------------------------------------------------------------ Exide */

const EXIDE = 'https://www.exidecare.com/brand/';
const EXIDE_NOTE = 'Specifications and warranty from the Exide range page on exidecare.com. Voltage (12 V) is not printed there. Check current terms on the Exide warranty card.';
const COMMERCIAL_USE =
  ' Commercial use: 18 months free replacement for batteries sold on or after 23.09.2026 (12 months for earlier purchases). Warranty applies as per OEM fitment.';

const split = (freeMonths: number, proRataMonths: number, extra = ''): Warranty => ({
  totalMonths: freeMonths + proRataMonths,
  freeMonths,
  proRataMonths,
  notes: `${freeMonths} months free replacement + ${proRataMonths} months pro-rata. Terms and conditions apply.${extra}`,
});

/** [model, Ah, length, width, height, kg, CCA, layout] */
type CarRow = [string, number, number, number, number, number, number, 'L' | 'R'];

const exideCars = (range: string, slug: string, free: number, proRata: number, rows: CarRow[]) =>
  rows.map(([model, ah, l, w, h, kg, cca, layout]) =>
    product({
      brand: 'exide',
      name: `Exide ${range} Car Battery ${model}`,
      series: range,
      model,
      sku: skuOf('EX', model),
      category: 'FOUR_WHEELER',
      ah,
      cca,
      size: [l, w, h],
      kg,
      layout,
      warranty: split(free, proRata, COMMERCIAL_USE),
      description: `${ah}Ah car battery from the Exide ${range} range.`,
      sourceUrl: EXIDE + slug,
      sourceNote: EXIDE_NOTE,
    }),
  );

const mileage = exideCars('Mileage', 'exide-mileage', 30, 30, [
  ['ML38B20L', 35, 197, 129, 227, 10.7, 332, 'L'],
  ['ML38B20R', 35, 197, 129, 227, 10.7, 332, 'R'],
  ['ML40RBH', 40, 197, 137, 227, 10.7, 354, 'R'],
  ['ML40LBH', 40, 197, 137, 227, 10.7, 354, 'L'],
  ['MLDIN44R', 44, 207, 175, 190, 13.4, 380, 'R'],
  ['MLDIN44LH', 44, 207, 175, 190, 13.4, 360, 'L'],
  ['ML55B24L(T1)', 50, 238, 129, 227, 13.6, 450, 'L'],
  ['ML45D21LBH', 45, 205, 177, 222, 14.8, 410, 'L'],
  ['MLDIN50', 50, 207, 175, 190, 14.5, 433, 'L'],
  ['ML55D23L', 54, 231, 173, 223, 16.1, 450, 'L'],
  ['MLDIN55', 55, 242, 175, 190, 17, 540, 'L'],
  ['MLDIN55R', 55, 242, 175, 190, 17, 540, 'R'],
  ['MLDIN60', 60, 242, 175, 190, 17, 600, 'L'],
  ['MLDIN66', 66, 278, 175, 190, 19.8, 590, 'L'],
  ['MLDIN66A', 66, 278, 175, 190, 19.8, 590, 'L'],
  ['ML75D23LBH', 68, 231, 175, 223, 17.8, 565, 'L'],
  ['ML85D26L', 72, 260, 173, 225, 20.7, 650, 'L'],
  ['ML85D26R', 72, 260, 173, 225, 20.7, 650, 'R'],
  ['MLDIN80', 80, 315, 175, 190, 22.3, 760, 'L'],
]);

const matrix = exideCars('Matrix', 'exide-matrix', 36, 36, [
  ['MT40B20L', 35, 197, 129, 227, 10.7, 360, 'L'],
  ['MT40B20R', 35, 197, 129, 227, 10.7, 360, 'R'],
  ['MTRED45L', 45, 238, 129, 227, 14.5, 410, 'L'],
  ['MTREDDIN100', 100, 353, 175, 190, 25, 850, 'L'],
]);

const eezy = exideCars('EEZY', 'exide-eezy', 24, 24, [
  ['EY34B19L', 33, 187, 127, 227, 9.6, 240, 'L'],
  ['EY34B19R', 33, 187, 127, 227, 9.6, 240, 'R'],
  ['EY38B20L', 35, 197, 129, 227, 10.4, 325, 'L'],
  ['EY38B20R', 35, 197, 129, 227, 10.4, 325, 'R'],
  ['EY700L', 65, 260, 173, 225, 18.8, 490, 'L'],
  ['EY700', 65, 260, 173, 225, 18.8, 490, 'R'],
  ['EY700LF', 65, 260, 173, 225, 18.8, 490, 'L'],
  ['EY700F', 65, 260, 173, 225, 18.8, 490, 'R'],
  ['EY80D23R', 68, 232, 173, 225, 17.8, 600, 'R'],
  ['EY105D31L', 85, 305, 173, 225, 22.9, 720, 'L'],
  ['EY105D31R', 85, 305, 173, 225, 22.9, 720, 'R'],
]);

const epiq = exideCars('EPIQ', 'exide-epiq', 42, 35, [
  ['EPIQ35L', 35, 197, 129, 227, 11.7, 332, 'L'],
  ['EPIQ40LBH', 40, 197, 137, 227, 11.7, 354, 'L'],
  ['EPIQDIN74L', 74, 278, 175, 190, 20.5, 690, 'L'],
]);

/** [SKU on the page, battery nomenclature, Ah (C10), length, width, height, kg, layout] */
const xplore = (
  [
    ['12XL2.5L-C', '2.5L-C', 2.5, 80, 70, 105, 1.2, 'L'],
    ['XLTZ4A', 'MF4', 4, 113, 70, 85, 1.6, 'L'],
    ['XLTZ5A', 'MF5', 5, 113, 70, 105, 2.1, 'L'],
    ['XLTZ6', 'MF6', 5, 113, 70, 105, 2.1, 'L'],
    ['12XL5L-B', '5L-B', 5, 121, 60, 130, 2.3, 'L'],
    ['XLTZ7', 'MF7', 6, 113, 70, 130, 2.6, 'L'],
    ['12XL7B-B', '7B-B', 7, 151, 60, 130, 2.7, 'R'],
    ['XLTZ9', 'MF9', 8, 150, 87, 105, 3.5, 'R'],
    ['12XL9-B', '9B', 9, 136, 75, 139, 3.6, 'R'],
    ['XLTX14', 'MF14', 12, 150, 87, 146, 5, 'R'],
    ['12XL14L-A2', '14L-A2', 14, 136, 90, 166, 5.5, 'L'],
  ] as [string, string, number, number, number, number, number, 'L' | 'R'][]
).map(([code, nomenclature, ah, l, w, h, kg, layout]) =>
  product({
    brand: 'exide',
    name: `Exide Xplore Two Wheeler Battery ${code}`,
    series: 'Xplore',
    model: code,
    sku: skuOf('EX', code),
    category: 'TWO_WHEELER',
    batteryType: 'VRLA',
    ah,
    size: [l, w, h],
    kg,
    layout,
    warranty: split(24, 24),
    description: `${ah}Ah two wheeler battery from the Exide Xplore range (battery nomenclature ${nomenclature}).`,
    sourceUrl: `${EXIDE}exide-xplore`,
    sourceNote: `${EXIDE_NOTE} Capacity is the C10 rating.`,
  }),
);

/** [part number, type, Ah (C20), length, width, height, kg] */
type InverterRow = [string, 'Short Tubular' | 'Tall Tubular', number, number, number, number, number];

const exideInverter = (range: string, slug: string, free: number, proRata: number, rows: InverterRow[]) =>
  rows.map(([model, type, ah, l, w, h, kg]) =>
    product({
      brand: 'exide',
      name: `Exide ${range} Inverter Battery ${model}`,
      series: range,
      model,
      sku: skuOf('EX', model),
      category: 'INVERTER',
      batteryType: type,
      ah,
      size: [l, w, h],
      kg,
      warranty: split(
        free,
        proRata,
        model === 'IMTT3000' ? ' Exide’s page also shows a 42 month label for this model: confirm on the warranty card.' : '',
      ),
      description: `${ah}Ah ${type.toLowerCase()} inverter battery from the Exide ${range} range.`,
      sourceUrl: EXIDE + slug,
      sourceNote: `${EXIDE_NOTE} Capacity is the C20 rating.`,
    }),
  );

const invaTubular = exideInverter('InvaTubular', 'exide-home-invatubular-inverter-battery', 48, 18, [
  ['IT500', 'Tall Tubular', 150, 500, 189, 412, 57],
  ['IT650', 'Tall Tubular', 180, 500, 189, 412, 65],
  ['IT750', 'Tall Tubular', 200, 500, 189, 412, 66.8],
  ['IT900', 'Tall Tubular', 240, 500, 189, 412, 70],
  ['IT950', 'Tall Tubular', 260, 500, 189, 412, 75.5],
]);

const invaMaster = exideInverter('InvaMaster', 'exide-home-invamaster-inverter-battery', 36, 24, [
  ['IMST1000', 'Short Tubular', 100, 529, 188, 319, 44],
  ['IMST1500', 'Short Tubular', 150, 532, 220, 281, 45.4],
  ['IMTT1500', 'Tall Tubular', 150, 500, 189, 412, 56.8],
  ['IMTT1800', 'Tall Tubular', 180, 500, 189, 412, 59.5],
  ['IMTT2000', 'Tall Tubular', 200, 500, 189, 412, 62.5],
  ['IMTT2200', 'Tall Tubular', 220, 500, 189, 412, 65.4],
  ['IMTT2500', 'Tall Tubular', 250, 500, 189, 412, 70],
  ['IMTT3000', 'Tall Tubular', 300, 431, 288, 401, 92],
]);

export const exideProducts: SeedProduct[] = [...mileage, ...matrix, ...eezy, ...epiq, ...xplore, ...invaTubular, ...invaMaster];

/* ------------------------------------------------------------------ Bosch */

const BOSCH_URL =
  'https://www.boschaftermarket.com/xrm/media/images/country_specific/in/services_and_support_1/downloads_10/pdf_5/battery_catalogue_2023.pdf';

const boschWarranty = (freeMonths: number, extendedMonths: number): Warranty => ({
  totalMonths: freeMonths + extendedMonths,
  freeMonths,
  proRataMonths: extendedMonths,
  notes: `${freeMonths} months flat warranty + ${extendedMonths} months extended. In the extended period: flat 30% discount on MRP (inclusive of taxes); the old battery must be returned.`,
});

/** [part number, model, Ah, CCA, length, width, height without poles, kg, layout] */
type BoschRow = [string, string, number, number, number, number, number, number, 'L' | 'R'];

const boschFourWheel = (series: string, category: VehicleCategory, warranty: Warranty, rows: BoschRow[]) =>
  rows.map(([part, model, ah, cca, l, w, h, kg, layout]) =>
    product({
      brand: 'bosch',
      // "+" is spelled out so that S4 and S4 Plus products get different web addresses
      name: `Bosch ${series.replace('+', ' Plus')} ${category === 'COMMERCIAL' ? 'Commercial Vehicle' : 'Car'} Battery ${model}`,
      series,
      model,
      sku: skuOf('BO', part),
      category,
      batteryType: 'Lead-acid SLI, maintenance-free',
      ah,
      cca,
      size: [l, w, h],
      kg,
      layout,
      warranty,
      description: `${ah}Ah ${category === 'COMMERCIAL' ? 'commercial vehicle' : 'car'} battery from the Bosch ${series} range. Bosch part number F 002 H50 ${part.slice(-3)}.`,
      sourceUrl: BOSCH_URL,
      sourceNote: 'From the Bosch India battery catalogue, 2023 edition (C20 capacity; height without poles). Voltage (12 V) is not printed in the table. Confirm the model is still sold and its current warranty.',
    }),
  );

const bosch4w = [
  ...boschFourWheel('S5+', 'FOUR_WHEELER', boschWarranty(36, 54), [['F002H50076', '50B20L', 40, 360, 197, 129, 227, 11, 'L']]),
  ...boschFourWheel('S5', 'FOUR_WHEELER', boschWarranty(36, 48), [
    ['F002H50021', '42B20R', 35, 335, 197, 129, 203, 11, 'R'],
    ['F002H50025', '42B20L', 35, 335, 197, 129, 203, 11, 'L'],
    ['F002H50038', '40B20L (BH)', 38, 342, 190, 128, 200, 11, 'L'],
    ['F002H50032', '55B24L (S)', 45, 380, 238, 129, 203, 13, 'L'],
    ['F002H50016', 'DIN 74', 74, 690, 278, 175, 190, 21, 'L'],
    ['F002H50018', 'DIN 100', 100, 874, 353, 175, 190, 27, 'L'],
    ['F002H50405', '36B20R', 33, 320, 197, 129, 227, 10, 'R'],
    ['F002H50407', '36B20L', 33, 320, 197, 129, 227, 10, 'L'],
  ]),
  ...boschFourWheel('S5', 'FOUR_WHEELER', boschWarranty(30, 48), [
    ['F002H50069', '45D20L (BH)', 45, 410, 202, 173, 204, 15, 'L'],
    ['F002H50072', '80D23L', 55, 460, 232, 173, 204, 16, 'L'],
    ['F002H50023', '105D31R', 80, 750, 306, 173, 204, 23, 'R'],
    ['F002H50033', '105D31L', 80, 750, 306, 173, 204, 23, 'L'],
    ['F002H50026', 'DIN 44', 44, 350, 207, 175, 175, 13, 'L'],
    ['F002H50070', 'DIN 50', 50, 430, 207, 174, 190, 15, 'L'],
    ['F002H50027', 'DIN 55', 55, 540, 242, 175, 190, 18, 'L'],
    ['F002H50028', 'DIN 60', 60, 600, 242, 175, 190, 19, 'L'],
    ['F002H50073', '90D23L (BH)', 65, 580, 232, 173, 204, 18, 'L'],
    ['F002H50075', 'DIN 65', 65, 590, 278, 175, 175, 18, 'L'],
  ]),
  ...boschFourWheel('S4+', 'FOUR_WHEELER', boschWarranty(30, 48), [
    ['F002H50046', '38B20R', 35, 330, 197, 129, 203, 11, 'R'],
    ['F002H50047', '38B20L', 35, 330, 197, 129, 203, 11, 'L'],
    ['F002H50071', '38B20R (BH)', 35, 330, 197, 139, 203, 11, 'R'],
  ]),
  ...boschFourWheel('S4+', 'FOUR_WHEELER', boschWarranty(24, 48), [
    ['F002H50048', '95D26R', 65, 550, 260, 173, 208, 18, 'R'],
    ['F002H50049', '95D26L', 65, 550, 260, 173, 208, 18, 'L'],
    ['F002H50074', 'DIN 65', 65, 590, 278, 175, 175, 18, 'L'],
  ]),
  ...boschFourWheel('S4', 'FOUR_WHEELER', boschWarranty(24, 36), [
    ['F002H50011', '38B20R', 35, 266, 187, 127, 203, 9.6, 'R'],
    ['F002H50015', '38B20L', 36, 266, 187, 127, 203, 10, 'L'],
    ['F002H50064', '65D26R', 65, 400, 260, 173, 204, 18, 'R'],
    ['F002H50065', '65D26L', 65, 400, 260, 173, 204, 18, 'L'],
  ]),
  // Model codes are exactly as printed in the catalogue.
  ...boschFourWheel('T4', 'COMMERCIAL', boschWarranty(24, 36), [
    ['F002H50008', '620D31R', 80, 620, 306, 173, 204, 23, 'R'],
    ['F002H50013', '700H29R', 100, 512, 364, 176, 213, 25, 'R'],
    ['F002H50012', '800D04R', 120, 638, 505, 222, 213, 42, 'R'],
    ['F002H50009', '00D04R', 150, 754, 505, 222, 213, 48, 'R'],
    ['F002H50006', '50031R', 75, 450, 306, 173, 204, 21, 'R'],
    ['F002H50007', '600H29R', 90, 600, 333, 176, 213, 26, 'R'],
    ['F002H50078', '600H29L', 90, 600, 364, 176, 239, 26, 'L'],
    ['F002H50079', '115F51R (N120 poly)', 130, 638, 505, 182, 245, 40, 'R'],
    ['F002H50400', 'NT600E41L', 90, 600, 410, 176, 234, 25, 'L'],
  ]),
  ...boschFourWheel('S3', 'FOUR_WHEELER', boschWarranty(12, 24), [
    ['F002H50041', '38B20R', 36, 304, 187, 127, 203, 10, 'R'],
    ['F002H50045', '38B20L', 36, 304, 187, 127, 203, 10, 'L'],
    ['F002H50044', '55D26R', 60, 350, 260, 173, 204, 18, 'R'],
    ['F002H50042', '800D31R', 75, 450, 306, 173, 204, 20, 'R'],
  ]),
];

/** [part number, model, Ah (C10), length, width, height without poles, kg] */
const bosch2w = (
  [
    ['F002H50059', 'TZ2.5', 2.5, 79, 69, 105, 1.1],
    ['F002H50060', 'TZ5', 5, 116, 57, 130, 2],
    ['F002H50061', 'TZ9', 9, 137, 74, 139, 3.2],
    ['F002H50062', 'TZ4L BS-3', 3, 110, 67, 85, 1.5],
    ['F002H50063', 'TZ5-L BS-3', 4, 110, 67, 105, 2.1],
    ['F002H50081', 'TZ7', 7, 147, 56, 132, 2.5],
    ['F002H50402', 'TZ9R', 8, 150, 83, 106, 3.1],
  ] as [string, string, number, number, number, number, number][]
).map(([part, model, ah, l, w, h, kg]) =>
  product({
    brand: 'bosch',
    name: `Bosch M6 Two Wheeler Battery ${model}`,
    series: 'M6',
    model,
    sku: skuOf('BO', part),
    category: 'TWO_WHEELER',
    batteryType: 'VRLA (AGM)',
    ah,
    size: [l, w, h],
    kg,
    warranty: {
      totalMonths: 48,
      freeMonths: 24,
      proRataMonths: 24,
      notes: 'Catalogue lists “24+24 months pro-rata”. Confirm the split on the Bosch warranty card.',
    },
    description: `${ah}Ah two wheeler battery from the Bosch M6 range. Bosch part number F 002 H50 ${part.slice(-3)}.`,
    sourceUrl: BOSCH_URL,
    sourceNote: 'From the Bosch India battery catalogue, 2023 edition (C10 capacity; height without poles). Voltage (12 V) is not printed in the table. Confirm the model is still sold and its current warranty.',
  }),
);

export const boschProducts: SeedProduct[] = [...bosch4w, ...bosch2w];
