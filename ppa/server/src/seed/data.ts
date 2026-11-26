/**
 * Seed catalogue.
 *
 * Amaron data below was taken from amaron.com product pages and Amaron's official
 * application chart (https://amaron-prod-images.s3.ap-south-1.amazonaws.com/s3fs-public/Documents/Application-chart.pdf).
 * Where a value could not be confirmed from an Amaron source it is left null
 * instead of guessed — fill it in from /admin. Prices are Amaron's online prices at
 * the time of writing; set your own shop prices in /admin.
 *
 * Exide and Bosch are created as brands with the same product structure but no
 * products, so the owner can add their real models, warranties and images.
 */
import type { VehicleCategory } from '../config/constants.js';

export const brands = [
  {
    name: 'Amaron',
    slug: 'amaron',
    manufacturer: 'Amara Raja Energy & Mobility Ltd',
    website: 'https://www.amaron.com',
    accentColor: '#0A7F3F',
    sortOrder: 1,
    description:
      'Zero-maintenance automotive batteries from Amara Raja, built for Indian roads and heat. Range covers bikes and scooters, cars and SUVs, three-wheelers, commercial vehicles, tractors and home inverters.',
  },
  {
    name: 'Exide',
    slug: 'exide',
    manufacturer: 'Exide Industries Ltd',
    website: 'https://www.exidecare.com',
    accentColor: '#D71920',
    sortOrder: 2,
    description:
      'One of India’s longest-running battery makers, with automotive batteries for two-wheelers, cars, commercial vehicles and tractors, plus inverter batteries.',
  },
  {
    name: 'Bosch',
    slug: 'bosch',
    manufacturer: 'Robert Bosch',
    website: 'https://www.boschaftermarket.com/in/en/',
    accentColor: '#1D3B6F',
    sortOrder: 3,
    description: 'Automotive batteries from Bosch’s aftermarket range, engineered to OEM standards for cars, SUVs and two-wheelers.',
  },
];

const AMARON_FEATURES = [
  'High cranking power',
  'Zero maintenance',
  'Improved safety',
  'Long life',
  'Vibration resistance',
  'High reserve capacity',
  'Heat tolerance',
];

const CHART = 'https://amaron-prod-images.s3.ap-south-1.amazonaws.com/s3fs-public/Documents/Application-chart.pdf';

export interface SeedProduct {
  brand: string;
  name: string;
  series: string;
  model: string;
  sku: string;
  batteryType: string;
  vehicleCategory: VehicleCategory;
  voltage: number;
  capacityAh: number;
  cca?: number | null;
  dimensions?: { lengthMm: number | null; widthMm: number | null; heightMm: number | null };
  terminalLayout?: string;
  warranty: { totalMonths: number; freeMonths: number | null; proRataMonths: number | null; notes?: string };
  description: string;
  features: string[];
  mrp: number | null;
  sellingPrice: number | null;
  sourceUrl: string;
  sourceNote: string;
}

const bike = (model: string, ah: number, extra: Partial<SeedProduct> = {}): SeedProduct => ({
  brand: 'amaron',
  name: `Amaron 2 Wheeler Battery ${model}`,
  series: '',
  model,
  sku: model.replace(/-/g, ''),
  batteryType: 'Maintenance-free (VRLA)',
  vehicleCategory: 'TWO_WHEELER',
  voltage: 12,
  capacityAh: ah,
  dimensions: { lengthMm: null, widthMm: null, heightMm: null },
  warranty: {
    totalMonths: 48,
    freeMonths: 24,
    proRataMonths: 24,
    notes: 'Total warranty includes pro-rata warranty. Refer to the Amaron warranty card for terms. Wrong fitment is not covered.',
  },
  description: `${ah}Ah, 12V zero-maintenance bike and scooter battery from Amaron. Recommended by Amaron for the models listed under vehicle compatibility.`,
  features: AMARON_FEATURES,
  mrp: null,
  sellingPrice: null,
  sourceUrl: CHART,
  sourceNote: 'Capacity and 24+24 month warranty from the Amaron application chart. Add dimensions, item code, price and image in admin.',
  ...extra,
});

export const products: SeedProduct[] = [
  bike('AP-BTZ5L', 4, {
    name: 'Amaron PRO Bike Rider 2 Wheeler Battery APBTZ5L',
    series: 'PRO Bike Rider',
    sku: 'ABR-PR-APBTZ5L',
    dimensions: { lengthMm: 113, widthMm: 70, heightMm: 105 },
    mrp: 1469,
    sellingPrice: 1339,
    description:
      'Compact 4Ah, 12V zero-maintenance battery for scooters and 100–160cc motorcycles with self-start. Amaron recommends it for the Honda Activa 125 (BS6), TVS Jupiter (BS6), Bajaj Pulsar 150 and many more.',
    sourceUrl: 'https://www.amaron.com/product/amaron-pro-bike-rider-2-wheeler-battery-apbtz5l-abr-pr-apbtz5l/140/view',
    sourceNote: 'Specs, warranty and price from amaron.com product page.',
  }),
  bike('AP-BTZ9R', 8, {
    name: 'Amaron PRO Bike Rider 2 Wheeler Battery APBTZ9R',
    series: 'PRO Bike Rider',
    sku: 'ABR-PR-APBTZ9R',
    dimensions: { lengthMm: 150, widthMm: 87, heightMm: 105 },
    mrp: 2255,
    sellingPrice: 2055,
    description:
      'High-capacity 8Ah, 12V battery for 200cc+ and fuel-injected motorcycles. Amaron recommends it for the Royal Enfield Classic 350, Bajaj Dominar, KTM Duke and TVS Apache RTR 4V (BS6).',
    sourceUrl: 'https://www.amaron.com/product/amaron-pro-bike-rider-2-wheeler-battery-apbtz9r-abr-pr-apbtz9r/142/view',
    sourceNote: 'Specs, warranty and price from amaron.com product page.',
  }),
  bike('AP-BTZ4L', 3),
  bike('AP-BTX25', 2.5),
  bike('AP-BTX50', 5),
  bike('AP-BTZ7L', 6),
  bike('AP-BTX7R', 7),
  bike('AP-BTX90', 9),
  {
    brand: 'amaron',
    name: 'Amaron FLO Automotive Battery BH40B20L',
    series: 'FLO',
    model: 'BH40B20L',
    sku: 'AAM-FL-0BH40B20L',
    batteryType: 'Maintenance-free, factory charged',
    vehicleCategory: 'FOUR_WHEELER',
    voltage: 12,
    capacityAh: 40,
    cca: 342,
    dimensions: { lengthMm: 197, widthMm: 139, heightMm: 227 },
    terminalLayout: 'L',
    warranty: {
      totalMonths: 72,
      freeMonths: 36,
      proRataMonths: 36,
      notes: 'Total warranty includes pro-rata warranty. Refer to the Amaron warranty card for terms. Not valid for commercial use.',
    },
    description:
      '40Ah car battery from Amaron’s FLO range for small and mid-size petrol cars. Amaron recommends it for the Hyundai Grand i10, Grand i10 Nios, Xcent, Elite i20, Venue and Aura (petrol), and the Renault Kwid.',
    features: AMARON_FEATURES,
    mrp: 6115,
    sellingPrice: 5751,
    sourceUrl: 'https://www.amaron.com/product/amaron-flo-automotive-battery-bh40b20l-aam-fl-0bh40b20l/108/view',
    sourceNote: 'Warranty and price from amaron.com; dimensions/CCA from Amaron product data.',
  },
  {
    brand: 'amaron',
    name: 'Amaron PRO Automotive Battery 50B20L',
    series: 'PRO',
    model: '50B20L',
    sku: 'AAM-PR-00050B20L',
    batteryType: 'Maintenance-free, factory charged',
    vehicleCategory: 'FOUR_WHEELER',
    voltage: 12,
    capacityAh: 35,
    dimensions: { lengthMm: null, widthMm: null, heightMm: null },
    terminalLayout: 'L',
    warranty: {
      totalMonths: 72,
      freeMonths: null,
      proRataMonths: null,
      notes: 'Total warranty includes pro-rata warranty. Refer to the Amaron warranty card for the free/pro-rata split.',
    },
    description:
      '35Ah battery from Amaron’s top PRO range for compact petrol cars. Amaron recommends it for the Maruti Suzuki Swift, Dzire, Baleno and Wagon R, Honda City and Amaze (petrol), Toyota Etios and more.',
    features: AMARON_FEATURES,
    mrp: 6010,
    sellingPrice: 5652,
    sourceUrl: 'https://www.amaron.com/product/amaron-pro-automotive-battery-50b20l-aam-pr-00050b20l/95/view',
    sourceNote: 'Warranty and price from amaron.com; capacity from the Amaron application chart. Add dimensions in admin.',
  },
  {
    brand: 'amaron',
    name: 'Amaron FLO Automotive Battery 40B20L',
    series: 'FLO',
    model: '40B20L',
    sku: 'AAM-FL-00040B20L',
    batteryType: 'Maintenance-free, factory charged',
    vehicleCategory: 'FOUR_WHEELER',
    voltage: 12,
    capacityAh: 35,
    dimensions: { lengthMm: 197, widthMm: 127, heightMm: 227 },
    terminalLayout: 'L',
    warranty: { totalMonths: 72, freeMonths: 36, proRataMonths: 36, notes: 'Total warranty includes pro-rata warranty.' },
    description: '35Ah car battery from Amaron’s FLO range for compact petrol cars.',
    features: AMARON_FEATURES,
    mrp: null,
    sellingPrice: null,
    sourceUrl: 'https://www.amaron.com/product/amaron-flo-automotive-battery-40b20l-aam-fl-00040b20l/267/view',
    sourceNote: 'Specs from Amaron product data. Add price and vehicle compatibility in admin.',
  },
];

/** [category, make, model, variant, fuel, compatible battery models] */
type Row = [VehicleCategory, string, string, string, string, string[]];
const TW = 'TWO_WHEELER' as const;
const FW = 'FOUR_WHEELER' as const;

export const vehicles: Row[] = [
  // Honda two-wheelers
  [TW, 'Honda', 'Activa', '3G / 4G / 5G / 6G', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Honda', 'Activa', 'Up to 2012', 'Petrol', ['AP-BTX50']],
  [TW, 'Honda', 'Activa i', '', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Honda', 'Activa 125', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Honda', 'Activa 125', 'Up to 2019', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Honda', 'Dio', 'Self start', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Honda', 'Aviator', 'Self start', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Honda', 'Grazia', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Honda', 'Shine', 'Self start', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Honda', 'Shine', 'Kick start', 'Petrol', ['AP-BTX25']],
  [TW, 'Honda', 'Shine SP', '', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Honda', 'Livo', '', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Honda', 'CD 110 Dream', '', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Honda', 'CB Unicorn 160', '', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Honda', 'Unicorn', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Honda', 'CB Hornet 160R', '', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Honda', 'X-Blade', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Honda', 'CB300R', '', 'Petrol', ['AP-BTZ7L']],
  // Hero
  [TW, 'Hero', 'Splendor Plus', 'Self start', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Hero', 'Splendor Plus', 'Kick start', 'Petrol', ['AP-BTX25']],
  [TW, 'Hero', 'Splendor iSmart', '', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Hero', 'Super Splendor', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Hero', 'HF Deluxe', 'Self start', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Hero', 'HF Deluxe', 'Kick start', 'Petrol', ['AP-BTX25']],
  [TW, 'Hero', 'Passion Pro', 'Self start', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Hero', 'Glamour', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Hero', 'Pleasure Plus', '', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Hero', 'Maestro Edge 125', '', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Hero', 'Destini 125', '', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Hero', 'Xtreme', '', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Hero', 'XPulse', '', 'Petrol', ['AP-BTZ7L']],
  // TVS
  [TW, 'TVS', 'Jupiter', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'TVS', 'Jupiter Classic', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'TVS', 'NTORQ 125', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'TVS', 'NTORQ 125', 'BS4', 'Petrol', ['AP-BTX50']],
  [TW, 'TVS', 'Scooty Pep Plus', 'BS6', 'Petrol', ['AP-BTX50']],
  [TW, 'TVS', 'Wego', 'BS4', 'Petrol', ['AP-BTZ5L']],
  [TW, 'TVS', 'XL100 Comfort', 'i-Touch start', 'Petrol', ['AP-BTZ4L']],
  [TW, 'TVS', 'XL100 Heavy Duty', 'i-Touch start', 'Petrol', ['AP-BTZ4L']],
  [TW, 'TVS', 'Radeon', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'TVS', 'Star City Plus', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'TVS', 'Sport', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'TVS', 'Apache RTR 160 4V', 'BS6', 'Petrol', ['AP-BTZ9R']],
  [TW, 'TVS', 'Apache RTR 200 4V', 'BS6', 'Petrol', ['AP-BTZ9R']],
  [TW, 'TVS', 'Apache RR 310', 'BS6', 'Petrol', ['AP-BTZ9R']],
  // Bajaj / KTM
  [TW, 'Bajaj', 'Pulsar 150', 'Self start', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Bajaj', 'Pulsar NS160', '', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Bajaj', 'Pulsar 125 Neon', '', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Bajaj', 'Pulsar NS200', '', 'Petrol', ['AP-BTZ9R']],
  [TW, 'Bajaj', 'Pulsar RS200', '', 'Petrol', ['AP-BTZ9R']],
  [TW, 'Bajaj', 'Pulsar 220F', '', 'Petrol', ['AP-BTZ9R']],
  [TW, 'Bajaj', 'Platina 110 H-Gear', '', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Bajaj', 'Platina 100', 'Kick start', 'Petrol', ['AP-BTX25']],
  [TW, 'Bajaj', 'CT 110', 'Self start', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Bajaj', 'CT 100', 'Kick start', 'Petrol', ['AP-BTX25']],
  [TW, 'Bajaj', 'Avenger 160 Street', '', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Bajaj', 'Avenger 220 Cruise', '', 'Petrol', ['AP-BTZ9R']],
  [TW, 'Bajaj', 'Dominar 250', '', 'Petrol', ['AP-BTZ9R']],
  [TW, 'Bajaj', 'Dominar 400', '', 'Petrol', ['AP-BTZ9R']],
  [TW, 'KTM', '200 Duke', '', 'Petrol', ['AP-BTZ9R']],
  [TW, 'KTM', '390 Duke', '', 'Petrol', ['AP-BTZ9R']],
  // Yamaha
  [TW, 'Yamaha', 'FZ V3', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Yamaha', 'FZS V3', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Yamaha', 'MT-15', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Yamaha', 'YZF-R15 V3', 'BS6', 'Petrol', ['AP-BTZ5L']],
  [TW, 'Yamaha', 'Ray ZR 125 Fi', 'BS6', 'Petrol', ['AP-BTX50']],
  [TW, 'Yamaha', 'Fascino 125 Fi', 'BS6', 'Petrol', ['AP-BTX50']],
  [TW, 'Yamaha', 'FZ 25', 'BS6', 'Petrol', ['AP-BTZ7L']],
  [TW, 'Yamaha', 'YZF-R3', '', 'Petrol', ['AP-BTX7R']],
  // Suzuki
  [TW, 'Suzuki', 'Access 125', 'BS6', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Suzuki', 'Access 125', 'Before BS6', 'Petrol', ['AP-BTX50']],
  [TW, 'Suzuki', 'Burgman Street 125', 'BS6', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Suzuki', 'Gixxer 150', 'BS6', 'Petrol', ['AP-BTZ4L']],
  [TW, 'Suzuki', 'Gixxer 250', 'BS6', 'Petrol', ['AP-BTZ7L']],
  // Royal Enfield / Jawa
  [TW, 'Royal Enfield', 'Classic 350', 'Self start, 2014 onwards', 'Petrol', ['AP-BTZ9R']],
  [TW, 'Royal Enfield', 'Bullet 350', 'Self start, BS6', 'Petrol', ['AP-BTZ9R']],
  [TW, 'Royal Enfield', 'Bullet 350', 'Kick start', 'Petrol', ['AP-BTX50']],
  [TW, 'Royal Enfield', 'Himalayan 410', '', 'Petrol', ['AP-BTZ9R']],
  [TW, 'Royal Enfield', 'Thunderbird 350', 'Self start', 'Petrol', ['AP-BTZ9R']],
  [TW, 'Jawa', 'Jawa', '', 'Petrol', ['AP-BTZ9R']],
  [TW, 'Jawa', 'Forty Two', '', 'Petrol', ['AP-BTZ9R']],
  [TW, 'Jawa', 'Perak', '', 'Petrol', ['AP-BTZ9R']],
  [TW, 'Mahindra', 'Gusto 110', 'HX / DX', 'Petrol', ['AP-BTZ5L']],

  // Cars — BH40B20L (FLO 40Ah)
  [FW, 'Hyundai', 'i10', '', 'Petrol', ['BH40B20L']],
  [FW, 'Hyundai', 'Grand i10', '2013–2019', 'Petrol', ['BH40B20L']],
  [FW, 'Hyundai', 'Grand i10 Nios', '2019 onwards', 'Petrol', ['BH40B20L']],
  [FW, 'Hyundai', 'Xcent', '', 'Petrol', ['BH40B20L']],
  [FW, 'Hyundai', 'Elite i20', '2015 onwards', 'Petrol', ['BH40B20L']],
  [FW, 'Hyundai', 'Verna', '2017 onwards', 'Petrol', ['BH40B20L']],
  [FW, 'Hyundai', 'Santro', '2018 onwards', 'Petrol / CNG', ['BH40B20L']],
  [FW, 'Hyundai', 'Aura', '2020 onwards', 'Petrol', ['BH40B20L']],
  [FW, 'Hyundai', 'Venue', '2019 onwards', 'Petrol', ['BH40B20L']],
  [FW, 'Hyundai', 'i20 Active', '2015–2020', 'Diesel', ['BH40B20L']],
  [FW, 'Renault', 'Kwid', '', 'Petrol', ['BH40B20L']],
  [FW, 'Datsun', 'redi-GO', '', 'Petrol', ['BH40B20L']],
  // Cars — 50B20L (PRO 35Ah)
  [FW, 'Maruti Suzuki', 'Swift', '2013 onwards', 'Petrol', ['50B20L']],
  [FW, 'Maruti Suzuki', 'Dzire', '2013 onwards', 'Petrol', ['50B20L']],
  [FW, 'Maruti Suzuki', 'Baleno', '2015 onwards', 'Petrol', ['50B20L']],
  [FW, 'Maruti Suzuki', 'Wagon R', '', 'Petrol / CNG', ['50B20L']],
  [FW, 'Maruti Suzuki', 'Alto 800', '', 'Petrol / CNG', ['50B20L']],
  [FW, 'Maruti Suzuki', 'Celerio', '', 'Petrol / CNG', ['50B20L']],
  [FW, 'Maruti Suzuki', 'Ignis', '', 'Petrol', ['50B20L']],
  [FW, 'Maruti Suzuki', 'S-Presso', '', 'Petrol', ['50B20L']],
  [FW, 'Maruti Suzuki', 'Eeco', '', 'Petrol', ['50B20L']],
  [FW, 'Maruti Suzuki', 'Ciaz', '', 'Petrol', ['50B20L']],
  [FW, 'Maruti Suzuki', 'Ertiga', '', 'Petrol', ['50B20L']],
  [FW, 'Maruti Suzuki', 'Vitara Brezza', '2020 onwards', 'Petrol', ['50B20L']],
  [FW, 'Maruti Suzuki', 'S-Cross', '', 'Petrol', ['50B20L']],
  [FW, 'Honda', 'City', '', 'Petrol', ['50B20L']],
  [FW, 'Honda', 'Amaze', '', 'Petrol', ['50B20L']],
  [FW, 'Honda', 'Jazz', '', 'Petrol', ['50B20L']],
  [FW, 'Honda', 'Brio', '', 'Petrol', ['50B20L']],
  [FW, 'Honda', 'WR-V', '', 'Petrol', ['50B20L']],
  [FW, 'Toyota', 'Etios', '', 'Petrol', ['50B20L']],
  [FW, 'Toyota', 'Etios Liva', '', 'Petrol', ['50B20L']],
  [FW, 'Toyota', 'Glanza', '', 'Petrol', ['50B20L']],
  [FW, 'Toyota', 'Innova Crysta', '2016 onwards', 'Petrol', ['50B20L']],
  [FW, 'Nissan', 'Micra', '1.2L', 'Petrol', ['50B20L']],
  [FW, 'Nissan', 'Sunny', '1.2L', 'Petrol', ['50B20L']],
  [FW, 'Renault', 'Triber', 'RXE / RXL / RXT', 'Petrol', ['50B20L']],
  // Vehicles listed so customers can find them; link Exide/Bosch/other Amaron models in admin.
  [FW, 'Maruti Suzuki', 'Swift', '2015 onwards', 'Diesel', []],
  [FW, 'Hyundai', 'Creta', '2020 onwards', 'Petrol', []],
  [FW, 'Hyundai', 'Creta', '2020 onwards', 'Diesel', []],
  [FW, 'Kia', 'Seltos', '2019 onwards', 'Petrol', []],
  [FW, 'Kia', 'Sonet', '', 'Petrol', []],
  [FW, 'Tata', 'Nexon', '2018 onwards', 'Diesel', []],
  [FW, 'Tata', 'Tiago', '2018 onwards', 'Petrol', []],
  [FW, 'Mahindra', 'Bolero', '', 'Diesel', []],
  [FW, 'Mahindra', 'Scorpio', '', 'Diesel', []],
  [FW, 'Mahindra', 'XUV500', '', 'Diesel', []],
  [FW, 'Toyota', 'Fortuner', '', 'Diesel', []],
  ['THREE_WHEELER', 'Bajaj', 'RE', '4S', 'Petrol / CNG / LPG', []],
  ['THREE_WHEELER', 'Piaggio', 'Ape City', '', 'CNG / LPG', []],
  ['COMMERCIAL', 'Tata', 'Ace', '', 'Diesel', []],
  ['COMMERCIAL', 'Ashok Leyland', 'Dost', '', 'Diesel', []],
  ['COMMERCIAL', 'Mahindra', 'Bolero Pik-Up', '', 'Diesel', []],
  ['TRACTOR', 'Mahindra', 'Yuvo', '35–45 HP', 'Diesel', []],
  ['TRACTOR', 'Sonalika', 'DI 745 III', '', 'Diesel', []],
  ['TRACTOR', 'John Deere', '5310', '55 HP', 'Diesel', []],
];
